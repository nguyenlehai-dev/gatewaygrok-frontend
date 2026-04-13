import type {
  AuthBootstrap,
  AuthLoginResponse,
  ApiKeyCreated,
  ApiKeyRecord,
  JobRecord,
  MetaRecord,
  OverviewRecord,
  Profile,
  ProfileAssetRecord,
  ProxyRecord,
  SessionCheckRecord,
  SettingsRecord,
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8001/api";
const API_ORIGIN = API_BASE.replace(/\/api$/, "");
const ADMIN_TOKEN_KEY = "gatewaygrok_admin_token";

let adminToken = window.localStorage.getItem(ADMIN_TOKEN_KEY);

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (adminToken && !headers.has("Authorization") && !path.startsWith("/client/")) {
    headers.set("Authorization", `Bearer ${adminToken}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    try {
      const payload = JSON.parse(text) as {
        detail?: string | { message?: string; summary?: string; session_state?: string; indicators?: string[] };
      };
      if (typeof payload.detail === "string") {
        throw new Error(payload.detail);
      }
      if (payload.detail) {
        const summary = payload.detail.summary ?? payload.detail.message ?? `Request failed: ${response.status}`;
        const state = payload.detail.session_state ? ` (${payload.detail.session_state})` : "";
        throw new Error(`${summary}${state}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
    }
    throw new Error(text || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  getBootstrap: () => request<AuthBootstrap>("/auth/bootstrap"),
  login: (username: string, password: string) =>
    request<AuthLoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  getMeta: () => request<MetaRecord>("/meta"),
  getOverview: () => request<OverviewRecord>("/overview"),
  getProfiles: () => request<Profile[]>("/profiles"),
  createProfile: (body: Record<string, unknown>) =>
    request<Profile>("/profiles", { method: "POST", body: JSON.stringify(body) }),
  updateProfile: (id: string, body: Record<string, unknown>) =>
    request<Profile>(`/profiles/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteProfile: (id: string) => request<void>(`/profiles/${id}`, { method: "DELETE" }),
  importCookies: (profileId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<Profile>(`/profiles/${profileId}/cookies`, {
      method: "POST",
      body: formData,
    });
  },
  uploadProfileAsset: (profileId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<ProfileAssetRecord>(`/profiles/${profileId}/assets`, {
      method: "POST",
      body: formData,
    });
  },
  sessionCheck: (profileId: string) =>
    request<SessionCheckRecord>(`/profiles/${profileId}/session-check`, {
      method: "POST",
    }),
  launchLogin: (profileId: string) =>
    request<{ launched: boolean; profile_id: string; provider: string; message: string }>(
      `/profiles/${profileId}/launch-login`,
      {
        method: "POST",
      },
    ),
  getProxies: () => request<ProxyRecord[]>("/proxies"),
  createProxy: (body: Record<string, unknown>) =>
    request<ProxyRecord>("/proxies", { method: "POST", body: JSON.stringify(body) }),
  updateProxy: (id: string, body: Record<string, unknown>) =>
    request<ProxyRecord>(`/proxies/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteProxy: (id: string) => request<void>(`/proxies/${id}`, { method: "DELETE" }),
  getApiKeys: () => request<ApiKeyRecord[]>("/api-keys"),
  createApiKey: (body: Record<string, unknown>) =>
    request<ApiKeyCreated>("/api-keys", { method: "POST", body: JSON.stringify(body) }),
  updateApiKey: (id: string, body: Record<string, unknown>) =>
    request<ApiKeyRecord>(`/api-keys/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  getSettings: () => request<SettingsRecord>("/settings"),
  updateSettings: (body: Record<string, unknown>) =>
    request<SettingsRecord>("/settings", { method: "PUT", body: JSON.stringify(body) }),
  getJobs: () => request<JobRecord[]>("/jobs"),
  createJob: (body: Record<string, unknown>) =>
    request<JobRecord>("/jobs", { method: "POST", body: JSON.stringify(body) }),
  retryJob: (id: string) => request<JobRecord>(`/jobs/${id}/retry`, { method: "POST" }),
  deleteJob: (id: string) => request<void>(`/jobs/${id}`, { method: "DELETE" }),
  verifyClientKey: (key: string) =>
    request<{ status: string; name: string; key_prefix: string }>(`/client/verify`, {
      headers: { "X-API-Key": key },
    }),
};

export function setAdminToken(token: string | null) {
  adminToken = token;
  if (token) {
    window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
    return;
  }
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function getAdminToken() {
  return adminToken;
}

export function toBackendStorageUrl(value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
    return value;
  }
  const normalized = value.replace(/\\/g, "/").replace(/^\.?\//, "");
  if (normalized.startsWith("storage/")) {
    return `${API_ORIGIN}/${normalized}`;
  }
  return value;
}
