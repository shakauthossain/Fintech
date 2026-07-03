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
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="page-container space-y-8">
      <header>
        <h1 className="page-title">Review queue</h1>
        <p className="page-subtitle">Invoices that need manual attention</p>
      </header>

      {loading ? (
        <div className="panel py-12 text-center text-sm text-zinc-400">Loading…</div>
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-sm font-medium text-zinc-700">
              Needs review <span className="text-zinc-400">({needsReview.length})</span>
            </h2>
            <InvoiceTable invoices={needsReview} />
          </section>
          <section>
            <h2 className="mb-3 text-sm font-medium text-zinc-700">
              Errors <span className="text-zinc-400">({errored.length})</span>
            </h2>
            <InvoiceTable invoices={errored} />
          </section>
        </>
      )}
    </div>
  );
}
