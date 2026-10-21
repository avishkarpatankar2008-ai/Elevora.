"use client";

export interface StepDefinition {
  title: string;
  description: string;
}

export type StepState = "complete" | "active" | "upcoming";

/**
 * Guided workflow rail. The same component drives the desktop sidebar and the
 * mobile progress bar, so both stay in sync with one source of truth.
 */
export function StepRail({
  steps,
  current,
  onSelect,
  maxReachable,
}: {
  steps: StepDefinition[];
  current: number;
  /** Steps at or below this index can be revisited. */
  maxReachable: number;
  onSelect?: (index: number) => void;
}) {
  return (
    <ol className="hidden lg:block" aria-label="Interview setup steps">
      {steps.map((step, index) => {
        const state: StepState =
          index < current ? "complete" : index === current ? "active" : "upcoming";
        const reachable = index <= maxReachable && Boolean(onSelect);
        return (
          <li key={step.title} className="relative pb-7 last:pb-0">
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px ${
                  state === "complete" ? "bg-blue/45" : "bg-line"
                }`}
              />
            )}
            <button
              type="button"
              onClick={() => reachable && onSelect?.(index)}
              disabled={!reachable}
              aria-current={state === "active" ? "step" : undefined}
              className={`group flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
                reachable ? "hover:bg-white/[0.04]" : "cursor-default"
              }`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-colors ${
                  state === "complete"
                    ? "border-blue/50 bg-blue/[0.16] text-blue"
                    : state === "active"
                      ? "border-plum/60 bg-plum/[0.16] text-blush"
                      : "border-line bg-white/[0.03] text-ink-mute"
                }`}
              >
                {state === "complete" ? (
                  <svg
                    aria-hidden="true"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                ) : (
                  String(index + 1).padStart(2, "0")
                )}
              </span>
              <span className="min-w-0 pt-0.5">
                <span
                  className={`block text-sm font-medium ${
                    state === "upcoming" ? "text-ink-mute" : "text-ink"
                  }`}
                >
                  {step.title}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-ink-mute">
                  {step.description}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function StepProgressBar({
  steps,
  current,
}: {
  steps: StepDefinition[];
  current: number;
}) {
  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between text-xs text-ink-mute">
        <span className="font-medium text-ink-soft">
          Step {current + 1} of {steps.length} · {steps[current].title}
        </span>
        <span>{Math.round(((current + 1) / steps.length) * 100)}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue to-plum transition-[width] duration-500 ease-spring"
          style={{ width: `${((current + 1) / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
