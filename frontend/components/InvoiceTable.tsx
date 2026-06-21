import Link from "next/link";
import type { Invoice } from "@/lib/types";
import { money, dateTime } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

export function InvoiceTable({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        No invoices yet. Drop a file in the watched Drive folder — or use
        <span className="font-medium text-slate-700"> Simulate upload</span> to add one.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Invoice #</th>
            <th className="px-4 py-3 font-medium">Sender</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium text-right">Total</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Processed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invoices.map((inv) => (
            <tr key={inv.invoice_id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link
                  href={`/invoices/${inv.invoice_id}`}
                  className="font-medium text-brand-600 hover:underline"
                >
                  {inv.invoice_number || "(no number)"}
                </Link>
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-slate-800">{inv.sender_name || "—"}</div>
                <div className="text-xs text-slate-500">{inv.sender_email || ""}</div>
              </td>
              <td className="px-4 py-3 text-slate-600">{inv.invoice_date || "—"}</td>
              <td className="px-4 py-3 text-right font-medium text-slate-800">
                {money(inv.total, inv.currency)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={inv.status} />
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">{dateTime(inv.processed_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default InvoiceTable;
