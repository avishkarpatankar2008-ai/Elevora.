import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./Logo";

/**
 * Shared frame for login/signup: a marketing rail on large screens and a
<<<<<<< HEAD
 * focused form column on every size. Uses Onda's visual language with ambient
 * radial lighting, violet accents, and rounded-3xl surface panels.
=======
 * focused form column on every size. Keeps both auth routes looking like one
 * product rather than two one-off pages.
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
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
<<<<<<< HEAD
    <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-center lg:gap-16 lg:py-20">
      <div className="hidden lg:block">
        <Link href="/" aria-label="ELEVORA home">
          <Logo size={40} />
        </Link>
        <h2 className="mt-8 max-w-md text-3xl font-bold leading-tight tracking-tight text-ink">
          The interview room that reacts to what you actually say
          <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[#6c3cff]" aria-hidden="true" />
        </h2>
        <ul className="mt-8 space-y-6">
          {[
            {
              title: "Questions grounded in your resume",
              body: "Upload a CV and job description; the interviewer asks about your real experience and verified claims.",
            },
            {
              title: "Voice or text, your choice",
              body: "Speak naturally and receive speech pacing metrics, or type directly. Both follow the identical rubric.",
            },
            {
              title: "Evidence-linked report cards",
              body: "Every score is tied directly to evidence from your answers, accompanied by concrete practice steps.",
            },
          ].map((item) => (
            <li key={item.title} className="flex gap-3.5">
              <span
                aria-hidden="true"
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#6c3cff]"
              />
              <div>
                <p className="text-sm font-semibold text-ink">{item.title}</p>
=======
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
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
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
<<<<<<< HEAD
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {title}
            <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[#6c3cff]" aria-hidden="true" />
          </h1>
          <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>
        </div>
        <div className="surface-2 relative mt-7 overflow-hidden rounded-3xl border border-line-strong bg-surface-2/80 p-6 shadow-raise backdrop-blur-xl sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#6c3cff]/10 blur-3xl"
          />
          <div className="relative">{children}</div>
        </div>
        <div className="mt-6 text-center text-sm text-ink-soft">{footer}</div>
=======
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>
        </div>
        <div className="surface-2 mt-7 rounded-2xl p-6 sm:p-7">{children}</div>
        <div className="mt-5 text-center text-sm text-ink-soft">{footer}</div>
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
      </div>
    </div>
  );
}
