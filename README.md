# ELEVORA

<<<<<<< HEAD
Adaptive AI interview practice platform: auth, dashboard, interview
configuration, a text/voice AI interviewer, an interview room with on-device
webcam analytics, resume/JD grounding, reusable **Interview Profiles**, and
evidence-linked performance reports scored by a deterministic weighted model.

The numbers and claims in this README are the ones that were actually verified;
anything that isn't is listed as unverified with the exact steps to check it.
For the full engineering report of the production-readiness pass, see
[`PRODUCTION_READINESS_REPORT.md`](./PRODUCTION_READINESS_REPORT.md).

## Quick start

```bash
# 1. API
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env            # optional in dev; every value has a default
.venv/bin/uvicorn app.main:app --reload --port 8000
#   No MongoDB installed? Run it throwaway-style instead:
#   MONGO_URI=memory:// .venv/bin/uvicorn app.main:app --reload
#   (development only — refused outright when ENV=production)

# 2. Web client
cd ../frontend
npm install
npm run dev                     # http://localhost:3000

# Production build (next.config.js uses output: "standalone")
npm run build
npm start                       # scripts/start-standalone.mjs — see note below
```

`npm start` runs the standalone server after copying `public/` and
`.next/static` beside it, which is what the Dockerfile does too. Plain
`next start` is **not** used: Next.js does not support it with
`output: "standalone"`, and it silently serves only a subset of routes (the
rest 404).

The browser only ever talks to the Next.js origin: `/api/*` is proxied
server-side to `BACKEND_ORIGIN` (default `http://127.0.0.1:8000`), so the session
cookie stays first-party and there is no CORS to configure. Configure at least one of
`GROQ_API_KEY`, `GEMINI_API_KEY`, or `OPENROUTER_API_KEY` to enable live AI. Text
requests follow the fixed six-model free-only chain documented below; when no model
is configured or all available models are unavailable, schema-safe deterministic
fallbacks keep the core practice workflow usable and mark assessment as requiring
manual review. Voice-answer transcription uses Groq Whisper; question playback uses
the browser's Web Speech API (no server-side TTS call).

## Verification status for this revision

Checks below were run in the current editing environment on 2026-10-19. Do not treat results from an earlier readiness pass as validation of these routing or webcam changes.

| Check | Result | Scope / limitation |
|---|---|---|
| Python compilation for backend application and tests | Passed | `python -m compileall -q backend/app backend/tests` |
| Free-only router + deterministic scoring tests | **34 passed** | Targeted unit tests run with `--noconftest` and a temporary local OpenAI SDK stub because the real SDK/test dependencies could not be installed; no live provider requests were made |
| Full backend pytest suite | Blocked | The runtime lacks `mongomock_motor`; package installation could not reach package indexes in this environment |
| Frontend type-check, Vitest, lint, production build | Blocked | `frontend/node_modules` is absent. `npm run typecheck` fails with missing React, Next/MediaPipe and other package declarations; this is an environment dependency failure, not a successful check |
| Real Groq, Gemini and OpenRouter requests | Not run | No provider credentials or outbound provider connectivity available for a live API verification |
| Webcam/posture behavior in a browser | Not run | No browser/camera runtime available; a manual camera-consent and model-load check remains required |

The targeted tests cover the model allowlist, primary-provider selection, sequential failover after malformed output, 429 cooldown behavior, bounded timeout retries, deterministic fallback when providers fail or are cooling down, TTS being disabled server-side, and the fact that posture metrics do not affect the score. Run the commands under `backend/` and `frontend/` after installing their locked dependencies to finish verification.

## A scope decision you should know about: I did not build realtime/WebRTC

The build brief says Phase 3 is "microphone-based interviewing using
realtime voice/WebRTC." I did not build that. Here's what I built instead,
and why.

The product spec's own Week 3 section recommends **not** starting with
realtime WebRTC:

> "Do NOT start with the most complicated architecture. Step A: Record →
> Upload audio → Transcribe → Analyze → Generate text response → TTS → Play
> response. Step B: upgrade to realtime."

And its own mistake list: *"Mistake 4 — Overengineering voice: Get a
functional voice loop first. Optimize latency later."*

I built **Step A**: record a full answer in the browser, upload it, transcribe
it with Groq Whisper, run it through the same Phase 2 engine, then use the
browser's Web Speech API to read the next question aloud. Not **Step B** (a persistent WebRTC connection
doing live streaming speech-to-speech).

