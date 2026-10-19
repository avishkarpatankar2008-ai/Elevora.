import type { DimensionScore } from "@/lib/types";

/** Which evaluator produced a dimension — the report labels this explicitly. */
export type DimensionKind = "ai" | "measured" | "unavailable";

export function DimensionBar({
  label,
  dimension,
  kind,
}: {
  label: string;
  dimension: DimensionScore;
  kind?: DimensionKind;
}) {
  const isAvailable = dimension.score !== null;
  const percent = isAvailable ? (dimension.score! / 5) * 100 : 0;
  const resolvedKind: DimensionKind = isAvailable ? (kind ?? "ai") : "unavailable";

  const tag =
    resolvedKind === "measured"
      ? { text: "Measured", className: "border-blue/30 bg-blue/[0.10] text-blue" }
      : resolvedKind === "ai"
        ? { text: "AI-evaluated", className: "border-plum/30 bg-plum/[0.10] text-plum" }
        : { text: "Not available", className: "border-line bg-white/[0.04] text-ink-mute" };

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink">{label}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${tag.className}`}>
            {tag.text}
          </span>
        </div>
        <span className={`text-sm tabular-nums ${isAvailable ? "text-ink-soft" : "text-ink-mute"}`}>
          {isAvailable ? `${dimension.score}/5` : "—"}
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        {isAvailable ? (
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue to-plum transition-[width] duration-700 ease-spring"
            style={{ width: `${percent}%` }}
          />
        ) : (
          <div
            aria-hidden="true"
            className="h-full w-full rounded-full opacity-30"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(229,201,215,.35) 4px, rgba(229,201,215,.35) 7px)",
            }}
          />
        )}
      </div>

      <p className="mt-1.5 text-sm leading-6 text-ink-soft">{dimension.evidence}</p>
    </div>
  );
}
