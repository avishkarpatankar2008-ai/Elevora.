import { ScoreRing } from "./ScoreRing";

/**
 * Product preview for the landing page: a drawn-down version of the real
 * interview room (question, AI activity, session signals, score ring).
 *
 * It is deliberately labelled "illustrative" rather than presenting invented
 * statistics as if they were live user data — nothing here is fetched or
 * claimed as a real session.
 */
export function InterviewPreview() {
  return (
    <div className="animate-fade-up lg:pl-6">
      <div className="surface-2 relative overflow-hidden rounded-2xl p-1.5">
        <div className="rounded-xl border border-line bg-navy-950/70">
          {/* Window chrome */}
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-plum/70" />
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-blue/60" />
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-blush/40" />
              <span className="ml-2 text-[11px] uppercase tracking-[0.18em] text-ink-mute">
                Illustrative preview
              </span>
            </div>
            <span className="rounded-full border border-blue/30 bg-blue/[0.10] px-2 py-0.5 text-[10px] font-medium text-blue">
              Adaptive
            </span>
          </div>

          <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_150px]">
            <div>
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-plum" />
                <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-plum">
                  Question 07 · follow-up
                </span>
              </div>
              <p className="mt-3 text-base font-medium leading-7 text-ink sm:text-lg">
                You mentioned cutting query latency. What did you measure before the change, and how
                did you verify the result?
              </p>

              <div className="mt-5 flex items-center gap-3">
                <span aria-hidden="true" className="flex h-6 items-end gap-[3px]">
                  {[0, 1, 2, 3, 4].map((bar) => (
                    <span
                      key={bar}
                      className="w-[3px] animate-bar-breathe rounded-full bg-gradient-to-t from-blue to-plum"
                      style={{
                        height: `${[40, 70, 100, 60, 35][bar]}%`,
                        animationDelay: `${bar * 120}ms`,
                      }}
                    />
                  ))}
                </span>
                <span className="text-xs text-ink-mute">Listening · microphone ready</span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-lg bg-blue/[0.14] px-3 py-1.5 text-xs font-medium text-ink">
                  Answer
                </span>
                <span className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft">
                  Speak
                </span>
                <span className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft">
                  Camera
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-5 lg:flex-col lg:border-l lg:border-line lg:pl-4">
              <ScoreRing score={78} size={104} sublabel="preview" animate={false} />
              <div className="w-full space-y-2.5 lg:mt-2">
                {[
                  ["Knowledge", "sig-1"],
                  ["Relevance", "sig-2"],
                  ["Delivery", "sig-3"],
                ].map(([label, key]) => (
                  <div key={key}>
                    <div className="flex items-baseline justify-between text-[11px] text-ink-mute">
                      <span>{label}</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue to-plum"
                        style={{ width: key === "sig-1" ? "82%" : key === "sig-2" ? "91%" : "64%" }}
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
  );
}
