# ELEVORA — Production Readiness Report

Date: 2026-10-03. Scope: the whole application (FastAPI API + Next.js client), audited and hardened
end to end, with every claim below backed by a command that was actually run in this workspace.

---

## 1. Major problems found

**Backend / reliability**

1. `POST /interviews/{id}/answer` and `/start` had no concurrency control: two clicks (or one
   double-submitted form) could bill two AI calls and race two writes. There was no unique
   constraint on `(interviewId, sequence)`, so a duplicate turn was *storable*.
2. A failed AI call mid-answer could leave the interview holding a claim (or a half-applied
   transition) with no self-recovery path.
3. Report generation had no idempotency guard — two "Generate report" clicks meant two evaluation
   calls and two racing writes of the same document.
4. Provider errors were surfaced as raw strings. OpenRouter/OpenAI error text (URLs, model ids,
   sometimes key fragments) could reach the candidate.
5. `GET /interviews` returned the user's entire history unbounded, including embedded resume/JD
   extractions.
6. Login/registration had no rate limiting at all.
7. The JWT secret had an insecure default and nothing prevented a production deployment from
   shipping it; `SameSite=None` without `Secure` was also accepted.
8. Resume/JD text was passed to the model without an untrusted-data boundary.

**Frontend / product**

9. The build was broken: `next/font/google` fetched Inter from Google at build time, which fails
   offline, in CI, and behind firewalls.
10. A partially-migrated theme left light-theme classes on a dark background — headings such as
    "Log in"/"Settings" rendered near-black on near-black, i.e. invisible.
11. Settings was read-only (its own copy admitted nothing was wired up) even though the account
    data existed; a new interview ignored the user's saved language/difficulty preferences and
    hardcoded `experienceLevel: "entry-level"` in both creation flows.
12. The report page told users that voice/webcam analysis "isn't built yet" — it is — and never
    explained how the overall score was computed.
13. The `Navbar` had `hidden md:flex` links and no mobile menu: on a phone there was no way to reach
    Practice, Profiles, or Settings.
14. The MediaPipe runtime (~34 MB of WASM) was loaded from `cdn.jsdelivr.net` and the model from
    `storage.googleapis.com` at runtime — third-party dependencies in the hot path of a core
    feature, unpinned and unusable on locked-down networks.
15. No route-level error boundary, no 404 page, no abort handling on fetches (state updates after
    unmount), no client-side file validation (a 200 MB `.txt` was uploaded only to be rejected).

---

## 2. Root causes

- **Sequential thinking about concurrent UI events.** The engine assumed one request at a time;
  HTTP clients (double clicks, retries, two tabs) don't work that way. Fixing symptoms (catching
  duplicate-key errors) is not enough — the *transition* has to be claimed atomically.
- **No ownership boundary for provider errors.** `str(exc)` was used as the user-facing message in
  several paths, which couples what the user sees to what the provider says.
- **Copy-paste theming.** Two token vocabularies (light `navy-*`, dark `ink-*`) coexisted; whichever
  the file happened to use decided whether text was readable.
- **Assets fetched at runtime/build time by default.** Fonts and WASM both assumed unrestricted
  network access.
- **No frontend test runner**, so component behavior (and the honesty rules encoded in the UI) had
  no regression protection.

---

## 3. Changes made

**Security**
- Session cookies: `HttpOnly`, `SameSite` from config, `Secure` whenever `ENV != development`
  (production **refuses to start** with the dev JWT secret, a short secret, a localhost
  `FRONTEND_ORIGIN`, or `SameSite=None` without Secure).
- In-process rate limiting on `/auth/login` and `/auth/register`, keyed per client address + email,
  with `Retry-After` on 429.
- Every interview endpoint verifies ownership and returns **404** (not 403) for another user's
  interview, so IDs can't be probed.
- Uploads: chunked reads with hard caps (413), content-type allow-lists (415/422), magic-byte
  verification for PDF/DOCX, and `Content-Length` rejection before reading.
