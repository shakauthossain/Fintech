import type { Health, Invoice, InvoiceDetail, Stats } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  base: BASE,
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
};

export default api;
