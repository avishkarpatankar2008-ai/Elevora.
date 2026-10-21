"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "./Logo";
<<<<<<< HEAD
import { ButtonLink } from "./Button";
=======
import { Button, ButtonLink } from "./Button";
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7

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
<<<<<<< HEAD
    <header className="sticky top-0 z-50 border-b border-line bg-navy-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href={user ? "/dashboard" : "/"} className="rounded-full" aria-label="ELEVORA home">
=======
    <header className="sticky top-0 z-50 border-b border-line bg-navy-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href={user ? "/dashboard" : "/"} className="rounded-lg" aria-label="ELEVORA home">
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
          <Logo />
        </Link>

        {user ? (
          <>
<<<<<<< HEAD
            <nav
              aria-label="Main"
              className="hidden items-center gap-1 rounded-full border border-line bg-surface/50 px-2 py-1 shadow-soft backdrop-blur-md md:flex"
            >
=======
            <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive(href) ? "page" : undefined}
<<<<<<< HEAD
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                    isActive(href)
                      ? "bg-white/[0.10] text-ink shadow-sm"
                      : "text-ink-soft hover:bg-white/[0.04] hover:text-ink"
                  }`}
                >
                  {label}
=======
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
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
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
<<<<<<< HEAD
                  className="flex items-center gap-2.5 rounded-full border border-line bg-white/[0.03] py-1 pl-1.5 pr-3 transition-colors hover:border-line-strong hover:bg-white/[0.06]"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-blue/90 to-plum/80 text-[11px] font-bold text-navy-950">
                    {initials(user.name)}
                  </span>
                  <span className="hidden max-w-[10rem] truncate text-xs font-medium text-ink sm:block">
=======
                  className="flex items-center gap-2.5 rounded-full border border-line bg-white/[0.03] py-1.5 pl-1.5 pr-3 transition-colors hover:border-line-strong hover:bg-white/[0.06]"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-blue/80 to-plum/70 text-[11px] font-bold text-navy-950">
                    {initials(user.name)}
                  </span>
                  <span className="hidden max-w-[10rem] truncate text-sm text-ink sm:block">
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
                    {user.name}
                  </span>
                  <svg
                    aria-hidden="true"
<<<<<<< HEAD
                    width="12"
                    height="12"
=======
                    width="14"
                    height="14"
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
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
<<<<<<< HEAD
                    className="absolute right-0 mt-2 w-56 animate-fade-up overflow-hidden rounded-2xl border border-line-strong bg-surface-2/95 p-1.5 shadow-raise backdrop-blur-xl"
                  >
                    <div className="border-b border-line px-3 pb-2.5 pt-2">
                      <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
=======
                    className="absolute right-0 mt-2 w-56 animate-fade-up overflow-hidden rounded-xl border border-line-strong bg-surface-2/95 p-1.5 shadow-raise backdrop-blur-xl"
                  >
                    <div className="border-b border-line px-3 pb-2.5 pt-2">
                      <p className="truncate text-sm font-medium text-ink">{user.name}</p>
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
                      <p className="truncate text-xs text-ink-mute">{user.email}</p>
                    </div>
                    <Link
                      href="/settings"
                      role="menuitem"
<<<<<<< HEAD
                      className="mt-1 block rounded-xl px-3 py-2 text-xs text-ink-soft hover:bg-white/[0.06] hover:text-ink"
=======
                      className="mt-1 block rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-white/[0.06] hover:text-ink"
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
                    >
                      Account settings
                    </Link>
                    <Link
                      href="/dashboard"
                      role="menuitem"
<<<<<<< HEAD
                      className="block rounded-xl px-3 py-2 text-xs text-ink-soft hover:bg-white/[0.06] hover:text-ink"
=======
                      className="block rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-white/[0.06] hover:text-ink"
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
                    >
                      Interview history
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
<<<<<<< HEAD
                      className="block w-full rounded-xl px-3 py-2 text-left text-xs text-plum hover:bg-plum/[0.10]"
=======
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-plum hover:bg-plum/[0.10]"
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen((open) => !open)}
<<<<<<< HEAD
                className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white/[0.03] text-ink md:hidden"
=======
                className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-white/[0.03] text-ink md:hidden"
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav"
              >
<<<<<<< HEAD
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
=======
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
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
<<<<<<< HEAD
          <nav aria-label="Main" className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-xs font-semibold text-ink-soft transition-colors hover:text-ink"
            >
              Log in
            </Link>
            <ButtonLink href="/signup" size="sm" className="rounded-full">
              Start free
            </ButtonLink>
=======
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
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
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
<<<<<<< HEAD
                className={`rounded-xl px-3 py-2.5 text-sm ${
=======
                className={`rounded-lg px-3 py-3 text-sm ${
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
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
<<<<<<< HEAD
                className="mt-2 w-full rounded-xl border border-plum/30 px-3 py-2.5 text-left text-sm text-plum"
=======
                className="mt-2 w-full rounded-lg border border-plum/30 px-3 py-3 text-left text-sm text-plum"
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
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
