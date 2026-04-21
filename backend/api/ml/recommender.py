from __future__ import annotations

import json
import logging
import os
import re
import traceback
from functools import lru_cache
from pathlib import Path
from threading import RLock
from typing import Any

import django
import joblib
import numpy as np
from django.apps import apps


if not apps.ready:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "fmt_project.settings")
    django.setup()

from core.models import Student, Tutor


logger = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).resolve().parents[2] / "saved_models"
VECTORIZER_PATH = MODELS_DIR / "tfidf_vectorizer.pkl"
MATRIX_PATH = MODELS_DIR / "tfidf_matrix.pkl"
TUTOR_IDS_PATH = MODELS_DIR / "tutor_ids.pkl"

SIMILARITY_WEIGHT = 0.30
RATING_WEIGHT = 0.40
PRICE_WEIGHT = 0.30
QUALIFICATION_BONUS_WEIGHT = 0.25
TOKEN_PATTERN = re.compile(r"[a-z0-9]+")


def _normalize_text(value: object) -> str:
    if value is None:
        return ""

    if isinstance(value, str):
        return " ".join(value.split())

    if isinstance(value, dict):
        parts: list[str] = []
        for key, nested_value in value.items():
            key_text = _normalize_text(key)
            value_text = _normalize_text(nested_value)
            if key_text:
                parts.append(key_text)
            if value_text:
                parts.append(value_text)
        return " ".join(parts)

    if isinstance(value, (list, tuple, set)):
        parts = [_normalize_text(item) for item in value]
        return " ".join(part for part in parts if part)

    return str(value).strip()


def _normalize_query(value: object) -> str:
    return _normalize_text(value).lower()


def _parse_string_list(value: object) -> tuple[str, ...]:
    parsed_value = value
    if isinstance(parsed_value, str):
        try:
            parsed_value = json.loads(parsed_value)
        except json.JSONDecodeError:
            parsed_value = [parsed_value]

    if isinstance(parsed_value, (list, tuple, set)):
        normalized = []
        for item in parsed_value:
            item_text = _normalize_query(item)
            if item_text:
                normalized.append(item_text)
        return tuple(normalized)

    single_value = _normalize_query(parsed_value)
    return (single_value,) if single_value else ()


def _tokenize_text(value: object) -> frozenset[str]:
    return frozenset(TOKEN_PATTERN.findall(_normalize_query(value)))


def _clear_runtime_caches() -> None:
    similarity_cache = globals().get("_cached_similarity_scores")
    ranking_cache = globals().get("_cached_rankings")

    if similarity_cache is not None:
        similarity_cache.cache_clear()

    if ranking_cache is not None:
        ranking_cache.cache_clear()


@lru_cache(maxsize=2048)
def _cached_student_query(student_id: str) -> str:
    student_row = (
        Student.objects.filter(profile_id=student_id)
        .values(
            "learning_goals",
            "preferred_subjects",
            "grade_level",
            "learning_style",
        )
        .first()
    )

    if not student_row:
        logger.warning("Student not found for recommender query: %s", student_id)
        return ""

    return _normalize_query(
        [
            student_row.get("learning_goals"),
            student_row.get("preferred_subjects"),
            student_row.get("grade_level"),
            student_row.get("learning_style"),
        ]
    )


def invalidate_student_query_cache(student_id: str | None = None) -> None:
    _cached_student_query.cache_clear()
    if student_id:
        logger.info("[Recommender] Cleared cached student query for %s.", student_id)


