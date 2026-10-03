import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

const fieldClasses =
  "w-full rounded-md border bg-white/[0.04] px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 transition-colors focus:border-accent focus:outline-none disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = "", ...props }, ref) => {
    const inputId = id ?? props.name;
    const descriptionId = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-ink-900">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`${fieldClasses} ${error ? "border-danger" : "border-surface-border"} ${className}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptionId}
          {...props}
        />
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-ink-400">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