- Untrusted-data boundaries around resume, JD, and candidate answers (`<untrusted_*>` blocks,
  tag-like sequences stripped, injection markers neutralized), plus system prompts that state the
  block is data and must never be followed.
- Provider errors are classified (`timeout`, `rate_limited`, `unavailable`, `invalid_response`,
  `not_configured`) and mapped to fixed candidate-safe copy; the raw error is logged server-side.
- Generic exception handler returns a fixed message — no stack traces, driver errors, or provider
  payloads ever reach a client. Security headers (`nosniff`, referrer policy, permissions policy,
  `Cache-Control: no-store` on authenticated routes) on every API response.
- CSP and hardening headers on the Next.js side; API base defaults to a same-origin `/api` proxy so
  the session cookie stays first-party.

**Reliability**
- Atomic, self-expiring claims (start / answer / report) with explicit release on failure; stale
  claims are ignored after a configurable window, so a killed request can never freeze a session.
- Unique `(interviewId, sequence)` index — a duplicated turn is now impossible at the database
  level, not just unlikely.
- Answers carry the question they belong to; a duplicate or late submission is rejected (409)
  instead of silently being recorded against the next question.
- Analysis + next question are generated *before* anything is persisted, so a provider failure
  leaves the interview exactly as it was and the answer can be retried.
