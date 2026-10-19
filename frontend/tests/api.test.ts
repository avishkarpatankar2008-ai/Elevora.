import { afterEach, describe, expect, it, vi } from "vitest";
import { API_BASE, ApiError, authApi, interviewsApi } from "@/lib/api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("API client", () => {
  it("uses the same-origin proxy by default", () => {
    // Guards the deployment contract: the browser must not be hard-wired to
    // localhost:8000, which breaks any non-local deployment and the session
    // cookie along with it.
    expect(API_BASE).toBe("/api");
  });

  it("sends the session cookie and JSON content type", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "u1", email: "a@b.c", name: "A", createdAt: "", preferences: { language: "English", defaultDifficulty: "medium" } }));
    vi.stubGlobal("fetch", fetchMock);

    await authApi.me();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/me");
    expect(init.credentials).toBe("include");
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("surfaces the backend's detail message as an ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "Incorrect email or password." }, 401)));

    await expect(authApi.login({ email: "a@b.c", password: "x" })).rejects.toMatchObject({
      message: "Incorrect email or password.",
      status: 401,
    });
  });

  it("falls back to a status message when the body isn't the expected shape", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>502</html>", { status: 502 })));

    const error = await authApi.me().catch((err) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(502);
    expect(error.message).toContain("502");
  });

  it("keeps the friendly message when a non-string detail arrives", async () => {
    // FastAPI's validation errors used to be a list of objects; showing that
    // raw to a candidate would be unreadable.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: [{ loc: ["body"], msg: "field required" }] }, 422)));

    await expect(authApi.me()).rejects.toThrow(/422/);
  });

  it("returns undefined for 204 responses instead of parsing a body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(authApi.logout()).resolves.toBeUndefined();
  });

  it("does not set Content-Type on multipart uploads (the browser adds the boundary)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ candidateProfile: { skills: [] } }));
    vi.stubGlobal("fetch", fetchMock);

    await interviewsApi.uploadResume("i1", new File(["x"], "resume.pdf", { type: "application/pdf" }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/interviews/i1/resume");
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.headers).toBeUndefined();
  });

  it("sends the answered question alongside the answer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: "in_progress" }));
    vi.stubGlobal("fetch", fetchMock);

    await interviewsApi.answer("i1", "my answer", "Which question was this?");

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      answer: "my answer",
      question: "Which question was this?",
    });
  });

  it("exposes the audio URL under the same API base", () => {
    expect(interviewsApi.questionAudioUrl("abc")).toBe("/api/interviews/abc/question-audio");
  });
});

describe("network failures", () => {
  it("turns a fetch-level failure into an actionable message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const error = await authApi.me().catch((err) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.message).toMatch(/can't reach/i);
    expect(error.message).not.toMatch(/failed to fetch/i);
  });

  it("gives 5xx responses a human message when the body isn't JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 503 })));

    const error = await authApi.me().catch((err) => err);
    expect(error.status).toBe(503);
    expect(error.message).toMatch(/try again/i);
  });

  it("does not swallow abort errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError")));

    await expect(authApi.me()).rejects.toMatchObject({ name: "AbortError" });
  });
});
