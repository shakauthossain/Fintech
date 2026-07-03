import Link from "next/link";
import type { Invoice } from "@/lib/types";
import { money, dateTime } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

export function InvoiceTable({ invoices, bare }: { invoices: Invoice[]; bare?: boolean }) {
  if (invoices.length === 0) {
    const empty = (
      <div className="py-14 text-center">
        <p className="text-sm font-medium text-zinc-700">No invoices yet</p>
        <p className="mt-1 text-sm text-zinc-500">Upload a file or connect Google Drive to get started</p>
      </div>
    );
    return bare ? empty : <div className="panel">{empty}</div>;
  }

  const table = (
    <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/80 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
              <th className="px-5 py-3">Invoice</th>
              <th className="px-5 py-3">Sender</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3 text-right">Total</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Processed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {invoices.map((inv) => (
              <tr key={inv.invoice_id} className="hover:bg-zinc-50/80">
                <td className="px-5 py-3.5">
                  <Link
                    href={`/invoices/${inv.invoice_id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {inv.invoice_number || "—"}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-zinc-400">{inv.source_file_name}</p>
                </td>
                <td className="px-5 py-3.5">
                  <p className="font-medium text-zinc-800">{inv.sender_name || "—"}</p>
                  <p className="text-xs text-zinc-500">{inv.sender_email}</p>
                </td>
                <td className="px-5 py-3.5 text-zinc-600">{inv.invoice_date || "—"}</td>
                <td className="px-5 py-3.5 text-right font-medium tabular-nums text-zinc-900">
                  {money(inv.total, inv.currency)}
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={inv.status} />
                </td>
                <td className="px-5 py-3.5 text-xs text-zinc-500">{dateTime(inv.processed_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
    </div>
  );

  return bare ? table : <div className="panel overflow-hidden">{table}</div>;
}

export default InvoiceTable;
