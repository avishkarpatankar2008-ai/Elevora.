import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";

/**
 * Inter is self-hosted (see app/fonts/). Fonts must not be fetched from Google
 * at build time — that makes the production build depend on a third-party
 * network call and fails in offline/air-gapped CI. Files are the official
 * Fontsource latin subsets, SIL OFL licensed (app/fonts/Inter-LICENSE.txt).
 */
const inter = localFont({
  src: [
    { path: "./fonts/inter-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/inter-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/inter-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/inter-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "ELEVORA — Adaptive AI Interview Practice",
    template: "%s · ELEVORA",
  },
  description: "Adaptive AI interview practice for roles, companies, exams and industries.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col font-sans">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        <AuthProvider>
          <Navbar />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <footer className="border-t border-white/[.07] bg-navy-950">
            <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 px-5 py-7 text-xs text-ink-400 sm:flex-row lg:px-8">
              <span>© {new Date().getFullYear()} ELEVORA</span>
              <span>Practice the interview, not a script.</span>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