The honest reason, beyond following the spec's own sequencing advice: Step B
requires a browser, a microphone, and a live network connection to a
realtime speech endpoint to build against at all — none of which exist in the
sandbox this was built in. Writing WebRTC signaling and audio-streaming code
with zero ability to run it isn't a smaller version of the feature, it's a
guess at the feature. Step A is at least testable in the ways that matter
(the engine logic, end to end except the actual OpenAI calls); a blind
WebRTC implementation would just be more unverified surface area with a much
higher chance of being subtly wrong in ways neither of us could catch here.

If you want true realtime after trying this: the migration path is
`answer_audio_endpoint` gets replaced by a WebSocket/WebRTC session that
streams audio both ways, but `submit_answer()` and everything in
`interview_engine.py` stays exactly as it is — the engine doesn't know or
care whether text arrived by typing, file upload, or a live stream.

## What Phase 5 actually does

- **Upload**: `POST /interviews/{id}/resume` (PDF or .docx, magic-byte
  validated, 8MB cap) and `POST /interviews/{id}/job-description` (pasted
  text **or** a file — job postings are usually copy-pasted, so both paths
  are supported rather than forcing an upload). Both are restricted to
  `draft` interviews, matching the spec's own flow: configure → upload →
  start.
- **Extraction**: raw text goes through the schema-validated free-only AI router into a
  `CandidateProfile` (skills, education, experience, projects, technologies,
  achievements, claims) or `JobProfile` (role, company, industry, required/
  preferred skills, responsibilities, seniority) — the exact shapes from the
  spec's DB structure section. The extraction prompt is explicit: empty
  list if a section isn't present, never invent a skill or employer that
  isn't in the text.
- **The extracted profile is shown back to the candidate immediately**
  (`ResumeJdUpload` component) before the interview starts — every skill,
  project, and claim it found, nothing summarized or hidden. This is the
  practical version of the spec's anti-hallucination information-class
  distinction (verified / candidate-provided / AI-inference / unknown):
  showing the extraction lets the candidate catch a wrong or invented item
  before it ever reaches a question.
- **Grounding**: once uploaded, every question-generation call (opening
  question, later baseline questions, follow-ups) includes a
  "CANDIDATE-PROVIDED BACKGROUND" and/or "JOB DESCRIPTION CONTEXT" block in
  the system prompt, with an explicit instruction to reference a specific
  project/skill/claim by name when relevant to the current topic, and to
  never attribute anything not in that block. Tests confirm the content
  actually reaches the prompt (see the table above) — they can't confirm
  the model uses it well, only that it has the chance to.

## A deliberate deviation: no separate `candidate_profiles`/`job_profiles` collections

The spec's DB structure section defines these as their own collections with
their own `userId`/`resumeId` fields, implying resumes could be reused
across multiple interviews. This build stores `candidateProfile` and
`jobProfile` embedded directly on the interview document instead — same
pattern as all the other interview-scoped state since Phase 2. Trade-off:
no "reuse my resume for a new practice session" feature; uploading again is
currently the only path. If resume reuse becomes a real feature request,
that's when these become first-class objects — not before, per the spec's
own guidance against building ahead of demonstrated need.

## What Phase 5 deliberately does not do

