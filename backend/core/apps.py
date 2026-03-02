import logging
from django.apps import AppConfig

logger = logging.getLogger(__name__)


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        """
        Initialize the ML recommendation engine on app startup.
        The api.ml.recommender uses a Singleton pattern that automatically
        warms up on first import, so no explicit warm-up needed here.
        """
        import threading
        import logging

        def _warmup():
            try:
                # Import the recommender singleton - this triggers initialization
                from api.ml.recommender import _recommender
                if _recommender.is_loaded:
                    logger.info("[Startup] ✅ ML Recommender singleton initialized")
                else:
                    logger.warning(f"[Startup] ⚠️ ML Recommender not ready: {_recommender.error_message}")
            except Exception as e:
                logger.warning(f"[Startup] ML Recommender initialization attempted: {e}")

        # Run in a background thread so startup isn't blocked
        thread = threading.Thread(target=_warmup, daemon=True)
        thread.start()
