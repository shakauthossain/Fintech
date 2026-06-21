"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { money, dateTime } from "@/lib/format";
import type { InvoiceDetail } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setInvoice(await api.invoice(params.id));
    } catch {
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (status: "OK" | "NEEDS_REVIEW") => {
    setBusy(true);
    try {
      await api.updateInvoice(params.id, { status });
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="text-slate-400">Loading…</div>;
  if (!invoice)
    return (
      <div className="space-y-4">
        <p className="text-slate-500">Invoice not found.</p>
        <Link href="/" className="text-brand-600 hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    );

  let extra: Record<string, unknown> = {};
  try {
    extra = JSON.parse(invoice.extra_fields_json || "{}");
  } catch {
    extra = {};
  }

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-brand-600 hover:underline">
        ← Back to dashboard
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">
              {invoice.invoice_number || "(no number)"}
            </h1>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-slate-500">
            From {invoice.source_file_name || "—"} · processed {dateTime(invoice.processed_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setStatus("OK")}
            disabled={busy || invoice.status === "OK"}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            Mark OK
          </button>
          <button
            onClick={() => setStatus("NEEDS_REVIEW")}
            disabled={busy || invoice.status === "NEEDS_REVIEW"}
            className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-amber-600 disabled:opacity-50"
          >
            Flag for review
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Sender">
          <Field label="Name" value={invoice.sender_name} />
          <Field label="Email" value={invoice.sender_email} />
          <Field label="Address" value={invoice.sender_address} />
        </Card>
        <Card title="Invoice">
          <Field label="Date" value={invoice.invoice_date} />
          <Field label="Time" value={invoice.invoice_time} />
          <Field label="Due date" value={invoice.due_date} />
          <Field label="Payment terms" value={invoice.payment_terms} />
          <Field label="Currency" value={invoice.currency} />
        </Card>
      </div>

      <Card title="Line items">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2 pr-4 font-medium">Description</th>
              <th className="py-2 pr-4 font-medium text-right">Qty</th>
              <th className="py-2 pr-4 font-medium text-right">Unit</th>
              <th className="py-2 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.line_items.map((li) => (
              <tr key={li.line_id}>
                <td className="py-2 pr-4 text-slate-800">{li.description || "—"}</td>
                <td className="py-2 pr-4 text-right text-slate-600">{li.quantity ?? "—"}</td>
                <td className="py-2 pr-4 text-right text-slate-600">
                  {money(li.unit_price, invoice.currency)}
                </td>
                <td className="py-2 text-right font-medium text-slate-800">
                  {money(li.line_total, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex justify-end">
          <dl className="w-56 space-y-1 text-sm">
            <Totals label="Subtotal" value={money(invoice.subtotal, invoice.currency)} />
            <Totals label="Tax" value={money(invoice.tax, invoice.currency)} />
            <Totals label="Total" value={money(invoice.total, invoice.currency)} strong />
          </dl>
        </div>
      </Card>

      {Object.keys(extra).length > 0 && (
        <Card title="Extra fields">
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(extra).map(([k, v]) => (
              <Field key={k} label={k} value={String(v)} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="mb-2">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800">{value || "—"}</dd>
    </div>
  );
}

function Totals({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "border-t border-slate-200 pt-1 font-semibold text-slate-900" : "text-slate-600"}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
