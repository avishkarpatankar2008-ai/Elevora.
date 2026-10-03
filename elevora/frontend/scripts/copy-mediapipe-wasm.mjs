/**
 * Copies the MediaPipe vision WASM runtime out of node_modules into
 * public/mediapipe/wasm so it is served from our own origin.
 *
 * Why: the tracker used to load these ~34MB of binaries from cdn.jsdelivr.net
 * at runtime. That is a third-party dependency in the hot path of a core
 * feature, it fails behind restrictive networks/CSP, and it pins nothing --
 * the CDN decides which bytes the browser runs. Copying from the installed
 * package keeps the version pinned to package.json and the files local.
 *
 * Runs automatically via the predev/prebuild npm scripts. The generated files
 * are gitignored: node_modules already has them, so they are a build artifact.
 */
import { cp, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(frontendRoot, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const target = path.join(frontendRoot, "public", "mediapipe", "wasm");

if (!existsSync(source)) {
  console.error(
    `[mediapipe] WASM runtime not found at ${source}.\n` +
      "Run `npm install` first — webcam analytics will not work without it."
  );
  process.exit(1);
}

await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });

const files = await readdir(target);
console.log(`[mediapipe] copied ${files.length} runtime files into public/mediapipe/wasm`);
