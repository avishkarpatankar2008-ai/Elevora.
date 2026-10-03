import Link from "next/link";
import { Button } from "@/components/Button";
import { INTERVIEW_CATEGORIES } from "@/lib/types";

const features = [
  [
    "01",
    "Adaptive by design",
    "Every answer changes the next question. Probe, challenge, redirect or advance — automatically.",
  ],
  [
    "02",
    "Grounded in you",
    "Bring a resume and job description. ELEVORA asks about what you actually submitted, not invented experience.",
  ],
  [
    "03",
    "Evidence, not vibes",
    "Your report connects scores to answer evidence and gives you a concrete practice path.",
  ],
];

const SESSION_SIGNALS = [
  { label: "Technical depth", value: "Probed", width: "82%" },
  { label: "Answer relevance", value: "Grounded", width: "91%" },
  { label: "Follow-up pressure", value: "Active", width: "64%" },
];

export default function LandingPage() {
  return (
    <div className="overflow-hidden">
      <section className="relative grid-bg">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[-180px] h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-accent-600/12 blur-[120px]"
        />
        <div className="mx-auto max-w-7xl px-5 pb-20 pt-16 lg:px-8 lg:pb-24 lg:pt-28">
          <div className="mx-auto max-w-4xl text-center">
            <div className="eyebrow">AI interview practice, rebuilt</div>
            <h1 className="mt-6 text-4xl font-semibold tracking-[-.05em] text-ink-900 sm:text-6xl lg:text-7xl">
              Practice like the
              <br />
              <span className="bg-gradient-to-r from-ink-900 via-accent-300 to-accent-600 bg-clip-text text-transparent">
                real interview.
              </span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-ink-600 sm:text-lg">
              ELEVORA listens to your answers, adapts in real time, and shows you exactly what to
              improve — for roles, companies, exams and industries.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/signup">
                <Button className="h-12 w-full px-7 text-[15px] sm:w-auto">
                  Start practicing <span aria-hidden="true">↗</span>
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" className="h-12 w-full px-7 text-[15px] sm:w-auto">
                  Sign in
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-xs text-ink-400">
              No fabricated scores. No scripted interviews. Just your practice data.
            </p>
          </div>

          <div className="mx-auto mt-14 max-w-6xl lg:mt-16">
            <div className="glass-strong glow overflow-hidden rounded-3xl">
              <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
                  <span className="text-xs uppercase tracking-[.18em] text-ink-400">
                    Illustrative preview
                  </span>
                </div>
                <div className="text-xs text-ink-400">Adaptive session</div>
              </div>
              <div className="grid min-h-[340px] lg:grid-cols-[1fr_300px]">
                <div className="p-6 sm:p-10">
                  <div className="text-xs font-medium text-accent-300">
                    QUESTION 07 / ADAPTIVE
                  </div>
                  <h2 className="mt-5 max-w-2xl text-xl font-medium leading-8 tracking-tight text-ink-900 sm:text-3xl sm:leading-9">
                    You mentioned reducing query latency. What did you measure before the change,
                    and how did you validate the result?
                  </h2>
                  <div className="mt-10 flex items-center gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent-600/15 text-accent-300">
                      ●
                    </div>
                    <div className="flex-1">
                      <div className="h-1 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-accent-600 to-accent-300" />
                      </div>
                      <div className="mt-2 text-[11px] text-ink-400">
                        Listening · microphone ready
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-white/[.07] bg-black/20 p-6 lg:border-l lg:border-t-0">
                  <div className="text-[11px] uppercase tracking-[.18em] text-ink-400">
                    Session signal
                  </div>
                  <div className="mt-6 space-y-4">
                    {SESSION_SIGNALS.map((signal) => (
                      <div key={signal.label}>
                        <div className="flex justify-between text-xs">
                          <span className="text-ink-600">{signal.label}</span>
                          <span className="text-ink-400">{signal.value}</span>
                        </div>
                        <div className="mt-2 h-1 rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-accent-600"
                            style={{ width: signal.width }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/[.07] bg-navy-900">
        <div className="mx-auto grid max-w-7xl gap-px bg-white/[.06] px-5 lg:grid-cols-3 lg:px-8">
          {features.map(([n, title, body]) => (
            <div key={n} className="bg-navy-900 px-2 py-10 lg:px-8 lg:py-12">
              <div className="text-xs text-accent-300">{n}</div>
              <h3 className="mt-4 text-xl font-semibold text-ink-900">{title}</h3>
              <p className="mt-3 max-w-sm text-sm leading-6 text-ink-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="max-w-2xl">
          <div className="eyebrow">One engine. Any target.</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Prepare for the interview you actually have.
          </h2>
          <p className="mt-4 text-ink-600">
            Configure one engine for your role, exam, company, experience level and difficulty.
          </p>
        </div>
        <ul className="mt-8 flex flex-wrap gap-2">
          {INTERVIEW_CATEGORIES.map((category) => (
            <li
              key={category.value}
              className="rounded-full border border-white/[.08] bg-white/[.025] px-4 py-2 text-sm text-ink-600"
            >
              {category.label}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8 lg:pb-28">
        <div className="relative overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/[0.14] to-transparent p-8 sm:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-[-100px] top-[-160px] h-80 w-80 rounded-full bg-accent-600/15 blur-[100px]"
          />
          <div className="relative max-w-2xl">
            <div className="eyebrow">Your next interview starts here</div>
            <h2 className="mt-4 text-3xl font-semibold text-ink-900 sm:text-4xl">
              Stop rehearsing answers. Start training judgment.
            </h2>
            <p className="mt-4 text-ink-600">
              Build the skill to handle the unexpected question, not just the expected one.
            </p>
            <Link href="/signup" className="mt-7 inline-block">
              <Button className="h-11 px-6">Create your account</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
