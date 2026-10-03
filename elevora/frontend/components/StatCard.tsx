import type { ReactNode } from "react";

/**
 * Dashboard metric tile. `value` may be null to mean "not measured yet" — the
 * card then says so instead of rendering a zero.
 */
export function StatCard({
  label,
  value,
  hint,
  icon,
  trend,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  trend?: { direction: "up" | "down" | "flat"; label: string };
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface/70 p-5 backdrop-blur-md transition-[transform,border-color] duration-200 ease-spring hover:-translate-y-0.5 hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-mute">{label}</p>
        {icon && <span className="text-blue/80">{icon}</span>}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      {(hint || trend) && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-mute">
          {trend && (
            <span
              aria-hidden="true"
              className={trend.direction === "up" ? "text-success" : trend.direction === "down" ? "text-plum" : "text-ink-mute"}
            >
              {trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "—"}
            </span>
          )}
          {trend ? trend.label : hint}
        </p>
      )}
    </div>
  );
}
