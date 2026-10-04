# ELEVORA — Implementation Status

Last updated: 2026-10-04 (offline demo AI mode — the full interview flow now
runs end-to-end with no provider keys; verified live through the production
build).

## Feature status

| Area | Status | Notes |
|---|---|---|
| Landing, signup, login, logout, protected routes | Working | Session is an HTTP-only JWT cookie; `PATCH /auth/me` powers Settings |
| Dashboard with real history | Working | Greeting, average/completed/streak/time tiles, score-trend area chart and dimension radar (recharts, palette-locked), plus a searchable, filterable, sortable history table; every figure derives from the user's own data — no demo data anywhere |
| Interview profiles (system + custom, soft delete) | Working | 6 system profiles seeded idempotently on startup |
| Interview configuration (profile or category, difficulty, language, experience level, duration) | Working | Six-step guided wizard (01 Profile → 06 Start) with a progress rail; created once on the final step so abandoning it leaves nothing behind. Defaults come from the user's saved preferences |
| Resume upload + extraction (PDF/DOCX) | Working | Text is wrapped as untrusted data for the model; extraction is shown back to the candidate |
| Job description (paste or file) | Working | Same untrusted-data handling |
| AI question generation, adaptive difficulty, follow-ups | Working | Requires `OPENROUTER_API_KEY` for the real model; without a key (outside production) the offline demo AI runs the same flow — see the demo-mode row below. Provider failures return candidate-safe messages |
| Offline demo AI (`AI_DEMO_MODE`, `app/services/demo_ai.py`) | Working | Development-only fallback when no `OPENROUTER_API_KEY` is set: questions from curated topic banks, heuristic answer analysis/extraction/evaluation, `/health` reports `aiMode: "demo"`, and the UI shows a demo-mode notice (interview room, results, settings). Voice is never faked — it fails with an honest "type your answer" message. Production refuses `AI_DEMO_MODE=on` and resolves `auto` to off |
| Text interview + voice answer workflow | Working | Voice requires `OPENAI_API_KEY` for transcription |
| Speech analytics (pace, pauses, fillers) | Working | Requires `ffmpeg`/`ffprobe` on the host; degrades to "Not available" without it |
| Webcam analytics (on-device, face visible / looking away / movement) | Working, browser-unverified | MediaPipe runtime is self-hosted; model file needs network or a self-hosted copy |
| Interview state management (draft → in progress → completed / ended early) | Working | Atomic claims, unique turn index, retry-safe |
| AI evaluation + deterministic weighted scoring | Working | Requires `OPENROUTER_API_KEY`; weights are exposed and explained in the report |
| Results/report page | Working | Groups dimensions by evaluation source (AI-evaluated / measured on device / not available), shows per-dimension evidence, a question-by-question breakdown from the transcript, strengths, areas to improve, recommendations, the weights arithmetic and an AI-written improved answer |
| Settings | Working | Name, language, default difficulty, auto-play question audio and camera-on-by-default persisted via `PATCH /auth/me`; sections for AI preferences, voice & camera (live device check), privacy and appearance |
| MongoDB persistence | Working | Indexes created at startup; required in production |
| Automated tests | Working | Backend: 252 pytest tests passing (10 audio tests skip without ffmpeg). Frontend: 41 vitest tests |

## Verification performed in this environment

- `backend`: `python -m compileall -q app` → clean; `.venv/bin/python -m pytest -q` → **252 passed, 10 skipped**
  (the skips are the ffmpeg-dependent audio tests; ffmpeg is not installable in this sandbox — Debian repos unreachable).
- `frontend`: `npx tsc --noEmit` → clean; `npm run lint` → clean; `npm run build` → succeeds (10 routes, fonts
  self-hosted); `npx vitest run` → **41 passed**.
- Live full-flow trace (2026-10-04): production standalone frontend (`npm start`) proxying to the API on
  `MONGO_URI=memory://` with **no AI keys at all** — register → login → create interview from a seeded profile →
  paste a job description (extraction returned role/company/seniority/skills) → upload a real PDF resume
  (extraction returned skills + the "35%" claim) → start → 8 adaptive answers including two triggered follow-ups
  and difficulty moving both ways → completion → scored report with evidence quoting the candidate's own answers →
  dashboard list. Exit-early → abandoned → report correctly refused (400). Voice endpoints correctly returned their
  honest 502 "type your answer instead" / "question text is available above" messages. `/api/health` reported
  `aiMode: "demo"`. Note: OpenRouter/OpenAI hosts are network-unreachable from this sandbox, so the real provider
  path remains unverified here exactly as before (`python -m scripts.smoke_test_ai` where keys + network exist).
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
- The demo AI is a flow stand-in, not a judge: its question banks cover the seeded profiles' subjects
  (unrecognized topics fall back to coherent topic-parameterized templates), and its analysis/evaluation
  are transparent text heuristics. Scores from demo mode are fine for exercising the product; they are
  not model-quality assessments.
