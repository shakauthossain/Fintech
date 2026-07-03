import type { InvoiceStatus } from "@/lib/types";

const styles: Record<string, string> = {
  OK: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  NEEDS_REVIEW: "bg-amber-50 text-amber-800 ring-amber-600/15",
  ERROR: "bg-red-50 text-red-700 ring-red-600/15",
};

const labels: Record<string, string> = {
  OK: "OK",
  NEEDS_REVIEW: "Review",
  ERROR: "Error",
};

export function StatusBadge({ status }: { status: InvoiceStatus | string }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        styles[status] || "bg-zinc-100 text-zinc-600 ring-zinc-500/10"
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

export default StatusBadge;