- `completed` is terminal (an exit can't downgrade it); abandoned interviews reject answers.
- Bounded listing (`limit`/`offset`, max 200) on the interview history endpoint.

**AI hardening**
- JSON extraction tolerant of markdown fences/prose, validated against strict schemas, with named
  reasoning fields excluded from the parse path; unexpected provider shapes raise classified errors
  instead of crashing.
- Explicit timeouts and bounded retries with backoff; a provider that rejects `response_format`
  gets exactly one retry without it; auth errors are never retried.

**Product / UX (see section 5 for the visual work)**
- Settings is fully wired (`PATCH /auth/me`), and new interviews default to the saved language and
  difficulty with explicit experience-level/language controls.
- The report page explains its arithmetic (weights per dimension, renormalized over what was
  actually measured), states why a dimension is unavailable, and supports regeneration.
- Mobile navigation (hamburger with `aria-expanded`, Escape to close, route-change close).
- Route-level error boundary, 404 page, abortable fetches, client-side file validation, per-turn
  measured delivery metrics, honest webcam analytics status ("running / starting / couldn't start").

**Assets / build**
- Inter is self-hosted (`next/font/local`, SIL OFL, files vendored) — the production build no longer
  touches fonts.googleapis.com.
- MediaPipe WASM is copied from the pinned npm package into `public/mediapipe/wasm` by
  `scripts/copy-mediapipe-wasm.mjs` (`predev`/`prebuild`), and the model URL is configurable.
- `output: "standalone"`, `poweredByHeader: false`, `/api/*` rewrite to `BACKEND_ORIGIN`.

---

## 4. Tests added or fixed

**Backend (163 → 231 passing)**

- `tests/test_reliability.py` (new, 13): duplicate answer → one turn and one AI call; the dangerous
  *late* duplicate (does not answer the next question); unique-index backstop; analysis failure
  preserves the pending question and records no turn; retry records exactly one turn; blank and
  oversized answers rejected before the AI call; start failure leaves a startable draft; concurrent
  starts bill one question; stale start/report claims self-heal; in-flight report claim → 409 with
  no second evaluation; failed report leaves no partial report; completed is terminal; abandoned
  can't be answered.
- `tests/test_security.py` (new, 33): token tampering/expiry/foreign-key rejection; production
  config refusal; login rate limit + per-email isolation; cross-user 404s on every interview
  endpoint (parameterized); upload type/size/content rejection; prompt-injection containment
  (resume text and candidate answers stay inside the untrusted block); settings validation;
  no provider details in error responses.
- `tests/test_ai_client.py` (new, 21): JSON extraction (fences, prose, empty, garbage — and never
  echoing model output in the error); normalization; retry/backoff and no-retry classification;
  timeout/unavailable/invalid classification; `response_format` fallback; a timeout is always set;
  `not_configured` for missing keys; unexpected exceptions are not swallowed.
- `tests/test_evaluation.py` (+1): the report exposes renormalized weights that reproduce the
  overall score exactly.
- `tests/test_voice.py`, `tests/test_speech_analytics.py`, `tests/test_evaluation.py`: audio tests now
  declare their real dependency (`@requires_audio_tooling`) and skip with an explicit reason when
  ffmpeg/ffprobe are absent, instead of failing with a `pydub` traceback.

**Frontend (0 → 23 passing, new runner)**

- `vitest` + Testing Library + jsdom, `npm test`.
- `tests/api.test.ts` (12): same-origin base, credentials, detail-message mapping, non-JSON bodies,
  non-string detail, 204 handling, multipart without a manual Content-Type, question echo, network
  failure → actionable message, 5xx human message, aborts not swallowed.
- `tests/webcamAnalytics.test.ts` (8): matrix index in either convention, truncated matrices,
  centroid math, minimum-sample honesty, correct denominators, no divide-by-zero.
- `tests/components.test.tsx` (3): DimensionBar shows evidence for a score and "Not available"
  (never a guess) when there is none; Alert's assertive vs. polite announcements.

No test was deleted, skipped, or weakened to make the suite pass; the two new skips describe a
genuine external dependency and are covered by an install step in the deployment checklist.

---

## 5. Security, performance and UX improvements

**Security** — see section 3; additionally: no secrets in the client bundle, `.env` git-ignored,
`.env.example` documents every variable, `Permissions-Policy` disables unused browser capabilities,
and the webcam pipeline provably sends only aggregate rates (the API has no endpoint that accepts
frames).

**Performance**
- MediaPipe never enters the main bundle (dynamic import inside the tracker) and its WASM is served
  from our own origin with a cache policy.
- The interview room samples the camera once per second on-device instead of streaming video.
- TTS audio is cached in-process keyed by (model, voice, text), so replaying a question doesn't
  re-bill OpenAI.
- Indexes match the access patterns (`users.email` unique, `(userId, createdAt)`, `(userId, status)`,
  `interview_turns (interviewId, sequence)` unique, profile lookups).
- Bounded listings, chunked uploads, and `AbortController` on page loads; dashboard derivation is
  memoized.

**UX**
- One dark design system with a restrained burnt-orange accent, measured contrast (ink-900 ≈ 16.9:1,
  ink-600 ≈ 8.6:1, white on accent ≈ 4.7:1), consistent focus rings, and reduced-motion support.
- Consistent inline `Alert` states (assertive for errors, polite for updates), explicit empty states,
  human-sized error copy, confirmation before destructive actions, and per-question progress.
- The interface never invents a number: unavailable measurements are labelled "Not available" with
  the reason, and the score explanation shows the arithmetic that produced it.

---

## 6. Validation commands executed (exact)

```bash
# Backend — from elevora/backend
.venv/bin/python -m compileall -q app              # exit 0
.venv/bin/python -m pytest -q                      # 231 passed, 2 warnings in 68.6s

# Frontend — from elevora/frontend
npx tsc --noEmit                                   # exit 0
npm run lint                                       # no ESLint warnings or errors
npx vitest run                                     # 3 files, 23 tests passed
npm run build                                      # succeeded; 10 routes, first-load JS ≤ 108 kB
```

Environment: Python 3.11.2, Node v22.22.3, ffmpeg/ffprobe present, no MongoDB daemon, no browser.

---

## 7. Exact results

- Backend suite: **231 passed** (was 163 at the start of this pass), 2 warnings (both from third-party
  deprecations: `passlib`/`crypt`, `pydub`/`audioop`).
- Frontend: type-check clean, lint clean, production build succeeded (previously failed at the font
  fetch), 23 unit tests passing.
- Live smoke run in this workspace: API booted with `MONGO_URI=memory://`, seeded 6 system profiles,
  `/health` → `{"status":"ok","database":"connected"}`; the Next.js dev server served the app and
  proxied `/api/*` to it. Registration, login, profile listing, interview creation and the
  dashboard were exercised through the API and the UI routes.
- Every AI-dependent path returns a 502 with a candidate-safe message when no API key is configured
  (verified by test and in the live run) rather than crashing or faking a result.

---

## 8. Remaining limitations

- Nothing that requires a browser or a real provider key is verified here: camera/mic behavior,
  MediaPipe against a live face, real OpenRouter/OpenAI calls, and cross-browser quirks. Section 9
  lists the exact steps to verify each.
- Delivery/Webcam thresholds are heuristics with no calibration data.
- Rate limiting and the TTS cache are per process; a multi-worker deployment needs shared state
  (Redis) for global limits.
- No password reset, email verification, or account deletion.
- Interview history has no paging UI (the API is bounded at 200).
- Docker images could not be built in this sandbox (no Docker daemon); the compose file is provided
  and is the documented deployment path.

---

## 9. Production deployment checklist

**Configuration**
- [ ] `ENV=production`, `LOG_LEVEL=INFO`, `JWT_SECRET` from a secrets manager (≥ 32 chars, not the
      dev default — the app refuses to start otherwise).
- [ ] `MONGO_URI` points at a real replica set (not `memory://`; refused in production),
      `MONGO_DB_NAME` set, `MONGO_SERVER_SELECTION_TIMEOUT_MS` ≤ 10000.
- [ ] `FRONTEND_ORIGIN` is the exact public origin (no trailing slash, not localhost), and
      `COOKIE_SAMESITE=lax` (or `none` with `COOKIE_SECURE=true` and HTTPS).
- [ ] `OPENROUTER_API_KEY` + a model that supports structured outputs; `OPENAI_API_KEY` for voice.
- [ ] `AUTH_*` rate limits sized for expected traffic.

**Host / runtime**
- [ ] `ffmpeg` and `ffprobe` installed in the API image (`apt-get install -y ffmpeg`) — without them
      the Delivery dimension reports "Not available".
- [ ] `node_modules` present before building the frontend; the `prebuild` script copies the
      MediaPipe runtime into `public/mediapipe/wasm`.
- [ ] For offline/air-gapped deployments, self-host the face landmarker model and set
      `NEXT_PUBLIC_FACE_LANDMARKER_MODEL_URL`.

**Platform**
- [ ] TLS terminated at the proxy; HSTS enabled there (`frame-ancestors`/HSTS belong at the edge,
      where the real domains are known).
- [ ] Reverse-proxy body limit ≥ `MAX_REQUEST_BYTES` (default 25 MB); the app-level guard stays on.
- [ ] Health checks: `/health` (liveness), `/ready` (readiness — 503 until MongoDB answers).
- [ ] MongoDB backups + point-in-time recovery; the API is the only writer.
- [ ] Log aggregation for the API (provider failures are logged with context, never returned).

**Before announcing**
- [ ] `cd backend && python -m scripts.smoke_test_ai` — all seven steps produce sensible output.
- [ ] Manual browser pass in Chrome and Safari: signup → create interview → upload resume + JD →
      start → answer by text → answer by voice → confirm the transcript → complete → generate the
      report → verify Delivery (voice) and Webcam (camera) scores appear and match what you did.
- [ ] Camera denied → report says "Not available" for webcam (no fabricated number).
- [ ] Two tabs, one interview: submitting in both doesn't duplicate turns (expect a 409 on the
      stale one).
- [ ] Restore a backup into staging and confirm a login works.
