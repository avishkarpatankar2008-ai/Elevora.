/** @type {import('next').NextConfig} */

// Where the FastAPI service lives from the Next.js server's point of view.
// Requests to /api/* are proxied here, so the browser only ever talks to this
// origin (first-party cookies, no CORS preflight, nothing to misconfigure).
const BACKEND_ORIGIN = (process.env.BACKEND_ORIGIN ?? "http://127.0.0.1:8000").replace(/\/$/, "");

/**
 * Content-Security-Policy notes:
 *   - 'unsafe-inline' for scripts and styles is required by Next.js's inline
 *     hydration payload unless a nonce-based setup is used; tighten both with
 *     nonces if you deploy behind a proxy that can rewrite them.
 *   - 'wasm-unsafe-eval' lets MediaPipe's WebAssembly runtime instantiate.
 *   - connect-src allows the face-landmarker model download. Point
 *     NEXT_PUBLIC_FACE_LANDMARKER_MODEL_URL at a self-hosted copy (see
 *     .env.local.example) and this entry can be dropped entirely.
 *   - frame-ancestors is intentionally NOT set: it has to match your embedding
 *     origin (the app is embedded in preview environments), so set it at the
 *     reverse proxy where that value is actually known.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self'",
  "worker-src 'self' blob:",
  "connect-src 'self' https://storage.googleapis.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Produces .next/standalone for small container images (see Dockerfile).
  output: "standalone",

  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_ORIGIN}/:path*` }];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
      {
        // MediaPipe runtime: revalidated weekly rather than immutable, because
        // the path isn't version-stamped.
        source: "/mediapipe/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

module.exports = nextConfig;
