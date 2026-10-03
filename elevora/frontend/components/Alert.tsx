import type { ReactNode } from "react";

type Tone = "error" | "warning" | "success" | "info";

const toneClasses: Record<Tone, string> = {
  error: "border-danger/30 bg-danger/[0.08] text-danger",
  warning: "border-warning/30 bg-warning/[0.08] text-warning",
  success: "border-success/30 bg-success/[0.08] text-success",
  info: "border-white/12 bg-white/[0.04] text-ink-600",
};

/**
 * Inline message block. Errors are announced assertively (role="alert"),
 * everything else politely, so a screen reader user hears failure the moment
 * it happens without being interrupted for routine updates.
 */
export function Alert({
  tone = "info",
  className = "",
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm ${toneClasses[tone]} ${className}`}
    >
      {children}
    </div>
  );
}
