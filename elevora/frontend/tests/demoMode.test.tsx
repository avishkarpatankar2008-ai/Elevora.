import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Demo-mode transparency on the client:
 *  - systemApi.health() reads the server's AI mode from the proxied endpoint;
 *  - DemoModeNotice warns when (and ONLY when) the server reports demo mode;
 *  - the health result is fetched once per session, not once per component.
 *
 * lib/aiMode caches module-wide by design, so every test re-imports the
 * component with a fresh module registry (vi.resetModules + dynamic import).
 */

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Flush pending promise chains so negative assertions run after state settles. */
async function flushPromises() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function loadNotice() {
  const { DemoModeNotice } = await import("@/components/DemoModeNotice");
  return DemoModeNotice;
}

describe("systemApi.health", () => {
  it("reports the server's AI mode from the same-origin proxy", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ status: "ok", database: "connected", aiMode: "demo" })
      );
    vi.stubGlobal("fetch", fetchMock);

    const { systemApi } = await import("@/lib/api");
    const health = await systemApi.health();

    expect(fetchMock.mock.calls[0][0]).toBe("/api/health");
    expect(health.aiMode).toBe("demo");
  });
});

describe("DemoModeNotice", () => {
  it("warns that the offline engine is running when the API reports demo mode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ status: "ok", database: "connected", aiMode: "demo" }))
    );
    const DemoModeNotice = await loadNotice();

    render(<DemoModeNotice />);

    const notice = await screen.findByRole("status");
    expect(notice).toHaveTextContent(/demo mode/i);
    // The notice must be actionable: it tells the candidate voice needs a key.
    expect(notice).toHaveTextContent(/type your answers instead/i);
  });

  it("stays silent when a real provider is configured", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ status: "ok", database: "connected", aiMode: "live" }));
    vi.stubGlobal("fetch", fetchMock);
    const DemoModeNotice = await loadNotice();

    render(<DemoModeNotice />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await flushPromises();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("stays silent when the health request fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);
    const DemoModeNotice = await loadNotice();

    render(<DemoModeNotice />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await flushPromises();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("does not warn when the backend predates the aiMode field", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ status: "ok", database: "connected" }));
    vi.stubGlobal("fetch", fetchMock);
    const DemoModeNotice = await loadNotice();

    render(<DemoModeNotice />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await flushPromises();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("fetches health once and shares it across every mount", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ status: "ok", database: "connected", aiMode: "demo" }));
    vi.stubGlobal("fetch", fetchMock);
    const DemoModeNotice = await loadNotice();

    render(<DemoModeNotice />);
    await screen.findByRole("status");
    render(<DemoModeNotice />);
    await waitFor(() => expect(screen.getAllByRole("status")).toHaveLength(2));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