class RecommenderSingleton:
    _instance: RecommenderSingleton | None = None

    def __init__(self) -> None:
        self._lock = RLock()
        self.vectorizer = None
        self.tfidf_matrix = None
        self.tutor_ids: list[str] = []
        self.tutor_data: dict[str, dict[str, Any]] = {}
        self.rating_scores = np.array([], dtype=np.float32)
        self.price_fit_scores = np.array([], dtype=np.float32)
        self.base_scores = np.array([], dtype=np.float32)
        self.qualification_lists: tuple[tuple[str, ...], ...] = ()
        self.qualification_token_sets: tuple[frozenset[str], ...] = ()
        self.model_version = 0
        self.is_loaded = False
        self.error_message: str | None = None

        self.reload_artifacts()

    @classmethod
    def get_instance(cls) -> RecommenderSingleton:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def reload_artifacts(self) -> bool:
        logger.info("[Recommender] Loading recommendation artifacts from disk...")

        try:
            if not all(
                path.exists()
                for path in (VECTORIZER_PATH, MATRIX_PATH, TUTOR_IDS_PATH)
            ):
                self._mark_unavailable("Model files not found. Run train_model.py first.")
                return False

            vectorizer = joblib.load(VECTORIZER_PATH)
            tfidf_matrix = joblib.load(MATRIX_PATH)
            tutor_ids = [str(tutor_id) for tutor_id in joblib.load(TUTOR_IDS_PATH)]
            tutor_data = self._fetch_tutor_data()
            runtime_cache = self._build_runtime_cache(tutor_ids, tutor_data)

            with self._lock:
                self.vectorizer = vectorizer
                self.tfidf_matrix = tfidf_matrix
                self.tutor_ids = tutor_ids
                self.tutor_data = tutor_data
                self.rating_scores = runtime_cache["rating_scores"]
                self.price_fit_scores = runtime_cache["price_fit_scores"]
                self.base_scores = runtime_cache["base_scores"]
                self.qualification_lists = runtime_cache["qualification_lists"]
                self.qualification_token_sets = runtime_cache["qualification_token_sets"]
                self.model_version += 1
                self.is_loaded = True
                self.error_message = None

            _clear_runtime_caches()
            logger.info(
                "[Recommender] Ready with %s tutors and %s features.",
                len(tutor_ids),
                getattr(tfidf_matrix, "shape", (0, 0))[1],
            )
            return True
        except Exception as exc:
            self._mark_unavailable(str(exc))
            logger.error("[Recommender] Failed to load artifacts: %s", exc)
            traceback.print_exc()
            return False

    def refresh_metadata(self) -> bool:
        logger.info("[Recommender] Refreshing in-memory tutor metadata.")

        try:
            tutor_data = self._fetch_tutor_data()
            with self._lock:
                tutor_ids = list(self.tutor_ids)

            if not tutor_ids:
                logger.warning("[Recommender] Metadata refresh skipped; artifacts are not loaded.")
                return False

            if set(tutor_data.keys()) != set(tutor_ids):
                logger.warning(
                    "[Recommender] Tutor set changed; full retraining is required instead of metadata refresh."
                )
                return False

            runtime_cache = self._build_runtime_cache(tutor_ids, tutor_data)

            with self._lock:
                self.tutor_data = tutor_data
                self.rating_scores = runtime_cache["rating_scores"]
                self.price_fit_scores = runtime_cache["price_fit_scores"]
                self.base_scores = runtime_cache["base_scores"]
                self.qualification_lists = runtime_cache["qualification_lists"]
                self.qualification_token_sets = runtime_cache["qualification_token_sets"]
                self.model_version += 1
                self.is_loaded = True
                self.error_message = None

            _clear_runtime_caches()
            logger.info("[Recommender] Metadata refresh complete.")
            return True
        except Exception as exc:
            logger.error("[Recommender] Metadata refresh failed: %s", exc)
            traceback.print_exc()
            return False

    def _mark_unavailable(self, message: str) -> None:
        with self._lock:
            self.is_loaded = False
            self.error_message = message

    def _fetch_tutor_data(self) -> dict[str, dict[str, Any]]:
        tutor_rows = Tutor.objects.values(
            "profile_id",
            "hourly_rate",
            "average_rating",
            "bio_text",
            "qualifications",
            "profile__first_name",
            "profile__last_name",
            "profile__avatar",
            "profile__is_online",
        )

        tutor_data: dict[str, dict[str, Any]] = {}
        for row in tutor_rows:
            tutor_id = str(row["profile_id"])
            qualifications = _parse_string_list(row.get("qualifications"))
            tutor_data[tutor_id] = {
                "first_name": row.get("profile__first_name") or "",
                "last_name": row.get("profile__last_name") or "",
                "avatar": row.get("profile__avatar"),
                "is_online": bool(row.get("profile__is_online", False)),
                "hourly_rate": float(row.get("hourly_rate") or 0.0),
                "average_rating": float(row.get("average_rating") or 0.0),
                "bio_text": row.get("bio_text") or "",
                "qualifications": qualifications,
            }

        return tutor_data

    def _build_runtime_cache(
        self,
        tutor_ids: list[str],
        tutor_data: dict[str, dict[str, Any]],
    ) -> dict[str, Any]:
        tutor_count = len(tutor_ids)
        rating_scores = np.zeros(tutor_count, dtype=np.float32)
        price_fit_scores = np.zeros(tutor_count, dtype=np.float32)
        qualification_lists: list[tuple[str, ...]] = []
        qualification_token_sets: list[frozenset[str]] = []

        for index, tutor_id in enumerate(tutor_ids):
            tutor_info = tutor_data.get(tutor_id, {})
            rating = float(tutor_info.get("average_rating", 0.0))
            hourly_rate = float(tutor_info.get("hourly_rate", 0.0))
            qualifications = tuple(tutor_info.get("qualifications", ()))

            rating_scores[index] = (rating / 5.0) * 100.0
            price_fit_scores[index] = max(0.0, 1.0 - (hourly_rate / 100.0)) * 100.0
            qualification_lists.append(qualifications)
            qualification_token_sets.append(_tokenize_text(qualifications))

        base_scores = (
            (rating_scores * RATING_WEIGHT)
            + (price_fit_scores * PRICE_WEIGHT)
        ).astype(np.float32, copy=False)

        return {
            "rating_scores": rating_scores,
            "price_fit_scores": price_fit_scores,
            "base_scores": base_scores,
            "qualification_lists": tuple(qualification_lists),
            "qualification_token_sets": tuple(qualification_token_sets),
        }


