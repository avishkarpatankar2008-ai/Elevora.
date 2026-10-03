import type { DimensionScore } from "@/lib/types";

export function DimensionBar({ label, dimension }: { label: string; dimension: DimensionScore }) {
  const isAvailable = dimension.score !== null;
  const percent = isAvailable ? (dimension.score! / 5) * 100 : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="font-medium text-ink-900">{label}</span>
        <span className={isAvailable ? "font-medium text-accent-300" : "text-ink-400"}>
          {isAvailable ? `${dimension.score}/5` : "Not available"}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.07]">
        {isAvailable ? (
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-600 to-accent-300"
            style={{ width: `${percent}%` }}
          />
        ) : (
          <div
            className="h-full rounded-full opacity-40"
            aria-hidden="true"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,.18) 4px, rgba(255,255,255,.18) 8px)",
            }}
          />
        )}
      </div>
      <p className="mt-1.5 text-sm text-ink-600">{dimension.evidence}</p>
    </div>
  );
}
