import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, options, id, className = "", ...props }, ref) => {
    const selectId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={selectId} className="text-sm font-medium text-ink-900">
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          className={`w-full rounded-md border border-surface-border bg-white/[0.04] px-3.5 py-2.5 text-sm text-ink-900 transition-colors focus:border-accent focus:outline-none disabled:opacity-60 [&>option]:bg-navy-800 [&>option]:text-ink-900 ${className}`}
          aria-describedby={hint ? `${selectId}-hint` : undefined}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {hint && (
          <p id={`${selectId}-hint`} className="text-xs text-ink-400">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
