# ELEVORA — Implementation Status

Last updated: 2026-10-03 (production-readiness pass).

## Feature status

| Area | Status | Notes |
|---|---|---|
| Landing, signup, login, logout, protected routes | Working | Session is an HTTP-only JWT cookie; `PATCH /auth/me` powers Settings |
| Dashboard with real history | Working | Counts and rows come from the user's own interviews; no demo data anywhere |
| Interview profiles (system + custom, soft delete) | Working | 6 system profiles seeded idempotently on startup |
| Interview configuration (profile or category, difficulty, language, experience level, duration) | Working | Defaults come from the user's saved preferences |
| Resume upload + extraction (PDF/DOCX) | Working | Text is wrapped as untrusted data for the model; extraction is shown back to the candidate |
| Job description (paste or file) | Working | Same untrusted-data handling |
| AI question generation, adaptive difficulty, follow-ups | Working | Requires `OPENROUTER_API_KEY`; failures return candidate-safe messages |
| Text interview + voice answer workflow | Working | Voice requires `OPENAI_API_KEY` for transcription |
| Speech analytics (pace, pauses, fillers) | Working | Requires `ffmpeg`/`ffprobe` on the host; degrades to "Not available" without it |
| Webcam analytics (on-device, face visible / looking away / movement) | Working, browser-unverified | MediaPipe runtime is self-hosted; model file needs network or a self-hosted copy |
| Interview state management (draft → in progress → completed / ended early) | Working | Atomic claims, unique turn index, retry-safe |
| AI evaluation + deterministic weighted scoring | Working | Requires `OPENROUTER_API_KEY`; weights are exposed and explained in the report |
| Results/report page | Working | Shows per-dimension evidence, missing dimensions, and how the score was computed |
| Settings | Working | Name, language, default difficulty persisted via `PATCH /auth/me` |
| MongoDB persistence | Working | Indexes created at startup; required in production |
| Automated tests | Working | Backend: 231 pytest tests. Frontend: 23 vitest tests |

## Verification performed in this environment

- `backend`: `python -m compileall -q app` → clean; `.venv/bin/python -m pytest -q` → **231 passed**.
- `frontend`: `npx tsc --noEmit` → clean; `npm run lint` → clean; `npm run build` → succeeds (fonts self-hosted);
  `npx vitest run` → **23 passed**.
- Live run: API started against the in-process development database (`MONGO_URI=memory://`) and the Next.js
  dev server proxied `/api/*` to it. No MongoDB daemon is installed in this sandbox.

## Not verified here (and how to verify)

| Item | Why not verified | How to verify |
|---|---|---|
| Real OpenRouter / OpenAI calls | No API key or network access to those hosts from the sandbox | `cd backend && python -m scripts.smoke_test_ai` |
| Browser microphone capture + transcription round-trip | No browser or microphone | Chrome on `http://localhost:3000`, record an answer, confirm the transcript appears |
| Browser camera + MediaPipe webcam analytics | No browser or camera | Chrome with camera access; confirm "On-device analysis running" appears and the report shows a Webcam score |
| Cross-browser behavior (Safari `audio/mp4`, Firefox) | No browsers available | Manual pass in each target browser |
| Deployment behind Docker/nginx | Docker is not installed in the sandbox | `docker compose -f elevora/docker-compose.yml up --build` |

## Known limitations

- Delivery/Webcam score thresholds are sensible defaults, not calibrated against real recordings.
- Speaking practice is record → upload → transcribe, not realtime/WebRTC (deliberate; see README).
- No password reset, email verification, or account deletion yet.
- The API's rate limiting is per process; a multi-worker deployment needs a shared store (Redis) to be global.
- Interview lists are capped at 200 per request; the dashboard has no paging UI yet.
