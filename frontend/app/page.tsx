"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import type { Health, Invoice, Stats } from "@/lib/types";
import { InvoiceTable } from "@/components/InvoiceTable";

export default function DashboardPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [h, s, list] = await Promise.all([api.health(), api.stats(), api.invoices()]);
      setHealth(h);
      setStats(s);
      setInvoices(list);
    } catch (e) {
      setError(`Could not reach the backend at ${api.base}. Is it running?`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const simulate = async () => {
    setBusy(true);
    try {
      await api.simulateUpload();
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Live ledger of processed invoices
            {health && (
              <span className="ml-2 inline-flex items-center gap-1">
                <span
                  className={`h-2 w-2 rounded-full ${health.ok ? "bg-emerald-500" : "bg-rose-500"}`}
                />
                <span className="text-slate-400">
                  {health.mockMode ? "mock mode" : health.detectionMode} · {health.model}
                </span>
              </span>
            )}
          </p>
        </div>
        {health?.mockMode && (
          <button
            onClick={simulate}
            disabled={busy}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? "Processing…" : "Simulate upload"}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total invoices" value={stats?.total ?? 0} />
        <StatCard label="Line items" value={stats?.lineItems ?? 0} />
        <StatCard label="Needs review" value={stats?.byStatus?.NEEDS_REVIEW ?? 0} accent="amber" />
        <StatCard
          label="Total value"
          value={money(stats?.totalAmount ?? 0, "USD")}
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Recent invoices
        </h2>
        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-slate-400">
            Loading…
          </div>
        ) : (
          <InvoiceTable invoices={invoices} />
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "amber";
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div
        className={`mt-1 text-2xl font-semibold ${
          accent === "amber" && Number(value) > 0 ? "text-amber-600" : "text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
