"use client";

import type { ReactNode } from "react";

export interface ChoiceOption<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
  meta?: ReactNode;
}

/**
 * The single selection control used across the setup wizard. Selection is shown
 * by a 2px accent border plus a soft blue wash *and* a filled marker, so it is
 * never communicated by colour alone. Keyboard support comes free from the real
 * button elements inside a radiogroup.
 */
export function StepChoice<T extends string | number>({
  legend,
  description,
  options,
  value,
  onChange,
  columns = 2,
  childrenByValue,
  isLoading = false,
}: {
  legend: string;
  description?: string;
  options: ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  columns?: 1 | 2 | 3;
  /** Optional richer content revealed beneath the grid for the selected value. */
  childrenByValue?: Partial<Record<T, ReactNode>>;
  isLoading?: boolean;
}) {
  const gridCols =
    columns === 1 ? "sm:grid-cols-1" : columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";

  return (
    <fieldset>
      <legend className="text-lg font-semibold tracking-tight text-ink">{legend}</legend>
      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">{description}</p>
      )}

      <div role="radiogroup" aria-label={legend} aria-busy={isLoading || undefined} className={`mt-5 grid gap-3 ${gridCols}`}>
        {isLoading
          ? Array.from({ length: columns * 2 }).map((_, index) => (
              <span key={index} className="skeleton block h-[68px] rounded-xl" />
            ))
          : options.map((option) => {
              const selected = value === option.value;
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange(option.value)}
                  className={`group relative rounded-xl border px-4 py-3.5 text-left transition-all duration-200 ease-spring ${
                    selected
                      ? "border-blue/60 bg-blue/[0.12] shadow-glow-blue"
                      : "border-line bg-white/[0.02] hover:-translate-y-px hover:border-line-strong hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span
                        className={`block text-sm font-medium ${selected ? "text-ink" : "text-ink-soft"}`}
                      >
                        {option.label}
                      </span>
                      {option.hint && (
                        <span className="mt-0.5 block text-xs leading-5 text-ink-mute">
                          {option.hint}
                        </span>
                      )}
                      {option.meta && <span className="mt-2 block">{option.meta}</span>}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors ${
                        selected ? "border-blue bg-blue" : "border-line-strong"
                      }`}
                    >
                      {selected && <span className="h-1.5 w-1.5 rounded-full bg-navy-950" />}
                    </span>
                  </span>
                </button>
              );
            })}
      </div>

      {value !== null && childrenByValue?.[value] ? (
        <div className="mt-4">{childrenByValue[value]}</div>
      ) : null}
    </fieldset>
  );
}
