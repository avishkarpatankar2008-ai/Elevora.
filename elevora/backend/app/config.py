"""Central application configuration.

Everything here is loaded from environment variables (and a local ``.env``
file during development). Production deployments must set real values —
``_validate_production_safety`` refuses to start the API with an insecure
development default in a non-development environment, rather than silently
running with a guessable JWT secret.
"""

from functools import lru_cache
from typing import Literal, Optional

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# The only value ``jwt_secret`` is allowed to have outside development. It is
# deliberately obvious so that a misconfigured deployment fails loudly instead
# of issuing forgeable session tokens.
INSECURE_DEV_JWT_SECRET = "insecure-dev-secret-change-me"

MEMORY_URI_PREFIX = "memory://"

MIN_PRODUCTION_SECRET_LENGTH = 32


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    env: Literal["development", "test", "production"] = "development"
    log_level: str = "INFO"

    # ------------------------------------------------------------------ database
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "elevora"
    mongo_server_selection_timeout_ms: int = Field(default=5_000, ge=500, le=60_000)

    # ---------------------------------------------------------------------- auth
    jwt_secret: str = INSECURE_DEV_JWT_SECRET
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = Field(default=60 * 24, ge=5, le=60 * 24 * 30)

    frontend_origin: str = "http://localhost:3000"
    """Exact origin of the deployed frontend. Used for CORS and for the
    SameSite=None cookie warning. No trailing slash."""

    cookie_name: str = "elevora_session"
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    cookie_domain: Optional[str] = None
    """Set only when the API and frontend share a parent domain and you want
    the cookie scoped to it (e.g. ``.example.com``). Leave unset otherwise."""

    cookie_secure: Optional[bool] = None
    """Override for the Secure cookie flag. ``None`` (default) means "secure
    whenever we're not in development", which is the safe choice."""

    auth_rate_limit_enabled: bool = True
    auth_login_rate_limit: int = Field(default=20, ge=1, le=1000)
    auth_login_rate_window_seconds: int = Field(default=60, ge=1, le=86_400)
    auth_register_rate_limit: int = Field(default=60, ge=1, le=1000)
    auth_register_rate_window_seconds: int = Field(default=3_600, ge=1, le=86_400)

    # --------------------------------------------------------- TEXT AI (OpenRouter)
    openrouter_api_key: str = ""
    openrouter_model: str = "openai/gpt-4o-mini"
    openrouter_timeout_seconds: float = Field(default=45.0, ge=5.0, le=300.0)
    openrouter_max_attempts: int = Field(default=2, ge=1, le=5)
    openrouter_referer: str = ""
    """Optional site URL sent to OpenRouter for attribution. Defaults to
    ``frontend_origin`` when empty."""

    # ---------------------------------------------------------- VOICE AI (OpenAI)
    openai_api_key: str = ""
    openai_transcribe_model: str = "gpt-4o-mini-transcribe"
    openai_tts_model: str = "gpt-4o-mini-tts"
    openai_tts_voice: str = "alloy"
    openai_timeout_seconds: float = Field(default=60.0, ge=5.0, le=300.0)
    openai_max_attempts: int = Field(default=2, ge=1, le=5)

    # ------------------------------------------------------------------ uploads
    max_audio_upload_bytes: int = Field(default=15 * 1024 * 1024, ge=64 * 1024)
    max_document_upload_bytes: int = Field(default=8 * 1024 * 1024, ge=64 * 1024)
    max_request_bytes: int = Field(default=25 * 1024 * 1024, ge=64 * 1024)

    # ------------------------------------------------------------- engine tuning
    stale_claim_seconds: int = Field(default=120, ge=10, le=3_600)
    """How long an in-flight interview operation (start/answer/report) may hold
    its claim before another request is allowed to take over. This is what
    keeps a crashed or timed-out AI call from permanently freezing a session."""

    @property
    def is_production(self) -> bool:
        return self.env == "production"

    @property
    def cookie_secure_effective(self) -> bool:
        if self.cookie_secure is not None:
            return self.cookie_secure
        return self.env != "development"

    @property
    def allowed_origins(self) -> list[str]:
        origins = [self.frontend_origin] if self.frontend_origin else []
        # Local development convenience: Next.js picks 3000 first but falls back
        # to the next free port. Production deployments set FRONTEND_ORIGIN.
        if self.env == "development":
            for port in range(3000, 3006):
                candidate = f"http://localhost:{port}"
                if candidate not in origins:
                    origins.append(candidate)
        return origins

    @property
    def openrouter_attribution_referer(self) -> str:
        return self.openrouter_referer or self.frontend_origin

    @model_validator(mode="after")
    def _validate_production_safety(self) -> "Settings":
        if self.env != "production":
            return self

        problems: list[str] = []

        if self.mongo_uri.startswith(MEMORY_URI_PREFIX):
            problems.append(
                "MONGO_URI=memory:// is a development convenience that loses all data on "
                "restart; production must point at a real MongoDB deployment."
            )

        if self.jwt_secret == INSECURE_DEV_JWT_SECRET:
            problems.append(
                "JWT_SECRET is still the development default. Generate one with "
                "`openssl rand -hex 32` and set it in the backend environment."
            )
        elif len(self.jwt_secret) < MIN_PRODUCTION_SECRET_LENGTH:
            problems.append(
                f"JWT_SECRET must be at least {MIN_PRODUCTION_SECRET_LENGTH} characters in production."
            )

        if self.cookie_samesite == "none" and not self.cookie_secure_effective:
            problems.append(
                "COOKIE_SAMESITE=none requires a Secure cookie (https). Set COOKIE_SECURE=true "
                "or COOKIE_SAMESITE=lax."
            )

        if self.frontend_origin.endswith("/"):
            problems.append("FRONTEND_ORIGIN must not end with a trailing slash.")

        if self.frontend_origin.startswith("http://localhost"):
            problems.append(
                "FRONTEND_ORIGIN still points at localhost. Set it to the deployed frontend origin."
            )

        if problems:
            raise ValueError(
                "Refusing to start with unsafe production configuration:\n- " + "\n- ".join(problems)
            )

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
