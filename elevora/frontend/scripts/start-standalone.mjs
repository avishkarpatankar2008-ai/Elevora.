#!/usr/bin/env node
/**
 * Production server for this app.
 *
 * next.config.js sets `output: "standalone"`, and Next.js documents `next start`
 * as unsupported for that mode. In practice `next start` boots but only serves a
 * subset of routes (the rest 404) because it looks for a non-standalone build
 * manifest. This script does what the Dockerfile does — copy `public` and
 * `.next/static` next to the standalone server — then runs it, so `npm start`
 * behaves the same here as it does in the container.
 *
 * Usage: npm start    (after `npm run build`)
 */
import { cp, mkdir, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
const serverEntry = path.join(standalone, "server.js");

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(serverEntry))) {
  console.error(
    "No production build found (.next/standalone/server.js).\n" +
      "Run `npm run build` first — the prebuild step also copies the MediaPipe WASM runtime."
  );
  process.exit(1);
}

// Static assets are not copied into the standalone folder by the build itself.
for (const [from, to] of [
  [path.join(root, ".next", "static"), path.join(standalone, ".next", "static")],
  [path.join(root, "public"), path.join(standalone, "public")],
]) {
  if (!(await exists(from))) continue;
  await mkdir(path.dirname(to), { recursive: true });
  await cp(from, to, { recursive: true, force: true });
}

const child = spawn(process.execPath, [serverEntry], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: process.env.PORT ?? "3000",
    HOSTNAME: process.env.HOSTNAME ?? "0.0.0.0",
  },
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
