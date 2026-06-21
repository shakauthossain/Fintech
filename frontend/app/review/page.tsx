"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Invoice } from "@/lib/types";
import { InvoiceTable } from "@/components/InvoiceTable";

export default function ReviewPage() {
  const [needsReview, setNeedsReview] = useState<Invoice[]>([]);
  const [errored, setErrored] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [nr, er] = await Promise.all([
        api.invoices("NEEDS_REVIEW"),
        api.invoices("ERROR"),
      ]);
      setNeedsReview(nr);
      setErrored(er);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Review queue</h1>
        <p className="text-sm text-slate-500">
          Invoices the system couldn&apos;t fully process. Open one to correct and resolve it.
        </p>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading…</div>
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-600">
              Needs review ({needsReview.length})
            </h2>
            <InvoiceTable invoices={needsReview} />
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-rose-600">
              Errors ({errored.length})
            </h2>
            <InvoiceTable invoices={errored} />
          </section>
        </>
      )}
    </div>
  );
}
