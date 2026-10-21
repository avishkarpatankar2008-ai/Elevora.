# ELEVORA — Implementation Status

Last updated: 2026-10-19 (free-only AI routing and optional posture analysis update).

## Feature status

| Area | Status | Notes |
|---|---|---|
| Landing, signup, login, logout, protected routes | Working | Session is an HTTP-only JWT cookie; `PATCH /auth/me` powers Settings |
| Dashboard with real history | Working | Greeting, average/completed/streak/time tiles, score-trend area chart and dimension radar (recharts, palette-locked), plus a searchable, filterable, sortable history table; every figure derives from the user's own data — no demo data anywhere |
| Interview profiles (system + custom, soft delete) | Working | 6 system profiles seeded idempotently on startup |
| Interview configuration (profile or category, difficulty, language, experience level, duration) | Working | Six-step guided wizard (01 Profile → 06 Start) with a progress rail; created once on the final step so abandoning it leaves nothing behind. Defaults come from the user's saved preferences |
| Resume upload + extraction (PDF/DOCX) | Working | Text is wrapped as untrusted data for the model; extraction is shown back to the candidate |
| Job description (paste or file) | Working | Same untrusted-data handling |
| AI question generation, adaptive difficulty, follow-ups | Working | Fixed six-model free-only chain (Groq → two Gemini models → three OpenRouter `:free` models); malformed/provider-failed requests fail over sequentially and exhaustions use schema-valid deterministic fallback |
| Text interview + voice answer workflow | Working | Voice transcription uses Groq Whisper (`GROQ_API_KEY`); question playback uses browser speech synthesis, with no server-side TTS |
| Speech analytics (pace, pauses, fillers) | Working | Requires `ffmpeg`/`ffprobe` on the host; degrades to "Not available" without it |
| Webcam analytics (on-device, face visible / looking away / movement) | Optional, browser-unverified | Per-session consent, camera off by default, local face + pose landmarks, aggregate-only upload, no raw video |
| Interview state management (draft → in progress → completed / ended early) | Working | Atomic claims, unique turn index, retry-safe |
| AI evaluation + deterministic weighted scoring | Working | Uses the fixed six-model free-only router; fallbacks explicitly state when a score was not assessed |
| Results/report page | Working | Groups dimensions by evaluation source (AI-evaluated / measured on device / not available), shows per-dimension evidence, a question-by-question breakdown from the transcript, strengths, areas to improve, recommendations, the weights arithmetic and an AI-written improved answer |
| Settings | Working | Name, language, default difficulty, and auto-play preference persisted via `PATCH /auth/me`; webcam consent is per interview and cannot be overridden by the legacy camera-default preference |
| MongoDB persistence | Working | Indexes created at startup; required in production |
| Automated tests | Partially verified in this environment | 34 targeted router/scoring tests passed with a temporary SDK stub; full backend/frontend suites need dependencies installed (details below) |

## Verification performed for the 2026-10-19 update

- `python -m compileall -q backend/app backend/tests`: **passed**.
- Targeted free-only router and deterministic scoring tests: **34 passed** using `pytest --noconftest` and a temporary OpenAI SDK stub; no external API call was made. This is useful unit-test evidence but does not replace running against the real locked dependencies.
- Full backend suite: **blocked**, because `mongomock_motor` is absent and package indexes are unreachable from this environment.
- Frontend syntax transpilation for the nine changed TypeScript/TSX files: **passed**. Full frontend type-check/build/tests/lint: **blocked**, because `frontend/node_modules` is absent. `npm run typecheck` confirms missing React, MediaPipe, and other package declarations; resulting JSX typing errors are cascading from those missing dependencies.

## Not verified here (and how to verify)

| Item | Why not verified | How to verify |
|---|---|---|
| Real Groq / Gemini / OpenRouter calls | No API key or provider connectivity verified in this sandbox | `cd backend && python -m scripts.smoke_test_ai` |
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
