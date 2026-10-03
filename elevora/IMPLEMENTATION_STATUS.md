# ELEVORA — Implementation Status

Last updated: 2026-10-03 (production-readiness pass, then the navy/plum UI redesign).

## Feature status

| Area | Status | Notes |
|---|---|---|
| Landing, signup, login, logout, protected routes | Working | Session is an HTTP-only JWT cookie; `PATCH /auth/me` powers Settings |
| Dashboard with real history | Working | Greeting, average/completed/streak/time tiles, score-trend area chart and dimension radar (recharts, palette-locked), plus a searchable, filterable, sortable history table; every figure derives from the user's own data — no demo data anywhere |
| Interview profiles (system + custom, soft delete) | Working | 6 system profiles seeded idempotently on startup |
| Interview configuration (profile or category, difficulty, language, experience level, duration) | Working | Six-step guided wizard (01 Profile → 06 Start) with a progress rail; created once on the final step so abandoning it leaves nothing behind. Defaults come from the user's saved preferences |
| Resume upload + extraction (PDF/DOCX) | Working | Text is wrapped as untrusted data for the model; extraction is shown back to the candidate |
| Job description (paste or file) | Working | Same untrusted-data handling |
| AI question generation, adaptive difficulty, follow-ups | Working | Requires `OPENROUTER_API_KEY`; failures return candidate-safe messages |
| Text interview + voice answer workflow | Working | Voice requires `OPENAI_API_KEY` for transcription |
| Speech analytics (pace, pauses, fillers) | Working | Requires `ffmpeg`/`ffprobe` on the host; degrades to "Not available" without it |
| Webcam analytics (on-device, face visible / looking away / movement) | Working, browser-unverified | MediaPipe runtime is self-hosted; model file needs network or a self-hosted copy |
| Interview state management (draft → in progress → completed / ended early) | Working | Atomic claims, unique turn index, retry-safe |
| AI evaluation + deterministic weighted scoring | Working | Requires `OPENROUTER_API_KEY`; weights are exposed and explained in the report |
| Results/report page | Working | Groups dimensions by evaluation source (AI-evaluated / measured on device / not available), shows per-dimension evidence, a question-by-question breakdown from the transcript, strengths, areas to improve, recommendations, the weights arithmetic and an AI-written improved answer |
| Settings | Working | Name, language, default difficulty, auto-play question audio and camera-on-by-default persisted via `PATCH /auth/me`; sections for AI preferences, voice & camera (live device check), privacy and appearance |
| MongoDB persistence | Working | Indexes created at startup; required in production |
| Automated tests | Working | Backend: 233 pytest tests. Frontend: 35 vitest tests |

## Verification performed in this environment

- `backend`: `python -m compileall -q app` → clean; `.venv/bin/python -m pytest -q` → **233 passed**.
- `frontend`: `npx tsc --noEmit` → clean; `npm run lint` → clean; `npm run build` → succeeds (10 routes, fonts
  self-hosted); `npx vitest run` → **35 passed**.
- Live run: API started against the in-process development database (`MONGO_URI=memory://`, development only)
  and the production standalone build served by `npm start` proxied `/api/*` to it. No MongoDB daemon is
  installed in this sandbox.
- Live route check on the production build: `/`, `/login`, `/signup`, `/dashboard`, `/interviews/new`,
  `/interview-profiles`, `/settings` → 200, unknown route → 404, `/api/health` → `{"status":"ok","database":"connected"}`.
- Live API check: register → all four preferences returned; `PATCH /auth/me` with
  `{"preferences":{"autoPlayQuestion":true,"cameraEnabledByDefault":false}}` → persisted and echoed;
  `"yes"` for a boolean field → 422; a partial patch preserves the sibling keys.

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
- Interview lists are capped at 200 per request; the dashboard's search/filter/sort work over the loaded
  page, and there is still no paging UI or server-side search.
- The dashboard loads reports for the 12 most recent completed interviews when computing averages; the UI
  states that scope explicitly instead of implying it summarised everything.
- The redesigned interface has not been viewed in a real browser here (no browser in the sandbox) — the
  checks above are build, type, lint, test and HTTP-level only.
