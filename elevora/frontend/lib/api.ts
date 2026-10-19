import type {
  AnswerResult,
  AudioAnswerResult,
  CandidateProfile,
  ExitInterviewResult,
  Interview,
  InterviewConfig,
  InterviewProfile,
  InterviewProfileInput,
  InterviewReport,
  InterviewTurn,
  JobProfile,
  StartInterviewResult,
  User,
  UserPreferences,
  WebcamMetrics,
} from "./types";

/**
 * Where the API lives, from the browser's point of view.
 *
 * Defaults to the same-origin `/api` path, which `next.config.js` proxies to
 * the FastAPI service (BACKEND_ORIGIN). Same-origin keeps the session cookie
 * first-party — no CORS preflights, no SameSite=None, nothing to misconfigure
 * in production. Set NEXT_PUBLIC_API_URL only when the API genuinely lives on
 * another origin.
 */
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "/api").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Normalizes the backend's error envelope, which is always `{detail: string}`. */
async function errorFromResponse(res: Response): Promise<ApiError> {
  let message =
    res.status >= 500
      ? `The server had a problem (${res.status}). Try again in a moment.`
      : `Request failed with status ${res.status}`;
  if (res.headers.get("content-type")?.includes("application/json")) {
    try {
      const body = await res.json();
      if (body && typeof body.detail === "string" && body.detail.trim()) {
        message = body.detail;
      }
    } catch {
      // Non-JSON body (a proxy error page, for example) — keep the status message.
    }
  }
  return new ApiError(message, res.status);
}

/**
 * A fetch-level failure (offline, DNS, connection refused, CORS) is not an HTTP
 * response at all. Without this, the browser's bare "Failed to fetch" leaks to
 * the UI, which tells the candidate nothing actionable.
 */
function networkError(): ApiError {
  return new ApiError(
    "Can't reach the ELEVORA server. Check your connection and try again.",
    0
  );
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: "include", // send/receive the HTTP-only session cookie
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch (err) {
    // Aborts are control flow, not failures — let callers handle them.
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw networkError();
  }

  if (res.status === 204) {
    return undefined as T;
  }
  if (!res.ok) {
    throw await errorFromResponse(res);
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  return (isJson ? await res.json() : undefined) as T;
}

/**
 * Multipart upload. The Content-Type header is deliberately left unset so the
 * browser adds the multipart boundary itself.
 */
async function requestForm<T>(path: string, form: FormData): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw networkError();
  }

  if (!res.ok) {
    throw await errorFromResponse(res);
  }
  const isJson = res.headers.get("content-type")?.includes("application/json");
  return (isJson ? await res.json() : undefined) as T;
}

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    request<User>("/auth/register", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<User>("/auth/login", { method: "POST", body: JSON.stringify(data) }),

  logout: () => request<void>("/auth/logout", { method: "POST" }),

  me: () => request<User>("/auth/me"),

  updateMe: (data: { name?: string; preferences?: Partial<UserPreferences> }) =>
    request<User>("/auth/me", { method: "PATCH", body: JSON.stringify(data) }),
};

export const profilesApi = {
  list: () => request<InterviewProfile[]>("/interview-profiles"),

  get: (id: string) => request<InterviewProfile>(`/interview-profiles/${id}`),

  create: (data: InterviewProfileInput) =>
    request<InterviewProfile>("/interview-profiles", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<InterviewProfileInput>) =>
    request<InterviewProfile>(`/interview-profiles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  remove: (id: string) => request<void>(`/interview-profiles/${id}`, { method: "DELETE" }),
};

export const interviewsApi = {
  create: (data: InterviewConfig) =>
    request<Interview>("/interviews", { method: "POST", body: JSON.stringify(data) }),

  /** Bounded listing: the API caps a page at 200 and defaults to 50. */
  list: (options: { limit?: number; offset?: number } = {}, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    if (options.limit) params.set("limit", String(options.limit));
    if (options.offset) params.set("offset", String(options.offset));
    const query = params.toString();
    return request<Interview[]>(`/interviews${query ? `?${query}` : ""}`, { signal });
  },

  get: (id: string, signal?: AbortSignal) => request<Interview>(`/interviews/${id}`, { signal }),

  remove: (id: string) => request<void>(`/interviews/${id}`, { method: "DELETE" }),

  start: (id: string) => request<StartInterviewResult>(`/interviews/${id}/start`, { method: "POST" }),

  /** `question` is the text the candidate was answering. Sending it back makes
   * a duplicate or delayed submission detectable server-side instead of being
   * recorded against whatever question is pending by then. */
  answer: (id: string, answer: string, question?: string) =>
    request<AnswerResult>(`/interviews/${id}/answer`, {
      method: "POST",
      body: JSON.stringify({ answer, question }),
    }),

  turns: (id: string, signal?: AbortSignal) =>
    request<InterviewTurn[]>(`/interviews/${id}/turns`, { signal }),

  exit: (id: string) => request<ExitInterviewResult>(`/interviews/${id}/exit`, { method: "POST" }),

  /** Not a fetch helper — the <audio> path is hit directly because it returns
   * raw audio bytes, not JSON. */
  questionAudioUrl: (id: string) => `${API_BASE}/interviews/${id}/question-audio`,

  /** Fetches the spoken question as a Blob so callers can control playback and
   * surface failures (autoplay policies, a missing OpenAI key, …). */
  questionAudio: async (id: string, signal?: AbortSignal): Promise<Blob> => {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/interviews/${id}/question-audio`, {
        credentials: "include",
        signal,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      throw networkError();
    }
    if (!res.ok) throw await errorFromResponse(res);
    return res.blob();
  },

  answerAudio: (id: string, blob: Blob, filename: string, question?: string) => {
    const form = new FormData();
    form.append("audio_file", blob, filename);
    if (question) form.append("question", question);
    return requestForm<AudioAnswerResult>(`/interviews/${id}/answer/audio`, form);
  },

  uploadResume: async (id: string, file: File): Promise<CandidateProfile> => {
    const form = new FormData();
    form.append("file", file);
    const body = await requestForm<{ candidateProfile: CandidateProfile }>(
      `/interviews/${id}/resume`,
      form
    );
    return body.candidateProfile;
  },

  uploadJobDescription: async (
    id: string,
    source: { text: string } | { file: File }
  ): Promise<JobProfile> => {
    const form = new FormData();
    if ("file" in source) {
      form.append("file", source.file);
    } else {
      form.append("text", source.text);
    }
    const body = await requestForm<{ jobProfile: JobProfile }>(
      `/interviews/${id}/job-description`,
      form
    );
    return body.jobProfile;
  },

  generateReport: (id: string) =>
    request<InterviewReport>(`/interviews/${id}/report`, { method: "POST" }),

  getReport: (id: string, signal?: AbortSignal) =>
    request<InterviewReport>(`/interviews/${id}/report`, { signal }),

  submitWebcamMetrics: (id: string, metrics: WebcamMetrics) =>
    request<WebcamMetrics>(`/interviews/${id}/webcam-metrics`, {
      method: "POST",
      body: JSON.stringify(metrics),
    }),
};
