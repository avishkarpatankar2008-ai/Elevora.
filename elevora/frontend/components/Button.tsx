import Link from "next/link";
import { AnchorHTMLAttributes, ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "accent" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

/**
 * Shared class recipe. Exported so navigation that must stay a real link can
 * look identical without nesting a <button> inside an <a> (invalid HTML, and
 * confusing for keyboard and screen-reader users who then hit two controls).
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className = "",
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) {
  return `inline-flex select-none items-center justify-center font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-spring disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
}

/**
 * The one button in the system. Every variant defines the full state set
 * (default / hover / active / focus / disabled / loading) so no screen has to
 * invent its own affordance.
 */
const variantClasses: Record<Variant, string> = {
  primary:
    "bg-blue text-navy-950 shadow-glow-blue hover:bg-blue-soft active:bg-blue deep active:translate-y-px disabled:bg-blue/45 disabled:text-navy-950/70 disabled:shadow-none",
  secondary:
    "border border-blue/35 bg-blue/[0.06] text-ink hover:border-blue/60 hover:bg-blue/[0.12] active:translate-y-px disabled:opacity-50",
  accent:
    "bg-plum text-navy-950 shadow-glow-plum hover:bg-plum-soft active:translate-y-px disabled:bg-plum/45 disabled:text-navy-950/70 disabled:shadow-none",
  ghost:
    "text-ink-soft hover:bg-white/[0.06] hover:text-ink active:translate-y-px disabled:opacity-50",
  danger:
    "border border-danger/35 bg-danger/[0.10] text-danger hover:border-danger/55 hover:bg-danger/[0.16] active:translate-y-px disabled:opacity-50",
};

const sizeClasses: Record<Size, string> = {
  sm: "gap-1.5 rounded-md px-3 py-1.5 text-xs",
  md: "gap-2 rounded-lg px-4 py-2.5 text-sm",
  lg: "gap-2.5 rounded-lg px-6 py-3 text-[15px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", isLoading = false, className = "", children, disabled, ...props },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={`inline-flex select-none items-center justify-center font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-spring disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {isLoading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  )
);

Button.displayName = "Button";

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: Variant;
  size?: Size;
}

/** A real link that looks exactly like a button. Use for navigation. */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClasses({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}
