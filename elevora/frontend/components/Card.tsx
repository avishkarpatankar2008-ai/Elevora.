import { HTMLAttributes } from "react";

export function Card({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.08] bg-surface p-6 shadow-soft ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
