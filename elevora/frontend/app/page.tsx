import { Badge } from "@/components/Badge";
import { Button, ButtonLink } from "@/components/Button";
import { InterviewPreview } from "@/components/InterviewPreview";
import { INTERVIEW_CATEGORIES } from "@/lib/types";

const FEATURES = [
  {
    index: "01",
    title: "Adaptive by design",
    body: "Every answer changes the next question. Probe, challenge, redirect or advance — automatically, within the profile you chose.",
  },
  {
    index: "02",
    title: "Grounded in your material",
    body: "Upload a resume and a job description. Questions come from what you actually submitted, never invented experience.",
  },
  {
    index: "03",
    title: "Evidence, not vibes",
    body: "Every score in your report points at something you said. Measurements the platform doesn't have stay labelled unavailable.",
  },
];

const STEPS = [
  { title: "Configure", body: "Choose a profile, difficulty, language and length." },
  { title: "Interview", body: "Answer out loud or by text; the interviewer follows up." },
  { title: "Review", body: "Read the evidence behind each score, then practise again." },
];

export default function LandingPage() {
  return (
    <div className="overflow-hidden">
      {/* Hero ---------------------------------------------------------------- */}
      <section className="relative">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[560px] grid-bg" />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:px-8 lg:pb-24">
          <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
            <div className="max-w-xl">
              <Badge tone="blue" className="animate-fade-up">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-blue" />
                AI-powered interview practice
              </Badge>

              <h1 className="mt-6 animate-fade-up text-display font-bold text-ink">
                Practice smarter.
                <br />
                <span className="brand-text">Interview better.</span>
              </h1>

              <p className="mt-6 max-w-lg animate-fade-up text-base leading-7 text-ink-soft sm:text-lg">
                ELEVORA listens to your answers, adapts in real time, and shows you exactly what to
                improve — for roles, companies, exams and industries.
              </p>

              <div className="mt-8 flex flex-col gap-3 animate-fade-up sm:flex-row">
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

      {/* Features ------------------------------------------------------------ */}
      <section className="border-y border-line bg-navy-900/40">
        <div className="mx-auto grid max-w-7xl gap-px px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          {FEATURES.map((feature) => (
            <div key={feature.index} className="px-1 py-10 lg:px-8 lg:py-12">
              <span className="text-xs font-semibold tracking-[0.2em] text-plum">
                {feature.index}
              </span>
              <h2 className="mt-4 text-lg font-semibold text-ink">{feature.title}</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-ink-soft">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories ---------------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="eyebrow">One engine, any target</p>
          <h2 className="mt-4 text-hero font-semibold text-ink">
            Prepare for the interview you actually have.
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

      {/* How it works -------------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <div>
            <p className="eyebrow">The loop</p>
            <h2 className="mt-4 text-2xl font-semibold text-ink">
              Three steps, repeated until it&apos;s automatic.
            </h2>
          </div>
          <ol className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-line bg-surface/60 p-5 backdrop-blur-md"
              >
                <span className="text-xs font-semibold text-blue">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-sm font-semibold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-ink-soft">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA ----------------------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-line-strong bg-panel-soft p-8 backdrop-blur-xl sm:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-plum/[0.14] blur-3xl"
          />
          <div className="relative max-w-2xl">
            <p className="eyebrow">Your next interview starts here</p>
            <h2 className="mt-4 text-2xl font-semibold text-ink sm:text-3xl">
              Stop rehearsing answers. Start training judgement.
            </h2>
            <p className="mt-4 text-ink-soft">
              Build the skill to handle the unexpected question, not just the expected one.
            </p>
            <ButtonLink href="/signup" className="mt-7" size="lg">Create your account</ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
