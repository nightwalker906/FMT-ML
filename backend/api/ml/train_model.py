from __future__ import annotations

import logging
import os
import sys
import tempfile
from pathlib import Path
from typing import Iterable

import django
import joblib
import numpy as np
from django.apps import apps
from sklearn.feature_extraction.text import TfidfVectorizer


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

DJANGO_SETTINGS_MODULE = "fmt_project.settings"
MODELS_DIR = BACKEND_DIR / "saved_models"
VECTORIZER_PATH = MODELS_DIR / "tfidf_vectorizer.pkl"
MATRIX_PATH = MODELS_DIR / "tfidf_matrix.pkl"
TUTOR_IDS_PATH = MODELS_DIR / "tutor_ids.pkl"

logger = logging.getLogger(__name__)


def ensure_django() -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", DJANGO_SETTINGS_MODULE)
    if not apps.ready:
        django.setup()


def _normalize_text(value: object) -> str:
    if value is None:
        return ""

    if isinstance(value, str):
        return " ".join(value.split())

    if isinstance(value, dict):
        parts = []
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


def _build_combined_text(*parts: object) -> str:
    normalized_parts = [_normalize_text(part) for part in parts]
    combined_text = " ".join(part for part in normalized_parts if part).strip()
    return combined_text or "tutor"


def fetch_tutor_corpus() -> tuple[list[str], list[str]]:
    ensure_django()

    from core.models import Tutor

    tutor_rows = Tutor.objects.values(
        "profile_id",
        "bio_text",
        "teaching_style",
        "qualifications",
    )

    tutor_ids: list[str] = []
    corpus: list[str] = []

    for tutor in tutor_rows.iterator():
        tutor_ids.append(str(tutor["profile_id"]))
        corpus.append(
            _build_combined_text(
                tutor.get("bio_text"),
                tutor.get("teaching_style"),
                tutor.get("qualifications"),
            )
        )

    return tutor_ids, corpus


def _atomic_joblib_dump(value: object, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    file_descriptor, temp_name = tempfile.mkstemp(
        dir=destination.parent,
        prefix=f".{destination.stem}-",
        suffix=destination.suffix,
    )
    os.close(file_descriptor)
    temp_path = Path(temp_name)

    try:
        joblib.dump(value, temp_path, compress=3)
        os.replace(temp_path, destination)
    finally:
        if temp_path.exists():
            temp_path.unlink(missing_ok=True)


def save_artifacts(
    vectorizer: TfidfVectorizer,
    tfidf_matrix: object,
    tutor_ids: Iterable[str],
) -> None:
    tutor_id_list = list(tutor_ids)

    _atomic_joblib_dump(vectorizer, VECTORIZER_PATH)
    _atomic_joblib_dump(tfidf_matrix, MATRIX_PATH)
    _atomic_joblib_dump(tutor_id_list, TUTOR_IDS_PATH)


def train_recommender_model() -> bool:
    tutor_ids, corpus = fetch_tutor_corpus()

    if not tutor_ids:
        logger.warning("[Training] No Tutor records found; skipping artifact refresh.")
        return False

    logger.info("[Training] Starting TF-IDF training for %s tutors.", len(tutor_ids))

    vectorizer = TfidfVectorizer(
        stop_words="english",
        max_features=5000,
        sublinear_tf=True,
        dtype=np.float32,
    )
    tfidf_matrix = vectorizer.fit_transform(corpus)

    save_artifacts(vectorizer, tfidf_matrix, tutor_ids)

    logger.info(
        "[Training] Saved TF-IDF artifacts to %s (%s features).",
        MODELS_DIR,
        len(vectorizer.get_feature_names_out()),
    )
    return True


def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    success = train_recommender_model()
    return 0 if success else 1


if __name__ == "__main__":
    raise SystemExit(main())
