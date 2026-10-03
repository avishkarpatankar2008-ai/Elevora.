import type { ReactNode } from "react";

type Tone = "error" | "warning" | "success" | "info";

const toneClasses: Record<Tone, string> = {
  info: "border-blue/30 bg-blue/[0.08] text-ink-soft",
  success: "border-success/30 bg-success/[0.08] text-success",
  warning: "border-warning/30 bg-warning/[0.08] text-warning",
  error: "border-danger/35 bg-danger/[0.09] text-danger",
};

const toneIcons: Record<Tone, string> = {
  info: "M12 16v-5M12 8h.01",
  success: "m5 13 4 4L19 7",
  warning: "M12 9v4m0 4h.01M10.3 4.2 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z",
  error: "M12 9v4m0 4h.01M10.3 4.2 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z",
};

/**
 * Inline message block. Errors are announced assertively (role="alert");
 * everything else politely, so a screen reader hears failures immediately
 * without being interrupted for routine updates.
 */
export function Alert({
  tone = "info",
  title,
  className = "",
  children,
}: {
  tone?: Tone;
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex gap-3 rounded-lg border px-4 py-3 text-sm ${toneClasses[tone]} ${className}`}
    >
      <svg
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 shrink-0"
      >
        <path d={toneIcons[tone]} />
      </svg>
      <div className="min-w-0">
        {title && <p className="font-semibold text-ink">{title}</p>}
        <div className={title ? "mt-0.5" : ""}>{children}</div>
      </div>
    </div>
  );
}