_recommender = RecommenderSingleton.get_instance()


def fetch_student_learning_goals(student_id: str) -> str:
    return _cached_student_query(student_id)


def calculate_similarity_scores(query: str) -> np.ndarray:
    with _recommender._lock:
        model_version = _recommender.model_version

    if not query.strip():
        return np.zeros(len(_recommender.tutor_ids), dtype=np.float32)

    cached_scores = _cached_similarity_scores(model_version, query)
    return np.asarray(cached_scores, dtype=np.float32)


@lru_cache(maxsize=1024)
def _cached_similarity_scores(model_version: int, query: str) -> tuple[float, ...]:
    del model_version

    normalized_query = _normalize_query(query)
    with _recommender._lock:
        vectorizer = _recommender.vectorizer
        tfidf_matrix = _recommender.tfidf_matrix
        tutor_count = len(_recommender.tutor_ids)

    if not normalized_query or vectorizer is None or tfidf_matrix is None:
        return tuple(0.0 for _ in range(tutor_count))

    query_vector = vectorizer.transform([normalized_query])
    similarities = (query_vector @ tfidf_matrix.T).toarray().ravel().astype(np.float32, copy=False)
    return tuple(float(score) for score in similarities)


def _calculate_qualification_boosts(query: str) -> np.ndarray:
    goal_tokens = _tokenize_text(query)
    if not goal_tokens:
        return np.zeros(len(_recommender.tutor_ids), dtype=np.float32)

    normalized_query = _normalize_query(query)
    with _recommender._lock:
        qualification_lists = _recommender.qualification_lists
        qualification_token_sets = _recommender.qualification_token_sets

    boosts = np.zeros(len(qualification_lists), dtype=np.float32)
    for index, (subjects, subject_tokens) in enumerate(
        zip(qualification_lists, qualification_token_sets, strict=False)
    ):
        if not subjects:
            continue

        direct_matches = sum(1 for subject in subjects if subject in normalized_query)
        if direct_matches:
            boosts[index] = min(direct_matches / max(len(subjects), 1), 1.0) * 100.0
            continue

        if not subject_tokens:
            continue

        token_matches = len(goal_tokens.intersection(subject_tokens))
        if token_matches:
            boosts[index] = min(token_matches / len(subject_tokens), 1.0) * 100.0

    return boosts


