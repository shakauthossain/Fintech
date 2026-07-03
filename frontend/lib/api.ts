import type {
  AuthResponse,
  DriveFolder,
  DriveSpreadsheet,
  Health,
  Invoice,
  InvoiceDetail,
  SetupStatus,
  Stats,
  User,
} from "./types";

/** Browser uses same-origin /api (proxied). Server/middleware uses INTERNAL_API_URL. */
export function apiBase(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_BASE ?? "";
  }
  return process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001";
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    cache: "no-store",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.message) message = body.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get base() {
    return apiBase();
  },
  login: (email: string, password: string) =>
    req<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => req<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  me: () => req<{ user: User }>("/api/auth/me"),
  listUsers: () => req<{ users: User[] }>("/api/auth/users"),
  createUser: (email: string, password: string) =>
    req<{ ok: boolean; user: User }>("/api/auth/users", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  health: () => req<Health>("/api/health"),
  stats: () => req<Stats>("/api/stats"),
  invoices: (status?: string) =>
    req<Invoice[]>(`/api/invoices${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  invoice: (id: string) => req<InvoiceDetail>(`/api/invoices/${id}`),
  updateInvoice: (id: string, patch: Partial<Pick<Invoice, "status">>) =>
    req<Invoice>(`/api/invoices/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  simulateUpload: (body?: { name?: string; mimeType?: string }) =>
    req<{ ok: boolean; status: string; invoiceId?: string }>("/api/simulate-upload", {
      method: "POST",
      body: JSON.stringify(body || {}),
    }),

  setupStatus: () => req<SetupStatus>("/api/setup/status"),
  connectGoogle: () => req<{ url: string }>("/api/setup/google/connect"),
  disconnectGoogle: () => req<{ ok: boolean }>("/api/setup/google/disconnect", { method: "POST" }),
  listFolders: (parent = "root") =>
    req<{ folders: DriveFolder[] }>(`/api/setup/folders?parent=${encodeURIComponent(parent)}`),
  listSpreadsheets: () => req<{ spreadsheets: DriveSpreadsheet[] }>("/api/setup/spreadsheets"),
  createSpreadsheet: (title?: string) =>
    req<{ spreadsheet: DriveSpreadsheet }>("/api/setup/spreadsheets/create", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  saveSetup: (config: {
    watchFolderId: string;
    watchFolderName?: string;
    processedFolderId?: string;
    processedFolderName?: string;
    spreadsheetId: string;
    spreadsheetName?: string;
  }) =>
    req<{ ok: boolean; setup: SetupStatus }>("/api/setup/config", {
      method: "PUT",
      body: JSON.stringify(config),
    }),

  uploadInvoice: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${apiBase()}/api/upload`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    if (!res.ok) {
      let message = "Upload failed";
      try {
        const body = await res.json();
        if (body.message) message = body.message;
      } catch {
        // ignore
      }
      throw new Error(message);
    }
    return res.json() as Promise<{ ok: boolean; status: string; invoiceId?: string }>;
  },
};

export default api;
