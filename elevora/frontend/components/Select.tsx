import { SelectHTMLAttributes, forwardRef } from "react";
import { FieldLabel, fieldShell } from "./Input";

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
        <FieldLabel htmlFor={selectId}>{label}</FieldLabel>
        <select
          ref={ref}
          id={selectId}
          className={`${fieldShell} appearance-none border-line bg-[position:right_0.9rem_center] bg-no-repeat pr-9 [&>option]:bg-navy-900 [&>option]:text-ink ${className}`}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2383A6CE' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          }}
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
          <p id={`${selectId}-hint`} className="text-xs text-ink-mute">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
