"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";

/**
 * The landing route is the licensed Onda document, mounted in an iframe so its
 * original reset, CSS layers, Lenis root classes and scroll-linked scenes stay
 * fully isolated from the authenticated application UI. Every other route uses
 * the normal ELEVORA navigation and application footer.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  if (isLanding) {
    return <>{children}</>;
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-blue focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-navy-950"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <footer className="mt-16 border-t border-line bg-navy-950/60">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-4 py-8 text-xs text-ink-mute sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="flex flex-col gap-1">
            <span className="font-semibold tracking-wide text-ink-soft">ELEVORA</span>
            <span>Practice the interview, not a script.</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>© {new Date().getFullYear()} ELEVORA</span>
            <span className="hidden text-ink-mute/60 sm:inline" aria-hidden="true">
              ·
            </span>
            <span>Camera frames never leave your browser.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
