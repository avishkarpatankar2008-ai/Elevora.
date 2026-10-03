import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./Logo";

/**
 * Shared frame for login/signup: a marketing rail on large screens and a
 * focused form column on every size. Keeps both auth routes looking like one
 * product rather than two one-off pages.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-center lg:gap-16 lg:py-20">
      <div className="hidden lg:block">
        <Link href="/" aria-label="ELEVORA home">
          <Logo size={36} />
        </Link>
        <h2 className="mt-8 max-w-md text-3xl font-semibold leading-tight tracking-tight text-ink">
          The interview room that reacts to what you actually say.
        </h2>
        <ul className="mt-8 space-y-5">
          {[
            {
              title: "Questions grounded in your resume",
              body: "Upload a CV and a job description; the interviewer asks about your real projects.",
            },
            {
              title: "Voice or text, your choice",
              body: "Speak naturally and get a transcript, or type. Both paths are scored the same way.",
            },
            {
              title: "Reports you can act on",
              body: "Every score is tied to evidence from your answers, with a concrete practice plan.",
            },
          ].map((item) => (
            <li key={item.title} className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-blue to-plum"
              />
              <div>
                <p className="text-sm font-medium text-ink">{item.title}</p>
                <p className="mt-1 max-w-sm text-sm leading-6 text-ink-soft">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="w-full">
        <div className="lg:hidden">
          <Link href="/" aria-label="ELEVORA home">
            <Logo />
          </Link>
        </div>
        <div className="mt-6 lg:mt-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>
        </div>
        <div className="surface-2 mt-7 rounded-2xl p-6 sm:p-7">{children}</div>
        <div className="mt-5 text-center text-sm text-ink-soft">{footer}</div>
      </div>
    </div>
  );
}
