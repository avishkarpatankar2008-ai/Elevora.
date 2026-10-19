import type { Config } from "tailwindcss";

/**
 * ELEVORA design tokens — the single source of truth for the visual system.
 *
 * Every value maps to a CSS custom property declared in app/globals.css, so the
 * palette can be inspected (or tuned) in one place and consumed from plain CSS
 * as well as Tailwind utilities.
 *
 * Type weights in use: 400 body, 500 labels, 600 UI, 700 headings and hero.
 * The 800 hero weight from the brief is intentionally not used: the bundled
 * Inter subset (app/fonts/) ships 400-700, and asking for an unbundled weight
 * would make the browser synthesise it. Fonts must never be fetched from a CDN
 * at build time, so the type scale stops at 700.
 *
 * Contrast measured against the #0B1B32 canvas (WCAG 2.1):
 *   ink #F7F4F6 ≈ 14.8:1   ink-soft #C7D1DD ≈ 9.6:1   ink-mute #93A3B8 ≈ 5.4:1
 *   blue #83A6CE ≈ 6.9:1 (links, icons)                 plum #C48CB3 ≈ 6.6:1
 *   navy-950 text on blue (filled buttons) ≈ 6.9:1      blush-on-navy ≈ 9.7:1
 */
/**
 * Colours are declared as space-separated RGB triplets in globals.css and
 * wrapped here so Tailwind's opacity modifiers work on every token
 * (`bg-navy-950/60`, `border-plum/30`, ...). A plain `var(--x)` colour cannot
 * be given an alpha value, which silently drops those utilities.
 */
const cssVar = (name: string) => `rgb(var(${name}) / <alpha-value>)`;
const cssVarAlpha = (name: string, alpha: number) => `rgb(var(${name}) / ${alpha})`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Surfaces
        base: cssVar("--color-navy-950"),
        navy: {
          DEFAULT: cssVar("--color-navy-900"),
          950: cssVar("--color-navy-950"),
          900: cssVar("--color-navy-900"),
          800: cssVar("--color-slate"),
        },
        surface: {
          DEFAULT: cssVar("--color-surface"),
          2: cssVar("--color-surface-2"),
          slate: cssVar("--color-slate"),
        },
        // Brand
        blue: { DEFAULT: cssVar("--color-blue"), soft: "#A9C3E0", deep: "#5E7FA8" },
        plum: { DEFAULT: cssVar("--color-plum"), soft: cssVar("--color-blush"), deep: "#9C6A8C" },
        blush: cssVar("--color-blush"),
        // Text
        ink: {
          DEFAULT: cssVar("--color-text-primary"),
          soft: cssVar("--color-text-secondary"),
          mute: cssVar("--color-text-muted"),
        },
        // Feedback (restrained; the palette stays blue/plum first)
        success: cssVar("--color-success"),
        warning: cssVar("--color-warning"),
        danger: cssVar("--color-danger"),
        line: cssVarAlpha("--color-border", 0.14),
        "line-strong": cssVarAlpha("--color-border", 0.24),
        "line-soft": cssVarAlpha("--color-border", 0.08),
      },
      borderColor: { DEFAULT: cssVarAlpha("--color-border", 0.14) },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        // Display scale for hero/score moments.
        display: ["clamp(2.5rem, 6vw, 4.5rem)", { lineHeight: "1.02", letterSpacing: "-0.035em" }],
        hero: ["clamp(2rem, 4vw, 3rem)", { lineHeight: "1.08", letterSpacing: "-0.03em" }],
      },
      borderRadius: { sm: "8px", md: "12px", lg: "16px", xl: "20px", "2xl": "24px" },
      boxShadow: {
        soft: "0 18px 50px rgba(4,10,24,.42)",
        raise: "0 22px 60px rgba(4,10,24,.5)",
        "glow-blue": "0 10px 34px rgba(131,166,206,.20)",
        "glow-plum": "0 10px 34px rgba(196,140,179,.18)",
        inset: "inset 0 1px 0 rgba(247,244,246,.05)",
      },
      backgroundImage: {
        "hero-ambient":
          "radial-gradient(60% 60% at 18% 8%, rgba(131,166,206,.16), transparent 60%), radial-gradient(55% 55% at 82% 12%, rgba(196,140,179,.14), transparent 62%)",
        "panel-soft": "linear-gradient(160deg, rgba(13,30,76,.72) 0%, rgba(11,27,50,.6) 55%, rgba(38,65,94,.42) 100%)",
        "brand-line": "linear-gradient(90deg, #83A6CE 0%, #C48CB3 100%)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(.22, 1, .36, 1)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "pulse-soft": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: ".55", transform: "scale(.94)" },
        },
        "bar-breathe": {
          "0%, 100%": { transform: "scaleY(.35)" },
          "50%": { transform: "scaleY(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "ring-in": {
          from: { strokeDashoffset: "var(--ring-total)" },
          to: { strokeDashoffset: "var(--ring-offset)" },
        },
      },
      animation: {
        "fade-up": "fade-up .35s cubic-bezier(.22, 1, .36, 1) both",
        "fade-in": "fade-in .25s ease-out both",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "bar-breathe": "bar-breathe 1.1s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
        "ring-in": "ring-in .9s cubic-bezier(.22, 1, .36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
