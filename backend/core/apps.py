import logging
from django.apps import AppConfig

logger = logging.getLogger(__name__)


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        """
        Pre-warm the recommendation engine when the server starts.
        This runs the expensive TF-IDF fitting once at boot so the
        first user request is instant instead of waiting 2-5 seconds.
        """
        import threading

        def _warmup():
            try:
                from core.recommender import warmup_recommender
                warmup_recommender()
            except Exception as e:
                logger.warning(f"[Startup] Recommender warm-up skipped: {e}")

        # Run in a background thread so it doesn't block server startup
        thread = threading.Thread(target=_warmup, daemon=True)
        thread.start()
