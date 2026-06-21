import type { InvoiceStatus } from "@/lib/types";

const styles: Record<string, string> = {
  OK: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  NEEDS_REVIEW: "bg-amber-50 text-amber-700 ring-amber-600/20",
  ERROR: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

const labels: Record<string, string> = {
  OK: "OK",
  NEEDS_REVIEW: "Needs review",
  ERROR: "Error",
};

export function StatusBadge({ status }: { status: InvoiceStatus | string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        styles[status] || "bg-slate-100 text-slate-600 ring-slate-500/20"
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

export default StatusBadge;
