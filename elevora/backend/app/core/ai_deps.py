from functools import lru_cache

from app.config import get_settings
from app.core.logging import get_logger
from app.services.ai_client import AIClient, OpenAIClient

logger = get_logger(__name__)


@lru_cache
def get_ai_client() -> AIClient:
    """The process-wide AI client.

    Selection rule (see ``Settings.ai_demo_mode`` for the full contract):

    * No ``OPENROUTER_API_KEY`` and demo mode enabled (default outside
      production) → the offline :class:`DemoAIClient`, so the whole interview
      flow stays usable on a development/demo server. Voice is delegated to
      the real client when an ``OPENAI_API_KEY`` exists, and otherwise fails
      with the same honest "not configured" error as before.
    * Anything else → the real :class:`OpenAIClient` (which raises
      ``not_configured`` per call when a key is missing, exactly as it always
      has — production behavior is unchanged).
    """
    settings = get_settings()
    if settings.demo_ai_enabled and not settings.openrouter_api_key:
        from app.services.demo_ai import DemoAIClient

        voice_delegate = OpenAIClient() if settings.openai_api_key else None
        logger.warning(
            "No OPENROUTER_API_KEY configured — using the offline demo AI "
            "(AI_DEMO_MODE=%s). Questions, analysis and scoring are generated "
            "locally; voice features %s. Set OPENROUTER_API_KEY for the real "
            "provider, or AI_DEMO_MODE=off to restore the strict "
            "'AI isn't configured' behavior.",
            settings.ai_demo_mode,
            "use the real provider" if voice_delegate else "are unavailable",
        )
        return DemoAIClient(voice_delegate=voice_delegate)
    return OpenAIClient()
