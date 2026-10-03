import { TextareaHTMLAttributes, forwardRef } from "react";
import { FieldLabel, fieldShell } from "./Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, id, className = "", ...props }, ref) => {
    const textareaId = id ?? props.name;
    const describedBy = error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined;
    return (
      <div className="flex flex-col gap-1.5">
        {label && <FieldLabel htmlFor={textareaId}>{label}</FieldLabel>}
        <textarea
          ref={ref}
          id={textareaId}
          className={`${fieldShell} resize-y leading-6 ${
            error ? "border-danger/70" : "border-line"
          } ${className}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...props}
        />
        {hint && !error && (
          <p id={`${textareaId}-hint`} className="text-xs text-ink-mute">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${textareaId}-error`} className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
