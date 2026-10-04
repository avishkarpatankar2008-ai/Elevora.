# ELEVORA

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

No AI provider keys? Outside production the API falls back to a built-in
offline demo AI, so the whole flow (start → adaptive questions → answers →
scored report) still works end-to-end; the UI says so with a demo-mode
notice, and voice stays honestly unavailable. Set `OPENROUTER_API_KEY` (and
`OPENAI_API_KEY` for voice) to switch to the real providers — see
`elevora/README.md` → "AI keys and the offline demo mode".
