from __future__ import annotations

import json
import logging
import threading
from decimal import Decimal

from django.db import transaction
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from .models import Profile, Student, Tutor


logger = logging.getLogger(__name__)

_refresh_state_lock = threading.Lock()
_refresh_in_progress = False
_pending_full_retrain = False
_pending_metadata_refresh = False

TUTOR_CORPUS_FIELDS = frozenset({"bio_text", "teaching_style", "qualifications"})
TUTOR_METADATA_FIELDS = frozenset({"hourly_rate", "average_rating"})
PROFILE_METADATA_FIELDS = frozenset({"first_name", "last_name", "avatar", "is_online"})


def _normalize_signal_value(value: object) -> object:
    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, (list, tuple, dict)):
        return json.dumps(value, sort_keys=True, ensure_ascii=True)

    return value


def _schedule_refresh_worker_start() -> None:
    thread = threading.Thread(
        target=_run_recommender_refresh_worker,
        name="recommender-refresh",
        daemon=True,
    )
    thread.start()


def schedule_recommender_refresh(
    action: str,
    trigger: str,
    *,
    using: str | None = None,
) -> None:
    if action not in {"full", "metadata"}:
        raise ValueError(f"Unsupported recommender refresh action: {action}")

    def _enqueue() -> None:
        global _refresh_in_progress, _pending_full_retrain, _pending_metadata_refresh

        start_worker = False
        with _refresh_state_lock:
            if action == "full":
                _pending_full_retrain = True
                _pending_metadata_refresh = False
            else:
                _pending_metadata_refresh = True

            if not _refresh_in_progress:
                _refresh_in_progress = True
                start_worker = True

        if start_worker:
            logger.info("[RecommenderSync] Scheduled %s refresh for %s.", action, trigger)
            _schedule_refresh_worker_start()
            return

        logger.info("[RecommenderSync] Queued %s refresh for %s.", action, trigger)

    transaction.on_commit(_enqueue, using=using)


def _run_recommender_refresh_worker() -> None:
    global _refresh_in_progress, _pending_full_retrain, _pending_metadata_refresh

    while True:
        with _refresh_state_lock:
            run_full_retrain = _pending_full_retrain
            run_metadata_refresh = _pending_metadata_refresh and not run_full_retrain
            _pending_full_retrain = False
            _pending_metadata_refresh = False

        try:
            from api.ml.recommender import _recommender

            if run_full_retrain:
                from api.ml.train_model import train_recommender_model

                logger.info("[RecommenderSync] Starting background full retrain.")
                if train_recommender_model() and _recommender.reload_artifacts():
                    logger.info("[RecommenderSync] Full retrain complete.")
                else:
                    logger.warning("[RecommenderSync] Full retrain did not complete cleanly.")
            elif run_metadata_refresh:
                logger.info("[RecommenderSync] Starting background metadata refresh.")
                if _recommender.refresh_metadata():
                    logger.info("[RecommenderSync] Metadata refresh complete.")
                else:
                    logger.warning(
                        "[RecommenderSync] Metadata refresh could not be applied; escalating to full retrain."
                    )
                    with _refresh_state_lock:
                        _pending_full_retrain = True
        except Exception:
            logger.exception("[RecommenderSync] Background refresh failed.")

        with _refresh_state_lock:
            if not _pending_full_retrain and not _pending_metadata_refresh:
                _refresh_in_progress = False
                return

        logger.info("[RecommenderSync] Additional changes detected; starting another cycle.")


def _set_tutor_refresh_action(instance: Tutor, action: str) -> None:
    setattr(instance, "_recommender_refresh_action", action)


def _set_profile_refresh_action(instance: Profile, action: str) -> None:
    setattr(instance, "_recommender_refresh_action", action)


