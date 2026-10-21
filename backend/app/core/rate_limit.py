"""In-process rate limiting for the unauthenticated auth endpoints.

Why in-process: ELEVORA's deployment target (a single API service) does not
have Redis in front of it, and adding one just for this would be a bigger
dependency than the problem warrants. The trade-off is explicit and worth
stating: each worker process keeps its own counters, so with N workers the
effective limit is N × the configured value. That is still a large
improvement over no limit at all for the realistic threat here — automated
credential stuffing against a single public endpoint — and the interface is
small enough to swap for a Redis-backed implementation later without
touching the routers.

The limiter is intentionally boring: a sliding window of timestamps per key,
pruned on every check, stored in a bounded dict.
"""

import time
from collections import defaultdict, deque
from threading import Lock

from app.config import get_settings

_Window = deque


class RateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, _Window[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str, *, limit: int, window_seconds: int) -> float:
        """Record a hit for ``key``. Returns 0.0 when allowed, or the number of
        seconds the caller should wait before retrying."""
        now = time.monotonic()
        cutoff = now - window_seconds

        with self._lock:
            window = self._hits[key]
            while window and window[0] <= cutoff:
                window.popleft()

            if len(window) >= limit:
                return max(0.0, window[0] + window_seconds - now)

            window.append(now)
            # Opportunistic cleanup so the dict can't grow without bound from
            # one-off keys (e.g. spoofed identifiers).
            if len(self._hits) > 10_000:
                for stale_key in [k for k, w in self._hits.items() if not w or w[-1] <= cutoff]:
                    self._hits.pop(stale_key, None)

        return 0.0

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


_limiter = RateLimiter()


def check_auth_rate_limit(scope: str, identifier: str) -> float:
    """Returns seconds-to-wait (0.0 = allowed) for an auth attempt.

    ``scope`` is ``"login"`` or ``"register"``; ``identifier`` should combine
    the client address with the submitted email so that neither a single IP
    nor a single account can be hammered for free.
    """
    settings = get_settings()
    if not settings.auth_rate_limit_enabled:
        return 0.0

    if scope == "login":
        limit = settings.auth_login_rate_limit
        window = settings.auth_login_rate_window_seconds
    elif scope == "register":
        limit = settings.auth_register_rate_limit
        window = settings.auth_register_rate_window_seconds
    else:  # pragma: no cover - defensive; only the two scopes above are used
        raise ValueError(f"Unknown rate-limit scope: {scope}")

    return _limiter.check(f"{scope}:{identifier}", limit=limit, window_seconds=window)


def reset_rate_limits() -> None:
    """Test/ops hook — clears every counter."""
    _limiter.reset()
