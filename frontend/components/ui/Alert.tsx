export function Alert({
  tone = "info",
  children,
}: {
  tone?: "success" | "error" | "warning" | "info";
  children: React.ReactNode;
}) {
  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-red-200 bg-red-50 text-red-800",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    info: "border-zinc-200 bg-zinc-50 text-zinc-700",
  }[tone];

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles}`}>{children}</div>
  );
}
