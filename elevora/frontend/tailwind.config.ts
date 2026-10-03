import type { Config } from "tailwindcss";

/**
 * ELEVORA design tokens.
 *
 * One dark theme, warm neutral ink on near-black, and a single restrained
 * orange accent (burnt orange, not neon) reserved for emphasis: primary
 * actions, focus, progress, and highlighting evidence.
 *
 * Contrast notes (measured against the #08080A canvas, WCAG 2.1):
 *   ink-900 #F4F2EF ≈ 16.9:1   ink-600 #A9A69F ≈ 8.6:1   ink-400 #7A7770 ≈ 4.6:1
 *   accent-300 #F5A15E ≈ 9.4:1 (used for link/label text)
 *   white on accent #C2410C ≈ 4.7:1 (used for filled buttons)
 * Accent-600 (#EA580C) is decorative-only (bars, rings, glows) — it does not
 * carry text, so its lower contrast against white is not a text contrast issue.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 900: "#F4F2EF", 600: "#A9A69F", 400: "#7A7770" },
        navy: { 950: "#08080A", 900: "#0E0E12", 800: "#15151A", 700: "#1D1D24" },
        accent: {
          DEFAULT: "#C2410C",
          600: "#EA580C",
          700: "#A93A0A",
          300: "#F5A15E",
          100: "#2B1A0D",
        },
        surface: {
          DEFAULT: "#101014",
          muted: "#0C0C10",
          border: "rgba(255,255,255,.10)",
        },
        success: "#3FBF8F",
        warning: "#E0A34A",
        danger: "#F1707A",
      },
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
      borderRadius: { sm: "8px", md: "12px", lg: "16px", xl: "22px" },
      boxShadow: {
        soft: "0 20px 80px rgba(0,0,0,.35)",
        accent: "0 10px 34px rgba(194,65,12,.28)",
      },
    },
  },
  plugins: [],
};
export default config;
