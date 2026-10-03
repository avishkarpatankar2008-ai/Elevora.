import { HTMLAttributes } from "react";

type Variant = "default" | "elevated" | "quiet" | "glass";
type Tone = "none" | "brand" | "success" | "warning" | "danger";

const variantClasses: Record<Variant, string> = {
  default: "border-line bg-surface/70 backdrop-blur-md shadow-soft",
  elevated: "border-line-strong bg-surface-2/80 backdrop-blur-xl shadow-raise",
  quiet: "border-line-soft bg-white/[0.02]",
  glass: "border-line backdrop-blur-xl",
};

/**
 * Semantic tones exist so callers never have to override `bg-surface`/`border-line`
 * with plain utility classes: those have the same specificity, so which one wins
 * would depend on stylesheet order rather than intent.
 */
const toneClasses: Record<Tone, string> = {
  none: "",
  brand: "border-blue/25 bg-blue/[0.06]",
  success: "border-success/25 bg-success/[0.06]",
  warning: "border-warning/30 bg-warning/[0.06]",
  danger: "border-danger/30 bg-danger/[0.06]",
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  tone?: Tone;
  /** Adds the hover lift + border illumination used for clickable cards only. */
  interactive?: boolean;
}

/**
 * A card is a container, not a default: use it for grouped content that needs
 * its own surface, and plain spacing everywhere else.
 */
export function Card({
  variant = "default",
  tone = "none",
  interactive = false,
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-2xl border p-6 ${variantClasses[variant]} ${toneClasses[tone]} ${
        variant === "glass" ? "glass" : ""
      } ${
        interactive
          ? "transition-[transform,border-color,box-shadow] duration-200 ease-spring hover:-translate-y-px hover:border-line-strong hover:shadow-raise"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
