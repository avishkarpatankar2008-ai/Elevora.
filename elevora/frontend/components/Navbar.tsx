"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "./Logo";
import { Button } from "./Button";

const NAV_LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/interviews/new", label: "Practice" },
  { href: "/interview-profiles", label: "Profiles" },
  { href: "/settings", label: "Settings" },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Escape closes the menu, and the page behind it must not scroll while open.
  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  async function handleLogout() {
    setMenuOpen(false);
    try {
      await logout();
    } finally {
      router.push("/");
    }
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-navy-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
        <Link
          href={user ? "/dashboard" : "/"}
          className="shrink-0 rounded-lg"
          aria-label="ELEVORA home"
        >
          <Logo />
        </Link>

        {user ? (
          <>
            <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive(href)
                      ? "bg-white/[0.07] text-ink-900"
                      : "text-ink-600 hover:bg-white/[0.05] hover:text-ink-900"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <div className="hidden text-right sm:block">
                <div className="text-xs font-medium text-ink-900">{user.name}</div>
                <div className="text-[10px] text-ink-400">{user.email}</div>
              </div>
              <Button
                variant="secondary"
                onClick={handleLogout}
                className="hidden px-3 py-2 text-xs md:inline-flex"
              >
                Log out
              </Button>

              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="grid h-10 w-10 place-items-center rounded-lg border border-white/12 bg-white/[0.05] text-ink-900 md:hidden"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                aria-controls="mobile-nav"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  {menuOpen ? (
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  ) : (
                    <path
                      d="M4 7h16M4 12h16M4 17h16"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
              </button>
            </div>
          </>
        ) : (
          <nav aria-label="Main" className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-ink-600 hover:text-ink-900">
              Log in
            </Link>
            <Link href="/signup">
              <Button className="px-4 py-2">Start free</Button>
            </Link>
          </nav>
        )}
      </div>

      {user && menuOpen && (
        <div id="mobile-nav" className="border-t border-white/[0.07] bg-navy-900 px-5 pb-5 pt-3 md:hidden">
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={`rounded-lg px-3 py-3 text-sm ${
                  isActive(href) ? "bg-white/[0.07] text-ink-900" : "text-ink-600 hover:text-ink-900"
                }`}
              >
                {label}
              </Link>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 rounded-lg border border-white/12 px-3 py-3 text-left text-sm text-ink-600 hover:text-ink-900"
            >
              Log out ({user.email})
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
