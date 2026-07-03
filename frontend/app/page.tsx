"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import type { Health, Invoice, Stats, User } from "@/lib/types";
import { InvoiceSpreadsheet } from "@/components/InvoiceSpreadsheet";
import { UploadZone } from "@/components/UploadZone";
import { Alert } from "@/components/ui/Alert";

export default function DashboardPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [h, me, s, list] = await Promise.all([api.health(), api.me(), api.stats(), api.invoices()]);
      setHealth(h);
      setUser(me.user);
      setStats(s);
      setInvoices(list);
    } catch {
      setError(`Cannot reach backend at ${api.base}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [load]);

  const driveWatching = health?.setup?.ready;
  const canUpload = health?.capabilities?.canProcess;

  return (
    <div className="page-container-wide min-h-[calc(100vh-4rem)] gap-4">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Upload invoices or receive them from Google Drive</p>
        </div>
        {!driveWatching && user?.role === "superadmin" && (
          <Link href="/settings" className="btn-primary shrink-0">
            Set up Google Drive
          </Link>
        )}
      </header>

      {error && <Alert tone="error">{error}</Alert>}

      <div className="flex flex-wrap gap-2">
        <StatusChip
          label="Google Drive"
          ok={driveWatching}
          detail={
            driveWatching
              ? health?.setup?.watchFolder?.name || "Watching"
              : health?.setup?.connected
                ? "Finish setup"
                : "Not connected"
          }
        />
        <StatusChip
          label="Spreadsheet"
          ok={Boolean(health?.setup?.spreadsheet)}
          detail={health?.setup?.spreadsheet?.name || "Not selected"}
        />
        <StatusChip label="AI extraction" ok={canUpload} detail={health?.model || "Not configured"} />
      </div>

      {canUpload ? (
        <UploadZone primary onComplete={load} />
      ) : (
        <div className="panel px-5 py-3">
          <Alert tone="warning">Add your OpenRouter API key in the backend to enable extraction.</Alert>
        </div>
      )}

      <StatsBar stats={stats} />

      <InvoiceSpreadsheet
        invoices={invoices}
        loading={loading}
        onRefresh={load}
        sheetLinked={health?.setup?.ready}
      />
    </div>
  );
}

function StatsBar({ stats }: { stats: Stats | null }) {
  const items = [
    { label: "Invoices", value: String(stats?.total ?? 0) },
    { label: "Line items", value: String(stats?.lineItems ?? 0) },
    {
      label: "Needs review",
      value: String(stats?.byStatus?.NEEDS_REVIEW ?? 0),
      highlight: Number(stats?.byStatus?.NEEDS_REVIEW) > 0,
    },
    { label: "Total value", value: money(stats?.totalAmount ?? 0, "USD") },
  ];

  return (
    <div className="panel flex flex-wrap divide-x divide-zinc-100">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-[8rem] flex-1 items-baseline gap-2 px-4 py-2.5">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{item.label}</span>
          <span
            className={`text-base font-semibold tabular-nums ${
              item.highlight ? "text-amber-600" : "text-zinc-900"
            }`}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatusChip({ label, detail, ok }: { label: string; detail: string; ok?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm shadow-sm">
      <span className={`h-2 w-2 shrink-0 rounded-full ${ok ? "bg-emerald-500" : "bg-zinc-300"}`} />
      <span className="font-medium text-zinc-700">{label}</span>
      <span className="max-w-[12rem] truncate text-zinc-500">{detail}</span>
    </div>
  );
}
