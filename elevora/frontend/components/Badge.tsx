import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "blue" | "plum" | "blush" | "success" | "warning" | "danger";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-line bg-white/[0.04] text-ink-soft",
  blue: "border-blue/35 bg-blue/[0.12] text-blue",
  plum: "border-plum/35 bg-plum/[0.12] text-plum",
  blush: "border-blush/30 bg-blush/[0.10] text-blush",
  success: "border-success/30 bg-success/[0.10] text-success",
  warning: "border-warning/30 bg-warning/[0.10] text-warning",
  danger: "border-danger/35 bg-danger/[0.10] text-danger",
};

/** Small status/label chip. Colour is never the only signal — the label says it. */
export function Badge({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
