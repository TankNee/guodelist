/** Thin REST client for the Guodelist sync API. */
export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ||
  "https://api.example.com";

const TOKEN_KEY = "guodelist:token";

export interface Account {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user" | string;
  disabled?: boolean;
  createdAt?: string;
}

export interface SyncPayload {
  lists: unknown[];
  tasks: unknown[];
  deleted: { lists: Record<string, string>; tasks: Record<string, string> };
}

export interface SyncResult {
  serverTime: string;
  lists: unknown[];
  tasks: unknown[];
  deleted: { lists: Record<string, string>; tasks: Record<string, string> };
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY) || "",
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(path: string, init: RequestInit = {}, token = tokenStore.get()): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `请求失败（${res.status}）`);
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: Account }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }, ""),

  register: (email: string, password: string, name: string) =>
    request<{ token: string; user: Account }>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }, ""),

  me: () => request<{ user: Account }>("/api/v1/me"),

  sync: (payload: SyncPayload) =>
    request<SyncResult>("/api/v1/sync", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
