"use client";

import { useCallback, useRef, useState } from "react";
import { api } from "@/lib/api";
import { IconUpload } from "@/components/ui/Icons";
import { Alert } from "@/components/ui/Alert";

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.docx";

type UploadZoneProps = {
  onComplete?: () => void;
  /** Full-width horizontal bar — main dashboard action */
  primary?: boolean;
};

export function UploadZone({ onComplete, primary }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      setMessage(null);
      try {
        const result = await api.uploadInvoice(file);
        if (result.status === "OK") {
          setMessage("Invoice processed and saved.");
          onComplete?.();
        } else {
          setError(`Finished with status: ${result.status}`);
          onComplete?.();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setBusy(false);
      }
    },
    [onComplete]
  );

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPT}
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) upload(file);
        e.target.value = "";
      }}
    />
  );

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) upload(file);
    },
  };

  const dragClass = dragging
    ? "border-zinc-900 bg-zinc-100"
    : "border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50/80";

  if (primary) {
    return (
      <div className="w-full">
        <div
          {...dropHandlers}
          className={`flex w-full flex-wrap items-center gap-4 rounded-xl border-2 border-dashed px-5 py-4 transition ${dragClass} ${
            busy ? "opacity-60" : ""
          }`}
        >
          {input}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <IconUpload className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-900">
              {busy ? "Processing invoice…" : "Drop an invoice here or choose a file"}
            </p>
            <p className="text-xs text-zinc-500">PDF, image, Excel, or Word · Max 20 MB · Same pipeline as Google Drive</p>
          </div>
          {!busy && (
            <button type="button" onClick={() => inputRef.current?.click()} className="btn-primary shrink-0">
              Choose file
            </button>
          )}
        </div>
        {message && (
          <div className="mt-3">
            <Alert tone="success">{message}</Alert>
          </div>
        )}
        {error && (
          <div className="mt-3">
            <Alert tone="error">{error}</Alert>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="text-sm font-semibold text-zinc-900">Upload invoice</h2>
        <p className="hint">PDF, image, Excel, or Word — same processing as Drive sync</p>
      </div>
      <div className="panel-body">
        <div
          {...dropHandlers}
          className={`flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-8 transition ${dragClass} ${
            busy ? "opacity-60" : ""
          }`}
        >
          {input}
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
            <IconUpload />
          </div>
          <p className="text-sm font-medium text-zinc-900">
            {busy ? "Processing…" : "Drop a file here or browse"}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">Max 20 MB</p>
          {!busy && (
            <button type="button" onClick={() => inputRef.current?.click()} className="btn-secondary mt-3">
              Choose file
            </button>
          )}
        </div>
        {message && (
          <div className="mt-4">
            <Alert tone="success">{message}</Alert>
          </div>
        )}
        {error && (
          <div className="mt-4">
            <Alert tone="error">{error}</Alert>
          </div>
        )}
      </div>
    </div>
  );
}

export default UploadZone;
