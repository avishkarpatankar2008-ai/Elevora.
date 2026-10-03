"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "./Logo";
import { Button, ButtonLink } from "./Button";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/interviews/new", label: "New interview" },
  { href: "/interview-profiles", label: "Profiles" },
  { href: "/settings", label: "Settings" },
];

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  // Escape closes whatever is open; a click outside the account menu closes it.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setAccountOpen(false);
      }
    }
    function onPointerDown(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  async function handleLogout() {
    setMobileOpen(false);
    setAccountOpen(false);
    try {
      await logout();
    } finally {
      router.push("/");
    }
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-navy-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href={user ? "/dashboard" : "/"} className="rounded-lg" aria-label="ELEVORA home">
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
                  className={`relative rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
                    isActive(href)
                      ? "text-ink"
                      : "text-ink-soft hover:bg-white/[0.05] hover:text-ink"
                  }`}
                >
                  {label}
                  {isActive(href) && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-2 -bottom-[1px] h-[2px] rounded-full bg-brand-line"
                    />
                  )}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setAccountOpen((open) => !open)}
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2.5 rounded-full border border-line bg-white/[0.03] py-1.5 pl-1.5 pr-3 transition-colors hover:border-line-strong hover:bg-white/[0.06]"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-blue/80 to-plum/70 text-[11px] font-bold text-navy-950">
                    {initials(user.name)}
                  </span>
                  <span className="hidden max-w-[10rem] truncate text-sm text-ink sm:block">
                    {user.name}
                  </span>
                  <svg
                    aria-hidden="true"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="text-ink-mute"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {accountOpen && (
                  <div
                    role="menu"
                    aria-label="Account"
                    className="absolute right-0 mt-2 w-56 animate-fade-up overflow-hidden rounded-xl border border-line-strong bg-surface-2/95 p-1.5 shadow-raise backdrop-blur-xl"
                  >
                    <div className="border-b border-line px-3 pb-2.5 pt-2">
                      <p className="truncate text-sm font-medium text-ink">{user.name}</p>
                      <p className="truncate text-xs text-ink-mute">{user.email}</p>
                    </div>
                    <Link
                      href="/settings"
                      role="menuitem"
                      className="mt-1 block rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-white/[0.06] hover:text-ink"
                    >
                      Account settings
                    </Link>
                    <Link
                      href="/dashboard"
                      role="menuitem"
                      className="block rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-white/[0.06] hover:text-ink"
                    >
                      Interview history
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-plum hover:bg-plum/[0.10]"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen((open) => !open)}
                className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-white/[0.03] text-ink md:hidden"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  {mobileOpen ? (
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  ) : (
                    <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  )}
                </svg>
              </button>
            </div>
          </>
        ) : (
          <nav aria-label="Main" className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm text-ink-soft transition-colors hover:text-ink"
            >
              Log in
            </Link>
            <ButtonLink href="/signup" size="sm">
                Start free
              </ButtonLink>
          </nav>
        )}
      </div>

      {user && mobileOpen && (
        <div
          id="mobile-nav"
          className="animate-fade-up border-t border-line bg-navy-950/95 px-4 pb-5 pt-3 backdrop-blur-xl md:hidden"
        >
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={`rounded-lg px-3 py-3 text-sm ${
                  isActive(href)
                    ? "bg-blue/[0.12] text-ink"
                    : "text-ink-soft hover:bg-white/[0.05] hover:text-ink"
                }`}
              >
                {label}
              </Link>
            ))}
            <div className="mt-2 border-t border-line pt-3">
              <p className="px-3 text-xs text-ink-mute">
                {user.name} · {user.email}
              </p>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-2 w-full rounded-lg border border-plum/30 px-3 py-3 text-left text-sm text-plum"
              >
                Log out
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