- **No raw file storage.** The uploaded PDF/DOCX is parsed in-memory and
  discarded — only the extracted structured profile is persisted. No
  Cloudflare R2/Supabase integration exists yet, and skipping it here
  keeps PII exposure minimal (the spec's own privacy principle: "collect
  minimum required data"). It also sidesteps several of the spec's file-
  security checklist items entirely (random filenames, expiring unused
  files) because there's no stored file to protect.
- **No OCR.** A scanned resume with no text layer fails extraction with a
  clear error rather than silently returning nothing.
- **No prompt-injection hardening beyond "treat it as data."** The
  extraction prompts don't have special defenses against a resume that
  contains something like "ignore previous instructions" — they rely on
  the structured-output schema constraining what can come back (only the
  seven CandidateProfile fields, all string arrays) rather than trying to
  detect injection attempts. Worth revisiting if this becomes a public-
  facing product; low-risk for an MVP where the uploader is the same
  person the extraction is about.

## What Phase 6 actually does

- **`POST /interviews/{id}/report`** generates a report from the completed
  transcript; **`GET`** returns the cached one. Restricted to `completed`
  interviews — `abandoned` sessions are explicitly not scored (matches the
  copy already shown in the Phase 4 abandoned-interview view).
- **Five dimensions scored 0-5 with mandatory evidence**: Knowledge,
  Communication, Relevance, Problem Solving, Interview Handling. The schema
  requires an evidence string for every score — there's no way for the
  model to return a bare number.
- **Delivery and Webcam are always "not available," never faked.** Real
  speech-timing and facial-metrics analytics are Phase 7/8, not built yet.
  Rather than asking the model to guess at a pace/eye-contact score with no
  underlying data (which would be exactly the "random AI score" the spec
  warns against), those two dimensions carry `score: null` and an evidence
  string explaining why — visible in the UI as "Not available" with a
  hatched bar, not hidden or defaulted to a misleading number.
- **Deterministic weighting, not an AI-picked 0-100.** The model scores five
  0-5 dimensions; a plain Python function (`compute_weighted_score`)
  combines them into the final 0-100 using per-category weight profiles
  (technical/behavioral/general), renormalizing weights among whatever
  dimensions are actually available rather than treating a missing one as
  a zero. This is the highest-confidence code in the whole project — see
  the table above.
- **Confidence is computed, not self-rated.** `low`/`medium`/`high` comes
  from turn count and topic breadth (a fact about the transcript), not from
  asking the model how confident it feels (a notoriously unreliable thing
  to ask an LLM to judge about its own output).
- **Report generation is a deliberate user action**, not automatic on
  completion. The results page shows a "Generate report" button rather than
  silently running the evaluation call — sending the full transcript to the
  AI evaluator is a real API call, and the person should decide when that
  happens rather than it firing the moment they finish answering.

## What Phase 7 actually does

- **Speech analytics** (`app/services/speech_analytics.py`): for every voice
  answer, computes real duration, words-per-minute, pause count/average/
  longest (via ffmpeg silence detection), filler word count/rate
  (language-configurable vocabulary, defaults to English), and immediately-
  repeated-word count — all from the actual audio, decoded before it's
  discarded (this project never stores raw audio or video, see Phase 5's
  equivalent decision about resumes).
- **Webcam analytics** (`lib/webcamAnalytics.ts` + `POST
  /interviews/{id}/webcam-metrics`): face-visible rate, an approximate
  "looking away" rate, and a movement rate — computed **client-side** via
  MediaPipe's FaceLandmarker, exactly matching the spec's own preferred
  architecture (Camera → Browser → MediaPipe → aggregate metrics → Backend,
  never raw frames uploaded). Only the final aggregate numbers ever reach
  the server.
- **Delivery and Webcam are now scored deterministically, not by AI**
  (`app/services/deterministic_scoring.py`). Both dimensions are pure,
  objective numbers — there's nothing for a language model to interpret
  that a threshold rule can't, and asking one to would risk exactly the
  kind of overclaiming ("sounds nervous") the spec prohibits. Every score
  cites the specific numbers behind it (e.g. "pace was 135 WPM, within a
  comfortable range; filler words made up 1.8% of words spoken, low").
- **Both dimensions genuinely say "Not available" when the data doesn't
  exist** — an all-text interview has no Delivery score (no audio to
  measure), and a session where the camera was never enabled or the
  client-side measurement didn't complete has no Webcam score. Nothing is
  estimated or defaulted to fill the gap.

## The MediaPipe integration is the least-verified code in this project — more than the other browser APIs

Every other piece of unverified browser code in this project (`VoiceControls`,
`CameraPreview`) wraps simple, long-stable Web APIs — `getUserMedia` and
`MediaRecorder` haven't meaningfully changed in years, and I have high
confidence in those calls independent of any package version.

`lib/webcamAnalytics.ts` is different: it depends on a specific version of
`@mediapipe/tasks-vision`, an actively-developed ML package, plus a model
file hosted on a Google Cloud Storage URL. What I could verify: this
sandbox has no camera but does have `npm`, so I installed the real package
and read its actual `.d.ts` type definitions rather than relying on
training data — the method names, option shapes (`FilesetResolver.
forVisionTasks`, `FaceLandmarker.createFromOptions`, `detectForVideo`,
`outputFacialTransformationMatrixes`) are confirmed correct as of the
installed version, and the whole thing type-checks and builds. What I
could NOT verify: whether the model actually downloads and runs correctly
in a real browser against a live camera feed.

The head-orientation math deserves its own callout. Extracting a signed
yaw/pitch/roll from MediaPipe's facial transformation matrix requires
knowing its exact row-major-vs-column-major convention and axis signs —
get that wrong and "looking left" silently reads as "looking right,"
forever, with no error to catch it. Instead, `estimateForwardAlignment()`
reads a single diagonal matrix entry, which represents the same value
regardless of row/column-major convention (transposing a matrix doesn't
change its diagonal), and uses it as a magnitude ("how far from facing the
camera") rather than a signed direction. This trades precision for
robustness against exactly the kind of silent, uncatchable bug this
sandbox has no way to detect. Full reasoning is in the file's own comments.

**If webcam analytics don't work when you test this**, the failure mode is
designed to be safe: everything in `lib/webcamAnalytics.ts` is wrapped in
try/catch that fails silently, so a broken integration means Webcam stays
"Not available" on the report — it should never break the interview itself.
If it does break something else, that's a real bug to report, not an
intended fallback.

## Local setup and checks

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m pytest -q              # prior baseline: 233 passed (72s, 2026-10-03; not current routing/posture validation)
.venv/bin/python -m scripts.smoke_test_ai  # real provider calls; needs keys
```

**pydub needs ffmpeg/ffprobe installed on the system** (not just pip-installed)
to decode real audio — `apt-get install ffmpeg` on Debian/Ubuntu, `brew install
ffmpeg` on macOS. Without it, `answer_audio_endpoint` still works (transcription
doesn't need it) but speech metrics silently won't compute for any turn — that
is the graceful-degradation path working as designed, and the audio-dependent
tests skip themselves with an explicit reason instead of failing with a pydub
traceback.

```bash
cd frontend
npm install
npm run typecheck   # tsc --noEmit
npm run lint        # next lint (app, components, lib, tests)
npm test            # vitest run — 35 tests
npm run build       # prebuild copies the MediaPipe WASM runtime, then builds
```

Every backend variable (and its default) is documented in
`backend/.env.example`; the frontend's are in `frontend/.env.local.example`.

## Design system

The interface is one dark system — deep navy surfaces, soft blue and plum
accents — defined once and consumed everywhere:

- `frontend/tailwind.config.ts` is the source of truth for colour, radius,
  shadow, motion and type scale. Colours are declared as RGB triplets in
  `frontend/app/globals.css` so Tailwind's alpha modifiers work on every token
  (`bg-navy-950/60`, `border-plum/30`).
- Palette: `#0B1B32` canvas, `#0D1E4C` / `#102746` / `#132D4A` surfaces,
  `#26415E` elevated, `#83A6CE` primary, `#C48CB3` accent, `#E5C9D7` blush,
  `#F7F4F6` / `#C7D1DD` / `#93A3B8` text. Contrast ratios are recorded next to
  the tokens in the config; the lowest text pairing measures ≈5.4:1.
- Four surface levels (page → card → elevated → glass) plus `.glass` /
  `.glass-strong` for the navbar, the interview-room dock and floating panels.
- Reusable primitives live in `frontend/components` (`Button`, `Card`, `Input`,
  `Select`, `Textarea`, `Alert`, `Badge`, `Skeleton`, `EmptyState`, `ScoreRing`,
  `StatCard`); interview-room pieces are in `components/interview/`.
- Motion is 150–300 ms with a spring-like curve, and everything collapses under
  `prefers-reduced-motion: reduce`. Colour is never the only signal (state
  changes carry text, icons and ARIA).
- Green appears only as a genuine system status (for example "Camera active");
  it is never used decoratively.
- Icons are inline stroke SVGs (1.6–2px stroke, `currentColor`) in a single
  visual language, so the app carries no icon-library dependency and every icon
  inherits the palette and focus state.

## Known gaps carried over

- **No logo asset was ever attached** — `Logo.tsx` uses an inline SVG mark.
- No password reset, email verification, or account deletion yet.
- API rate limiting is per process; a multi-worker deployment needs a shared
  store (Redis) for it to be global.
- Interview history loads up to 200 interviews per request and its search,
  filter and sort run client-side over that page — there is no server-side
  search or paging UI yet.
- Realtime/WebRTC voice — see the Phase 3 scope decision above.
- No raw resume/JD file storage, no resume reuse across interviews.
- Delivery/Webcam scoring thresholds are reasonable starting points, not
  calibrated against real recordings — expect to tune them.
- The webcam analytics pipeline has never run against a real camera — see
  the dedicated section above before relying on it for anything.

## Recap: what Phases 1–5 already do

- **Auth**: JWT in an HTTP-only cookie. **Interviews**: full CRUD, owned per user.
- **InterviewProfile**: a small static lookup (`app/services/profiles.py`) mapping
  each interview category to subjects, question types, and an interviewer
  style — a deliberate stand-in for the full reusable profile system the
  spec describes for Phase 8/9.
- **Question generation / answer analysis**: one question at a time through the
  six-model free-only router with strict schema validation; each answer scored 1–5 with strengths,
  weaknesses, and a follow-up decision, mirroring the spec's Day-9 shape.
- **Conversation state**: stored on the interview document — topic,
  difficulty (1–5, adaptive ±1 per turn), asked topics/questions, follow-up
  counts. Completed turns live in `interview_turns` (`GET
  /interviews/{id}/turns` returns the transcript).
- **Repeat-question prevention**: cheap word-overlap check, one retry on
  collision — no embeddings, per the spec's own guidance not to reach for
  those yet.
- **The follow-up decision is deterministic, not model-chosen**: the model
  suggests `followUpNeeded`; a plain Python function decides whether to act
  on it. Separates deterministic logic (state, budgets) from probabilistic
  logic (phrasing, judgment), per the spec's own architecture rule.
- **No live score is shown to the candidate mid-interview** — evaluations
  are stored for the Phase 6 report, not surfaced as a running scoreboard.
- **Voice (Phase 3)**: STT uses Groq Whisper, while question playback uses
  browser Web Speech. Server-side TTS is disabled in free-only mode; the legacy
  `AIClient` method remains for interface compatibility. Transcript is always surfaced to the
  candidate rather than hidden. Text input stays available alongside voice
  as a fallback when the browser or Groq transcription service is unavailable.
- **Webcam (Phase 4 and posture extension)**: consent-gated on-device face and
  pose analysis in the interview room, with only aggregate metrics eligible for
  submission. Camera use is optional and disabled until explicit per-session
  consent. The timer remains informational — the engine ends by question count,
  not wall clock. Exiting early (`POST /interviews/{id}/exit`) marks the interview
  `abandoned` rather than deleting it, so a partial transcript survives.
- **Resume/JD (Phase 5)**: PDF/DOCX parsed locally (genuinely tested, not
  mocked) into `CandidateProfile`/`JobProfile` via the schema-validated free-only AI
  router, shown back to the candidate before the interview starts so a
  hallucinated extraction is catchable early. Once uploaded, every
  question-generation call includes the resume/JD content and is
  instructed to ground questions in it by name. Review each provider's data handling
  terms first: free-tier APIs may log or use prompts for service improvement. Stored embedded on the
  interview document rather than the spec's separate
  `candidate_profiles`/`job_profiles` collections — no raw file storage,
  no cross-interview resume reuse yet.

Endpoints so far:

```
POST   /auth/register, /auth/login, /auth/logout      GET /auth/me
POST   /interviews          GET /interviews           GET/DELETE /interviews/{id}
POST   /interviews/{id}/start                          — generates the opening question
POST   /interviews/{id}/answer      body: {"answer"}   — text answer -> next question or completion
GET    /interviews/{id}/turns                          — full transcript
GET    /interviews/{id}/question-audio                 — legacy server-TTS route (disabled in free-only mode; use browser speech)
POST   /interviews/{id}/answer/audio  multipart file    — voice answer -> same engine as text (Phase 3)
POST   /interviews/{id}/exit                           — leave early, marks abandoned (Phase 4)
POST   /interviews/{id}/resume         multipart file   — extract + store CandidateProfile (Phase 5)
POST   /interviews/{id}/job-description  text or file   — extract + store JobProfile (Phase 5)
POST   /interviews/{id}/report                         — generate the evaluation report (Phase 6)
GET    /interviews/{id}/report                         — retrieve the cached report (Phase 6)
POST   /interviews/{id}/webcam-metrics                 — submit client-computed aggregate (Phase 7)
```

Evaluation (Phase 6) recap: five dimensions AI-scored 0-5 with mandatory
evidence (Knowledge, Communication, Relevance, Problem Solving, Interview
Handling); weighting/normalization to a 0-100 overall score is pure,
tested Python, not an AI-picked number; `confidence` is computed from turn
count, not self-rated by the model. Phase 7 adds real Delivery/Webcam
scores on top of that foundation — see above.

Before production use, run `python -m scripts.smoke_test_ai` from `backend/` with one or more dedicated free-tier keys. The smoke test makes live calls; those calls were not available in this editing environment. The router code is covered by scripted unit tests, not by current provider integration tests.

## Phase 8 — Interview Profiles

Phase 2 already anticipated this: `app/schemas/profile.py`'s docstring says
outright that the real, storable `InterviewProfile` system was "Phase 8/9
work," and the Phase 2 `CATEGORY_DEFAULTS` lookup in
`app/services/profiles.py` was an explicit stand-in for it. Phase 8 is that
upgrade — a new database-backed collection, a CRUD API, and an engine that
reads engine controls (max questions, follow-ups, adaptive difficulty,
resume/JD grounding) from a stored profile instead of hardcoded constants.
Nothing about how the engine keeps interview state (still plain,
deterministic Python — see Phase 2's notes) changed; only *where its
configuration comes from* did.

### Architecture

A **system profile** (`isSystem: true`, `createdBy: null`) is one of the six
seeded defaults, visible to everyone, editable/deletable by no one. A
**custom profile** (`isSystem: false`) belongs to the user who created it
(`createdBy: <userId>`) — visible and editable only to them.

```
InterviewProfile
├── name, description, category         — identity/display
├── subjects[], questionTypes[]         — what the engine asks about
├── interviewerStyle                    — tone in the system prompt
├── difficulty                          — easy | medium | hard | adaptive (informational default)
├── maxQuestions                        — overrides the duration-based heuristic when set
├── followUpEnabled                     — engine skips the follow-up branch entirely when false
├── adaptiveDifficulty                  — engine holds difficultyLevel fixed when false
├── resumeGrounding / jdGrounding       — engine withholds candidate/job context when false
├── isActive                            — false after a soft delete
├── isSystem, createdBy                 — ownership/protection
└── createdAt, updatedAt
```

`app/services/profiles.py` now exposes `load_profile(db, interview)`,
called from both `interview_engine.py` and `evaluation.py`. It's the single
place that decides, per interview:

- **Has a `profileId`, and that profile still exists?** → build the prompt
  profile from the stored document, and hand back its engine-control flags.
- **No `profileId` (or it points at a profile that's gone)?** → fall back to
  the original Phase 2 `derive_profile()` category lookup, with legacy
  engine defaults (`maxQuestions=None` → duration heuristic,
  `followUpEnabled/adaptiveDifficulty/resumeGrounding/jdGrounding=True`).

That fallback is what makes every interview created before Phase 8 — which
has no `profileId` field on its Mongo document at all — behave exactly as
it did in Phase 7, with zero migration required.

### API

| Method | Path | Notes |
|---|---|---|
| `POST` | `/interview-profiles` | Creates a custom profile owned by the caller. |
| `GET` | `/interview-profiles` | Lists active system profiles + the caller's own active custom profiles. |
| `GET` | `/interview-profiles/{id}` | 404 if the profile is inactive, or is another user's custom profile. |
| `PATCH` | `/interview-profiles/{id}` | Owner-only; 403 on a system profile, 404 if not visible. Partial updates only. |
| `DELETE` | `/interview-profiles/{id}` | Owner-only; **soft delete** (`isActive: false`) — see below. 403 on a system profile. |

`POST /interviews` now accepts `profileId` as an alternative to `category`
(at least one is required). When `profileId` is given, `category` is
backfilled from the profile automatically (used for display and for the
existing report-weighting heuristic in `evaluation.py`); the interview
document stores both `profileId` and the resolved `category`.

### Why deletion is soft, not hard

An in-progress or completed interview keeps its `profileId` forever, and
`load_profile()` still needs to resolve it to regenerate a report or (for an
in-progress interview) ask the next question. A hard delete would silently
fall back to the wrong (generic "other") profile mid-interview. So
`DELETE` sets `isActive: false`: the profile disappears from the picker and
from `GET`/`PATCH`/`DELETE`, but `load_profile()` — which queries
`interview_profiles` directly, not through the visibility helper — still
finds it.

### Database structure

New collection: `interview_profiles`, indexed on `(isSystem, name)` (used by
idempotent seeding) and `createdBy` (used by the "my profiles" list).
`interviews` gains one new, optional field: `profileId: string | null`.

### Seeding

Seeding is idempotent and runs automatically on every app startup
(`app/main.py`'s lifespan, right after `ensure_indexes`) via an atomic
`update_one(..., upsert=True)` keyed on `(name, isSystem)` — safe to restart
the app, or run multiple workers, without ever duplicating a system profile.

To seed explicitly (e.g. from deploy tooling, or against a specific
database) without booting the API:

```
cd backend
source venv/bin/activate
python -m scripts.seed_interview_profiles
```

The six seeded profiles: **Software Engineer**, **Frontend Developer**,
**Backend Developer**, **Data Analyst**, **HR / Behavioral**, **System
Design**. Their full definitions live in
`app/services/interview_profiles.py::DEFAULT_PROFILES`.

### Custom profiles

From `/interview-profiles` in the app, any signed-in user can build their
own, e.g.:

```
name: "My Full Stack Interview"
subjects: React, Node.js, MongoDB
questionTypes: technical, scenario, behavioral
difficulty: adaptive
maxQuestions: 10
```

Selecting it on `/interviews/new` and starting the interview actually
changes behavior: `interview_engine.py` reads `subjects`/`questionTypes`
into the AI prompts, honors `maxQuestions` over the duration heuristic, and
switches off follow-ups / difficulty adaptation / resume / JD grounding
per-flag — all covered by `tests/test_interview_profiles.py`'s engine-level
tests, not just the CRUD surface.

### What's next

Interview Profiles were the last piece both the build brief and the
roadmap PDF group under "universal interview framework." What's left is
Beyond the current scope — the brief doesn't specify it further from here, so the
natural candidates (multi-profile interview packs, org-shared profiles,
profile analytics) are open design questions, not committed work.

## Free-only AI routing and webcam privacy

Text requests use this **fixed six-model order** (model IDs are not environment-overridable):

1. **Groq primary:** `openai/gpt-oss-120b`
2. Gemini API: `gemini-3.6-flash`
3. Gemini API: `gemini-3.5-flash-lite`
4. OpenRouter: `minimax/minimax-m3:free`
5. OpenRouter: `deepseek/deepseek-r1:free`
6. OpenRouter: `google/gemma-4-26b-a4b-it:free`

These IDs and free-tier listings were checked against provider documentation on **2026-10-19**:
[Groq model catalogue](https://console.groq.com/docs/models), [Groq free-plan limits (including Whisper Large V3 Turbo)](https://console.groq.com/docs/rate-limits), [Groq speech-to-text documentation](https://console.groq.com/docs/speech-to-text), [Gemini pricing and free-tier eligibility](https://ai.google.dev/gemini-api/docs/pricing), [MiniMax M3 free endpoint](https://openrouter.ai/minimax/minimax-m3:free), [DeepSeek R1 free endpoint](https://openrouter.ai/deepseek/deepseek-r1:free), and [Gemma 4 26B A4B free endpoint](https://openrouter.ai/google/gemma-4-26b-a4b-it:free). Providers can retire models or change quotas and eligibility; re-check these pages before a production release.

The router uses sequential failover, bounded retries for transient failures, per-model and provider-wide rate-limit cooldowns, structured-output validation, an in-process concurrency semaphore and a bounded TTL cache. It never substitutes a paid model ID or retries a 429 immediately. If all configured models fail (or none is configured), it returns deterministic, schema-valid fallback content. Evaluation fallbacks use neutral scores and explicitly say that the dimension was not assessed; review them manually. Quota counters and concurrency/cooldown state are **per process**, so multiple backend workers do not share them. Provider quotas remain authoritative; this code neither bypasses nor resets them.

**Free-tier caveat:** API keys may be tied to paid billing even when a model has a free variant; the server cannot introspect a provider account's billing status. Use dedicated free-tier projects/keys and do not attach billing if zero cost is mandatory. Google and OpenRouter free-tier/provider privacy terms differ. OpenRouter itself states that model providers may retain or use submitted input/output according to their own policies; review the current provider terms before sending real CVs, contact details, or other confidential interview data. The model allowlist prevents paid model selection, not provider-side data use or account billing mistakes.

**Optional on-device posture estimation:** each interview starts with the camera off and an unchecked, per-session consent box. After consent, MediaPipe face and pose landmarks are processed in the browser. Raw video and frame-level landmarks are not uploaded or stored; only validated aggregate rates are submitted. The session summary reports head/shoulder and torso geometry, camera framing, landmark confidence, and visible position changes descriptively. The posture fields do not affect the webcam score. They are not measures of honesty, emotion, intelligence, personality, engagement, or suitability. `sittingPostureRate` is only an upright-torso proxy and cannot prove someone is sitting. Users can revoke consent mid-session; doing so turns the camera off and discards collected measurements. Interviews continue normally without a camera.

## Deployment

```bash
cd elevora
cp backend/.env.example backend/.env      # fill in real values
docker compose up --build                 # mongo + api + web
```

`docker-compose.yml` wires the three services (MongoDB 7, the API image which
installs ffmpeg, and the standalone Next.js server that proxies `/api/*`).
Build the images with Docker available locally; the images could not be built
in the sandbox this pass was written in.

**Behind your own proxy/infrastructure** — the short version:

1. API: `ENV=production`, a real `JWT_SECRET` (≥ 32 chars), `MONGO_URI`,
   `FRONTEND_ORIGIN`, and provider keys. Any one of `GROQ_API_KEY`,
   `GEMINI_API_KEY`, or `OPENROUTER_API_KEY` enables its configured slice of the
   chain; set **all three** to make all six model entries eligible for failover.
   Use dedicated free-tier credentials with no paid billing attached. The app
   refuses to start if the production configuration is unsafe. Install `ffmpeg`/`ffprobe`
   in the image or speech metrics stay unavailable.
2. Web: `BACKEND_ORIGIN` pointing at the API service; the `prebuild` script
   copies the MediaPipe runtime into `public/mediapipe/wasm`.
3. Terminate TLS at the edge and add HSTS/`frame-ancestors` there (the app can't
   know your domains). Keep the proxy body limit ≥ `MAX_REQUEST_BYTES`.
4. Health checks: `/health` (liveness) and `/ready` (readiness, 503 until Mongo
   answers). `/ready` is what a load balancer should poll.
5. Verify before announcing: `python -m scripts.smoke_test_ai`, then a manual
   browser pass (signup → resume/JD → text answer → voice answer → complete →
   report) in Chrome and Safari. The full checklist is in
   [`PRODUCTION_READINESS_REPORT.md`](./PRODUCTION_READINESS_REPORT.md#9-production-deployment-checklist).

## Security notes

- Sessions are HTTP-only cookies; `Secure` whenever `ENV != development`, and
  `SameSite=None` is rejected unless the cookie is also Secure.
- `/auth/login` and `/auth/register` are rate-limited per client + email.
- Every interview endpoint is scoped to its owner and returns 404 (not 403) for
  someone else's interview.
- Uploads are capped and validated by content type *and* magic bytes; PDF/DOCX
  text is parsed, never executed.
- Resume, JD, and answer text are treated as untrusted data: they are wrapped in
  `<untrusted_*>` blocks with injection markers neutralized, and the system
  prompts state that the block must never be followed as instructions.
- Provider errors are classified and mapped to fixed user-safe messages; the raw
  error never reaches the client. Logs are server-side only.
- Webcam frames never leave the browser — the API has no endpoint that accepts
  image or video data, only the three aggregate rates.
=======
Adaptive AI interview practice platform — practice the interview you actually have:
voice or text answers, adaptive follow-up questions, resume/job-description grounding,
and evidence-linked performance reports.

The application lives in [`elevora/`](./elevora):

| Path | What it is |
|---|---|
| `elevora/backend/` | FastAPI + MongoDB API (auth, interview engine, AI services, speech analytics, scoring) |
| `elevora/frontend/` | Next.js 14 (App Router) client |
| `elevora/README.md` | Setup, architecture, verification status, deployment |
| `elevora/PRODUCTION_READINESS_REPORT.md` | The engineering report for the production-readiness pass |

Quick start:

```bash
# API (MongoDB required unless you use the documented development memory mode)
cd elevora/backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload            # or MONGO_URI=memory:// ... for a throwaway store

# Web client
cd ../frontend
npm install
npm run dev                                        # http://localhost:3000, proxies /api/* to the API
```
>>>>>>> ce83036ce2e4dac593c418de2151ed08d41b3038
