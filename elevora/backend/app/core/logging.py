"""Application logging setup.

A single place that decides log level, format, and which noisy third-party
loggers stay quiet. Called once from ``app.main`` at import time so that even
import-time failures are logged in a consistent format.
"""

import logging
import sys

from app.config import get_settings

_LOG_FORMAT = "%(asctime)s %(levelname)-8s %(name)s: %(message)s"
_DATE_FORMAT = "%Y-%m-%dT%H:%M:%S%z"

# Loggers that emit a lot of low-signal noise at INFO level.
_QUIET_LOGGERS = ("httpx", "httpcore", "openai", "motor", "pymongo", "multipart")


def configure_logging() -> None:
    settings = get_settings()
    level = getattr(logging, settings.log_level.upper(), logging.INFO)

    root = logging.getLogger()
    # ``force`` makes repeated calls (e.g. in tests) idempotent instead of
    # stacking duplicate handlers onto the root logger.
    logging.basicConfig(
        level=level,
        format=_LOG_FORMAT,
        datefmt=_DATE_FORMAT,
        stream=sys.stdout,
        force=True,
    )
    root.setLevel(level)

    for name in _QUIET_LOGGERS:
        logging.getLogger(name).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
