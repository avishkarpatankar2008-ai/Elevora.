import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/Button";
import { InterviewPreview } from "@/components/InterviewPreview";
import { INTERVIEW_CATEGORIES } from "@/lib/types";

/* ------------------------------------------------------------------ data */
const FEATURES = [
  {
    title: "Adaptive by design",
    body: "Every answer changes the next question. Probe, challenge, redirect or advance — automatically, within the profile you chose.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Grounded in your material",
    body: "Upload a resume and a job description. Questions come from what you actually submitted, never invented experience.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 12h6m-3-3v6m-4 5h8a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H8a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Evidence, not vibes",
    body: "Every score in your report points at something you said. Measurements the platform doesn't have stay labelled unavailable.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 11 12 14l8-8m-1 5v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Voice or text, your call",
    body: "Speak naturally and get a scored transcript, or type when you prefer. Both paths are evaluated on the same rubric.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0m-7 7v4m-3 0h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const STEPS = [
  {
    number: "01",
    title: "Configure",
    body: "Choose a profile, difficulty, language and length — or upload a resume and job description to ground the session.",
  },
  {
    number: "02",
    title: "Interview",
    body: "Answer out loud or by text. The interviewer follows up, challenges claims, and adjusts difficulty in real time.",
  },
  {
    number: "03",
    title: "Review",
    body: "Read the evidence behind each dimension score. See concrete strengths, weaknesses, and what to practise next.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Is ELEVORA actually free?",
    a: "The platform runs on free-tier AI providers. You'll never be charged, but provider rate limits may occasionally slow response times during peak usage.",
  },
  {
    q: "What happens to my camera data?",
    a: "Camera frames are processed entirely in your browser using on-device pose estimation. Raw video is never uploaded or stored. Only aggregate posture metrics are saved — and only when you explicitly consent.",
  },
  {
    q: "How are interviews scored?",
    a: "Each answer is evaluated across multiple dimensions — knowledge, communication, relevance, problem solving, and interview handling. Every score is tied to specific evidence from your transcript.",
  },
  {
    q: "Can I practise for a specific company or exam?",
    a: "Yes. Configure the interview engine for your target role, company, exam (UPSC, MBA, banking, etc.), experience level, and difficulty. You can also create reusable interview profiles.",
  },
  {
    q: "Do I need a microphone?",
    a: "No. You can type your answers instead. Voice answers are transcribed and scored on the same rubric as text — neither mode has an advantage.",
  },
];

/* ------------------------------------------------------------------ page */
export default function LandingPage() {
  return (
    <div className="overflow-hidden">
      {/* Hero ============================================================ */}
      <section className="relative min-h-[90vh] bg-navy-950">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[560px] grid-bg" />
        {/* Ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 55% at 15% 0%, rgba(108,60,255,0.12), transparent 62%), radial-gradient(50% 50% at 85% 5%, rgba(131,166,206,0.14), transparent 60%)",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pb-28">
          <div className="grid items-center gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
            <div className="max-w-xl">
              <Badge tone="blue" className="animate-fade-up">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-blue" />
                AI-powered interview practice
              </Badge>

              <h1 className="mt-8 animate-fade-up font-display text-display-xl tracking-[-0.055em] text-ink">
                Practice
                <br />
                smarter
                <span className="onda-dot" />
              </h1>

              <p className="mt-6 max-w-lg animate-fade-up text-lead text-ink-soft">
                ELEVORA listens to your answers, adapts in real time, and shows you exactly what to
                improve — for roles, companies, exams and industries.
              </p>

              <div className="mt-10 flex flex-col gap-3 animate-fade-up sm:flex-row">
                <ButtonLink href="/signup" className="sm:w-auto w-full" size="lg">
                  Start practising
                  <span aria-hidden="true">→</span>
                </ButtonLink>
                <ButtonLink href="/login" className="sm:w-auto w-full" size="lg" variant="secondary">
                  Sign in
                </ButtonLink>
              </div>

              <p className="mt-6 text-xs text-ink-mute">
                No fabricated scores. No scripted interviews. Just your practice data.
              </p>
            </div>

            <InterviewPreview />
          </div>
        </div>
      </section>

      {/* Statement / value-prop =========================================== */}
      <section className="relative bg-navy-950 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-display-lg text-ink max-w-4xl">
            We make the practice people&nbsp;come&nbsp;back&nbsp;to
            <span className="onda-dot" />
          </h2>
          <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-16">
            <p className="text-lead text-ink-soft max-w-2xl">
              A real interview catches you off-guard — so practice should too. ELEVORA builds an
              adaptive session from your resume, your target role, and what you actually said thirty
              seconds ago. No two runs are the same.
            </p>
            <ul className="space-y-3">
              {["Resume-grounded questions", "Adaptive follow-ups", "Evidence-linked scoring", "Voice or text answers", "Optional posture feedback"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-ink-soft">
                    <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-blue to-plum" />
                    {item}
                  </li>
                )
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* Features ========================================================= */}
      <section className="border-y border-line bg-navy-950/60 py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="eyebrow">What sets it apart</p>
            <h2 className="mt-4 font-display text-hero font-semibold text-ink">
              Built for the interview you&nbsp;actually&nbsp;have
              <span className="onda-dot" />
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:gap-8">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-3xl border border-line bg-surface/40 p-6 backdrop-blur-sm transition-colors hover:border-line-strong hover:bg-surface/60 lg:p-8"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-navy-950/60 text-blue transition-colors group-hover:border-blue/30 group-hover:text-ink">
                  {feature.icon}
                </span>
                <h3 className="mt-5 text-lg font-semibold text-ink">{feature.title}</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-ink-soft">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories ======================================================= */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="eyebrow">One engine, any target</p>
          <h2 className="mt-4 font-display text-hero font-semibold text-ink">
            One engine, every interview you&nbsp;actually&nbsp;face
            <span className="onda-dot" />
          </h2>
          <p className="mt-4 text-ink-soft">
            Configure a single adaptive engine for your role, exam, company, experience level and
            difficulty — or build your own interview profile.
          </p>
        </div>
        <ul className="mt-8 flex flex-wrap gap-2">
          {INTERVIEW_CATEGORIES.map((category) => (
            <li
              key={category.value}
              className="rounded-full border border-line bg-white/[0.03] px-4 py-2 text-sm text-ink-soft transition-colors hover:border-blue/40 hover:text-ink"
            >
              {category.label}
            </li>
          ))}
        </ul>
      </section>

      {/* How it works ===================================================== */}
      <section className="border-t border-line bg-navy-950/40 py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
            <div>
              <p className="eyebrow">The loop</p>
              <h2 className="mt-4 font-display text-2xl font-semibold text-ink lg:text-3xl">
                Three steps, repeated until it&apos;s automatic
                <span className="onda-dot" />
              </h2>
            </div>
            <ol className="grid gap-5 sm:grid-cols-3">
              {STEPS.map((step) => (
                <li
                  key={step.title}
                  className="group rounded-3xl border border-line bg-surface/50 p-6 backdrop-blur-md transition-colors hover:border-line-strong"
                >
                  <span className="text-xs font-bold tracking-[0.2em] text-blue">{step.number}</span>
                  <h3 className="mt-4 text-base font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* FAQ ============================================================== */}
      <section className="border-t border-line py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div>
              <h2 className="font-display text-display tracking-[-0.035em] text-ink">
                Fair questions
                <span className="onda-dot" />
              </h2>
            </div>

            <div className="onda-faq divide-y divide-line">
              {FAQ_ITEMS.map((item) => (
                <details key={item.q} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5">
                    <span className="text-base font-semibold text-ink sm:text-lg">{item.q}</span>
                    <span className="faq-mark" />
                  </summary>
                  <p className="max-w-2xl pb-6 text-sm leading-7 text-ink-soft">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA ============================================================== */}
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-line-strong bg-panel-soft p-10 backdrop-blur-xl sm:p-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-violet/[0.14] blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-blue/[0.10] blur-3xl"
            />
            <div className="relative max-w-2xl">
              <p className="eyebrow">Your next interview starts here</p>
              <h2 className="mt-4 font-display text-2xl font-semibold text-ink sm:text-3xl lg:text-4xl">
                Stop rehearsing answers
                <span className="onda-dot" />
                <br />
                Start training judgement
                <span className="onda-dot" />
              </h2>
              <p className="mt-5 max-w-xl text-ink-soft">
                Build the skill to handle the unexpected question, not just the expected one.
                Camera-free. Voice or text. Always evidence-linked.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/signup" size="lg">Create your account</ButtonLink>
                <ButtonLink href="/login" size="lg" variant="secondary">
                  Sign in
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