@receiver(
    pre_save,
    sender=Tutor,
    dispatch_uid="core.capture_tutor_recommender_refresh_action",
)
def capture_tutor_recommender_refresh_action(
    sender,
    instance: Tutor,
    raw: bool = False,
    **kwargs,
) -> None:
    if raw:
        return

    if not instance.pk:
        _set_tutor_refresh_action(instance, "full")
        return

    previous = (
        Tutor.objects.filter(profile_id=instance.profile_id)
        .values(*sorted(TUTOR_CORPUS_FIELDS | TUTOR_METADATA_FIELDS))
        .first()
    )
    if not previous:
        _set_tutor_refresh_action(instance, "full")
        return

    for field in TUTOR_CORPUS_FIELDS:
        if _normalize_signal_value(previous.get(field)) != _normalize_signal_value(getattr(instance, field)):
            _set_tutor_refresh_action(instance, "full")
            return

    for field in TUTOR_METADATA_FIELDS:
        if _normalize_signal_value(previous.get(field)) != _normalize_signal_value(getattr(instance, field)):
            _set_tutor_refresh_action(instance, "metadata")
            return

    _set_tutor_refresh_action(instance, "none")


@receiver(
    post_save,
    sender=Tutor,
    dispatch_uid="core.refresh_recommender_after_tutor_save",
)
def refresh_recommender_after_tutor_save(
    sender,
    instance: Tutor,
    created: bool = False,
    raw: bool = False,
    using: str | None = None,
    **kwargs,
) -> None:
    if raw:
        return

    action = "full" if created else getattr(instance, "_recommender_refresh_action", "full")
    if action == "none":
        return

    schedule_recommender_refresh(action, f"Tutor<{instance.profile_id}>", using=using)


@receiver(
    post_delete,
    sender=Tutor,
    dispatch_uid="core.refresh_recommender_after_tutor_delete",
)
def refresh_recommender_after_tutor_delete(
    sender,
    instance: Tutor,
    using: str | None = None,
    **kwargs,
) -> None:
    schedule_recommender_refresh("full", f"Tutor<{instance.profile_id}> deleted", using=using)


@receiver(
    pre_save,
    sender=Profile,
    dispatch_uid="core.capture_profile_recommender_refresh_action",
)
def capture_profile_recommender_refresh_action(
    sender,
    instance: Profile,
    raw: bool = False,
    **kwargs,
) -> None:
    if raw:
        return

    if not instance.pk:
        _set_profile_refresh_action(instance, "none")
        return

    previous = (
        Profile.objects.filter(id=instance.pk)
        .values("user_type", *sorted(PROFILE_METADATA_FIELDS))
        .first()
    )
    if not previous:
        _set_profile_refresh_action(instance, "none")
        return

    if previous.get("user_type") != "tutor" and instance.user_type != "tutor":
        _set_profile_refresh_action(instance, "none")
        return

    for field in PROFILE_METADATA_FIELDS:
        if _normalize_signal_value(previous.get(field)) != _normalize_signal_value(getattr(instance, field)):
            _set_profile_refresh_action(instance, "metadata")
            return

    _set_profile_refresh_action(instance, "none")


@receiver(
    post_save,
    sender=Profile,
    dispatch_uid="core.refresh_recommender_after_profile_save",
)
def refresh_recommender_after_profile_save(
    sender,
    instance: Profile,
    raw: bool = False,
    using: str | None = None,
    **kwargs,
) -> None:
    if raw or instance.user_type != "tutor":
        return

    if not Tutor.objects.filter(profile_id=instance.id).exists():
        return

    action = getattr(instance, "_recommender_refresh_action", "none")
    if action == "metadata":
        schedule_recommender_refresh("metadata", f"Profile<{instance.id}>", using=using)


@receiver(
    post_save,
    sender=Student,
    dispatch_uid="core.clear_student_recommender_cache_after_student_save",
)
def clear_student_recommender_cache_after_student_save(
    sender,
    instance: Student,
    raw: bool = False,
    **kwargs,
) -> None:
    if raw:
        return

    from api.ml.recommender import invalidate_student_query_cache

    invalidate_student_query_cache(str(instance.profile_id))
    logger.info(
        "[RecommenderSync] Student<%s> changed; cleared student query cache without retraining.",
        instance.profile_id,
    )


@receiver(
    post_delete,
    sender=Student,
    dispatch_uid="core.clear_student_recommender_cache_after_student_delete",
)
def clear_student_recommender_cache_after_student_delete(
    sender,
    instance: Student,
    **kwargs,
) -> None:
    from api.ml.recommender import invalidate_student_query_cache

    invalidate_student_query_cache(str(instance.profile_id))
