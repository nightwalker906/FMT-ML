import logging
import threading

from django.apps import AppConfig


logger = logging.getLogger(__name__)


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"

    def ready(self) -> None:
        """
        Register app signals and warm up the recommender in the background.
        """
        from . import signals  # noqa: F401

        def _warmup() -> None:
            try:
                from api.ml.recommender import _recommender

                if _recommender.is_loaded:
                    logger.info("[Startup] ML Recommender singleton initialized.")
                else:
                    logger.warning(
                        "[Startup] ML Recommender not ready: %s",
                        _recommender.error_message,
                    )
            except Exception as exc:
                logger.warning("[Startup] ML Recommender initialization attempted: %s", exc)

        thread = threading.Thread(target=_warmup, name="recommender-warmup", daemon=True)
        thread.start()
