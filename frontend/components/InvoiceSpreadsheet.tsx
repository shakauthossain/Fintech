"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import { api } from "@/lib/api";
import { money, dateTime } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

type StatusFilter = "ALL" | InvoiceStatus;

const COLUMNS = [
  { key: "row", label: "#", w: "w-10" },
  { key: "invoice_number", label: "Invoice #", w: "min-w-[7rem]" },
  { key: "sender_name", label: "Sender", w: "min-w-[9rem]" },
  { key: "sender_email", label: "Email", w: "min-w-[10rem]" },
  { key: "invoice_date", label: "Date", w: "min-w-[6rem]" },
  { key: "due_date", label: "Due date", w: "min-w-[6rem]" },
  { key: "currency", label: "Cur.", w: "w-14" },
  { key: "subtotal", label: "Subtotal", w: "min-w-[6rem]", align: "right" as const },
  { key: "tax", label: "Tax", w: "min-w-[5rem]", align: "right" as const },
  { key: "total", label: "Total", w: "min-w-[6rem]", align: "right" as const },
  { key: "status", label: "Status", w: "min-w-[5.5rem]" },
  { key: "processed_at", label: "Processed", w: "min-w-[9rem]" },
  { key: "actions", label: "Actions", w: "min-w-[11rem]" },
];

export function InvoiceSpreadsheet({
  invoices,
  loading,
  onRefresh,
  sheetLinked,
}: {
  invoices: Invoice[];
  loading?: boolean;
  onRefresh?: () => void;
  sheetLinked?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== "ALL" && inv.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        inv.invoice_number,
        inv.sender_name,
        inv.sender_email,
        inv.invoice_date,
        inv.due_date,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [invoices, query, statusFilter]);

  const setStatus = async (id: string, status: InvoiceStatus) => {
    setBusyId(id);
    try {
      await api.updateInvoice(id, { status });
      onRefresh?.();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex min-h-[28rem] flex-1 flex-col overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Invoices</h2>
          <p className="text-xs text-zinc-500">
            {filtered.length} of {invoices.length} rows · spreadsheet view
            {sheetLinked ? " · synced from Google Sheet" : ""}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            type="search"
            placeholder="Search invoices…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input h-8 w-48 text-xs"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="input h-8 w-36 text-xs"
          >
            <option value="ALL">All statuses</option>
            <option value="OK">OK</option>
            <option value="NEEDS_REVIEW">Needs review</option>
            <option value="ERROR">Error</option>
          </select>
          {onRefresh && (
            <button type="button" onClick={onRefresh} className="btn-secondary h-8 px-3 text-xs">
              Refresh
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? (
          <p className="py-16 text-center text-sm text-zinc-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500">
            {invoices.length === 0 ? "No invoices yet — upload a file to get started" : "No rows match your filters"}
          </p>
        ) : (
          <table className="spreadsheet w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10">
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`spreadsheet-cell spreadsheet-head ${col.w} ${
                      col.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => (
                <tr key={inv.invoice_id} className="spreadsheet-row">
                  <td className="spreadsheet-cell spreadsheet-row-num text-center text-zinc-400">{i + 1}</td>
                  <td className="spreadsheet-cell font-medium text-zinc-900">
                    <Link href={`/invoices/${inv.invoice_id}`} className="hover:text-blue-600 hover:underline">
                      {inv.invoice_number || "—"}
                    </Link>
                  </td>
                  <td className="spreadsheet-cell">{inv.sender_name || "—"}</td>
                  <td className="spreadsheet-cell text-zinc-600">{inv.sender_email || "—"}</td>
                  <td className="spreadsheet-cell">{inv.invoice_date || "—"}</td>
                  <td className="spreadsheet-cell">{inv.due_date || "—"}</td>
                  <td className="spreadsheet-cell text-center">{inv.currency || "—"}</td>
                  <td className="spreadsheet-cell text-right tabular-nums">{money(inv.subtotal, inv.currency)}</td>
                  <td className="spreadsheet-cell text-right tabular-nums">{money(inv.tax, inv.currency)}</td>
                  <td className="spreadsheet-cell text-right tabular-nums font-medium">{money(inv.total, inv.currency)}</td>
                  <td className="spreadsheet-cell">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="spreadsheet-cell whitespace-nowrap text-zinc-500">{dateTime(inv.processed_at)}</td>
                  <td className="spreadsheet-cell">
                    <div className="flex flex-wrap gap-1">
                      {inv.status !== "OK" && (
                        <button
                          type="button"
                          disabled={busyId === inv.invoice_id}
                          onClick={() => setStatus(inv.invoice_id, "OK")}
                          className="spreadsheet-action text-emerald-700 hover:bg-emerald-50"
                        >
                          Approve
                        </button>
                      )}
                      {inv.status !== "NEEDS_REVIEW" && (
                        <button
                          type="button"
                          disabled={busyId === inv.invoice_id}
                          onClick={() => setStatus(inv.invoice_id, "NEEDS_REVIEW")}
                          className="spreadsheet-action text-amber-700 hover:bg-amber-50"
                        >
                          Review
                        </button>
                      )}
                      <Link href={`/invoices/${inv.invoice_id}`} className="spreadsheet-action text-zinc-600 hover:bg-zinc-100">
                        Open
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default InvoiceSpreadsheet;
