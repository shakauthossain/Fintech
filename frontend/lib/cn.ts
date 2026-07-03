/** Merge class names; skips default size when a custom size is provided. */
export function iconClass(defaultSize: string, className?: string) {
  const hasSize = className?.match(/\b(h|w|size)-/);
  return [hasSize ? null : defaultSize, "shrink-0", className].filter(Boolean).join(" ");
}

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}
