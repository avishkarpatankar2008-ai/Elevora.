# ELEVORA API — FastAPI + MongoDB client.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# ffmpeg/ffprobe are a runtime dependency of speech analytics (pace, pauses,
# fillers). Without them voice answers are stored without delivery metrics.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run as a non-root user; the app needs no write access to its own code.
RUN useradd --create-home --uid 10001 elevora \
    && chown -R elevora:elevora /app
USER elevora

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/health || exit 1

# --proxy-headers so the app sees the real client IP behind a load balancer
# (the rate limiter keys on it).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