@lru_cache(maxsize=1024)
def _cached_rankings(
    model_version: int,
    query: str,
    top_n: int,
) -> tuple[tuple[int, ...], tuple[float, ...], tuple[float, ...]]:
    similarity_scores = np.asarray(
        _cached_similarity_scores(model_version, query),
        dtype=np.float32,
    )

    with _recommender._lock:
        base_scores = _recommender.base_scores.copy()

    if similarity_scores.size == 0:
        return (), (), ()

    hybrid_scores = (
        base_scores
        + (similarity_scores * 100.0 * SIMILARITY_WEIGHT)
        + (_calculate_qualification_boosts(query) * QUALIFICATION_BONUS_WEIGHT)
    )
    hybrid_scores = np.clip(hybrid_scores, 0, 100)

    limit = max(0, min(top_n, hybrid_scores.size))
    if limit == 0:
        return (), (), ()

    candidate_indices = np.argpartition(hybrid_scores, -limit)[-limit:]
    top_indices = candidate_indices[np.argsort(hybrid_scores[candidate_indices])[::-1]]

    return (
        tuple(int(index) for index in top_indices),
        tuple(float(similarity_scores[index]) for index in top_indices),
        tuple(float(hybrid_scores[index]) for index in top_indices),
    )


def get_recommendations(
    student_id: str | None = None,
    custom_query: str | None = None,
    top_n: int = 10,
) -> list[dict[str, Any]]:
    if not _recommender.is_loaded:
        error_message = _recommender.error_message or "Recommender not initialized"
        logger.error("[Recommender] Cannot provide recommendations: %s", error_message)
        return []

    if student_id:
        query = fetch_student_learning_goals(student_id)
    elif custom_query:
        query = custom_query
    else:
        logger.error("[Recommender] Either student_id or custom_query must be provided.")
        return []

    normalized_query = _normalize_query(query)
    if not normalized_query:
        logger.warning("[Recommender] No search query available.")
        return []

    try:
        with _recommender._lock:
            model_version = _recommender.model_version
            tutor_ids = list(_recommender.tutor_ids)
            tutor_data = dict(_recommender.tutor_data)
            rating_scores = _recommender.rating_scores.copy()
            price_fit_scores = _recommender.price_fit_scores.copy()

        top_indices, top_similarity_scores, top_hybrid_scores = _cached_rankings(
            model_version,
            normalized_query,
            top_n,
        )

        recommendations: list[dict[str, Any]] = []
        for rank, (index, similarity_score, hybrid_score) in enumerate(
            zip(top_indices, top_similarity_scores, top_hybrid_scores, strict=False),
            start=1,
        ):
            tutor_id = tutor_ids[index]
            tutor_info = tutor_data.get(tutor_id)
            if not tutor_info:
                continue

            qualifications = list(tutor_info.get("qualifications", ()))
            bio_summary = tutor_info.get("bio_text", "")[:200].strip()
            match_reasons: list[str] = []

            if qualifications:
                match_reasons.append(f"Expertise: {', '.join(qualifications[:3])}")
            if bio_summary:
                match_reasons.append(f"Bio: {bio_summary}")
            if rating_scores[index] > 80:
                match_reasons.append(f"Rating: {tutor_info['average_rating']:.1f}/5.0")
            if price_fit_scores[index] > 50:
                match_reasons.append(f"Price: ${tutor_info['hourly_rate']:.0f}/hr")

            recommendations.append(
                {
                    "rank": rank,
                    "id": tutor_id,
                    "tutor_id": tutor_id,
                    "first_name": tutor_info["first_name"],
                    "last_name": tutor_info["last_name"],
                    "full_name": f"{tutor_info['first_name']} {tutor_info['last_name']}".strip(),
                    "avatar": tutor_info["avatar"],
                    "is_online": tutor_info.get("is_online", False),
                    "subjects": qualifications,
                    "hourly_rate": tutor_info["hourly_rate"],
                    "average_rating": tutor_info["average_rating"],
                    "match_percentage": hybrid_score,
                    "similarity_score": float(np.clip(similarity_score, 0, 1)),
                    "match_reasons": match_reasons or ["Recommended match"],
                    "score_breakdown": {
                        "similarity": float(similarity_score * 100.0),
                        "rating": float(rating_scores[index]),
                        "price_fit": float(price_fit_scores[index]),
                    },
                }
            )

        logger.info("[Recommender] Generated %s recommendations.", len(recommendations))
        return recommendations
    except Exception as exc:
        logger.error("[Recommender] Error generating recommendations: %s", exc)
        traceback.print_exc()
        return []


if __name__ == "__main__":
    logger.info("Testing recommender...")
    results = get_recommendations(custom_query="python machine learning data science")
    for recommendation in results[:5]:
        logger.info(
            "%s: %.1f%%",
            recommendation["full_name"],
            recommendation["match_percentage"],
        )
