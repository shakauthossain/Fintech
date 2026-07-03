"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { DriveSpreadsheet, SetupStatus, User } from "@/lib/types";
import { FolderPicker } from "@/components/FolderPicker";
import { Alert } from "@/components/ui/Alert";

type FolderChoice = { id: string; name: string } | null;

export default function SettingsContent() {
  const params = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [setup, setSetup] = useState<SetupStatus | null>(null);
  const [spreadsheets, setSpreadsheets] = useState<DriveSpreadsheet[]>([]);
  const [watchFolder, setWatchFolder] = useState<FolderChoice>(null);
  const [processedFolder, setProcessedFolder] = useState<FolderChoice>(null);
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canManage = setup?.canManageIntegrations ?? user?.role === "superadmin";

  const load = useCallback(async () => {
    const [{ user: me }, status] = await Promise.all([api.me(), api.setupStatus()]);
    setUser(me);
    setSetup(status);
    setWatchFolder(status.watchFolder ? { id: status.watchFolder.id, name: status.watchFolder.name } : null);
    setProcessedFolder(
      status.processedFolder ? { id: status.processedFolder.id, name: status.processedFolder.name } : null
    );
    setSpreadsheetId(status.spreadsheet?.id || "");
    if (status.connected && status.canManageIntegrations) {
      const s = await api.listSpreadsheets();
      setSpreadsheets(s.spreadsheets);
    }
  }, []);

  useEffect(() => {
    load().catch(() => setError("Could not load settings"));
  }, [load]);

  useEffect(() => {
    if (params.get("connected")) setMessage("Google account connected.");
    if (params.get("error")) setError(`Connection failed: ${params.get("error")}`);
  }, [params]);

  const connectGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      const { url } = await api.connectGoogle();
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start sign-in");
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const sheet = spreadsheets.find((s) => s.id === spreadsheetId);
      await api.saveSetup({
        watchFolderId: watchFolder!.id,
        watchFolderName: watchFolder!.name,
        processedFolderId: processedFolder?.id || "",
        processedFolderName: processedFolder?.name || "",
        spreadsheetId,
        spreadsheetName: sheet?.name,
      });
      await load();
      setMessage("Setup complete. Drive folder is now being watched.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-container max-w-2xl space-y-6">
      <header>
        <h1 className="page-title">Integrations</h1>
        <p className="page-subtitle">
          {canManage
            ? "Connect Google Drive and choose where data is stored"
            : "View connected Google Drive and spreadsheet links"}
        </p>
      </header>

      {message && <Alert tone="success">{message}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      {!canManage && (
        <Alert tone="warning">
          Only a superadmin can connect Google or change folders and spreadsheets. You can open the linked resources
          below.
        </Alert>
      )}

      <Step n={1} title="Google account" done={setup?.connected}>
        {setup?.connected ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-500">Signed in as</p>
              <p className="font-medium text-zinc-900">{setup.googleEmail}</p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={async () => {
                  setBusy(true);
                  await api.disconnectGoogle();
                  await load();
                  setBusy(false);
                }}
                disabled={busy}
                className="btn-secondary text-xs"
              >
                Disconnect
              </button>
            )}
          </div>
        ) : canManage ? (
          setup?.oauthConfigured === false ? (
            <Alert tone="warning">
              Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the backend .env, then restart the server.
            </Alert>
          ) : (
            <button type="button" onClick={connectGoogle} disabled={busy} className="btn-primary">
              Connect Google account
            </button>
          )
        ) : (
          <p className="text-sm text-zinc-500">Not connected yet. Ask your superadmin to set up Google.</p>
        )}
      </Step>

      {setup?.connected && (
        <>
          <Step n={2} title="Drive folders" done={Boolean(watchFolder)}>
            {canManage ? (
              <div className="space-y-6">
                <FolderPicker
                  label="Inbox folder"
                  hint="Invoices dropped here are processed automatically"
                  value={watchFolder}
                  onChange={setWatchFolder}
                />
                <FolderPicker
                  label="Processed folder"
                  hint="Successful files are moved here"
                  optional
                  value={processedFolder}
                  onChange={setProcessedFolder}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <ResourceRow
                  label="Inbox folder"
                  name={setup.watchFolder?.name}
                  url={setup.watchFolder?.url}
                />
                <ResourceRow
                  label="Processed folder"
                  name={setup.processedFolder?.name || "Not set"}
                  url={setup.processedFolder?.url}
                  optional
                />
              </div>
            )}
          </Step>

          <Step n={3} title="Output spreadsheet" done={Boolean(spreadsheetId)}>
            {canManage ? (
              <div className="space-y-3">
                <label className="block">
                  <span className="label">Ledger spreadsheet</span>
                  <select
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    className="input mt-1.5"
                  >
                    <option value="">Select a spreadsheet…</option>
                    {spreadsheets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const { spreadsheet } = await api.createSpreadsheet("Invoice Pipeline Ledger");
                        setSpreadsheets((p) => [spreadsheet, ...p]);
                        setSpreadsheetId(spreadsheet.id);
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="btn-secondary text-xs"
                  >
                    Create new spreadsheet
                  </button>
                  {setup.spreadsheet?.url && (
                    <Link href={setup.spreadsheet.url} target="_blank" className="btn-ghost text-xs">
                      Open current sheet
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <ResourceRow
                label="Ledger spreadsheet"
                name={setup.spreadsheet?.name}
                url={setup.spreadsheet?.url}
              />
            )}
          </Step>

          {canManage && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={save}
                disabled={busy || !watchFolder || !spreadsheetId}
                className="btn-primary"
              >
                Save and start watching
              </button>
            </div>
          )}
        </>
      )}

      {setup?.ready && (
        <Alert tone="success">
          Active — watching <strong>{setup.watchFolder?.name}</strong>, writing to{" "}
          <strong>{setup.spreadsheet?.name}</strong>.
        </Alert>
      )}
    </div>
  );
}

function ResourceRow({
  label,
  name,
  url,
  optional,
}: {
  label: string;
  name?: string | null;
  url?: string | null;
  optional?: boolean;
}) {
  const display = name || (optional ? "Not set" : "—");
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
        <p className="text-sm font-medium text-zinc-900">{display}</p>
      </div>
      {url && (
        <Link href={url} target="_blank" className="btn-secondary text-xs">
          Open in Google
        </Link>
      )}
    </div>
  );
}

function Step({
  n,
  title,
  done,
  children,
}: {
  n: number;
  title: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-header flex items-center gap-3">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            done ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {n}
        </span>
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}
