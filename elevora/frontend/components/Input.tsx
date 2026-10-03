import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const fieldShell =
  "w-full rounded-lg border bg-navy-950/50 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-mute/80 transition-[border-color,box-shadow,background-color] duration-200 hover:border-line-strong focus:border-blue focus:outline-none focus:shadow-glow-blue disabled:cursor-not-allowed disabled:opacity-60";

export function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-soft">
      {children}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = "", ...props }, ref) => {
    const inputId = id ?? props.name;
    const descriptionId = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
    return (
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
        <input
          ref={ref}
          id={inputId}
          className={`${fieldShell} ${error ? "border-danger/70" : "border-line"} ${className}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptionId}
          {...props}
        />
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-ink-mute">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
