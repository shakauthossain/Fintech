"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DriveFolder } from "@/lib/types";
import { IconChevronRight, IconFolder, IconCheck } from "@/components/ui/Icons";

type FolderValue = { id: string; name: string } | null;
type Crumb = { id: string; name: string };
const ROOT: Crumb = { id: "root", name: "My Drive" };

export function FolderPicker({
  label,
  hint,
  optional,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  value: FolderValue;
  onChange: (folder: FolderValue) => void;
}) {
  const [path, setPath] = useState<Crumb[]>([ROOT]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const current = path[path.length - 1];

  const loadFolders = useCallback(async (parentId: string) => {
    setLoading(true);
    try {
      const res = await api.listFolders(parentId);
      setFolders(res.folders);
    } catch {
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFolders(current.id);
  }, [current.id, loadFolders]);

  const pathLabel = (name: string) =>
    [...path.slice(1).map((p) => p.name), name].filter(Boolean).join(" / ");

  return (
    <div className="space-y-3">
      <div>
        <p className="label">{label}</p>
        {hint && <p className="hint">{hint}</p>}
      </div>

      {value && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-900">
          <IconCheck className="shrink-0 text-emerald-600" />
          <span className="min-w-0 flex-1 truncate font-medium">{value.name}</span>
          <button type="button" onClick={() => onChange(null)} className="text-xs text-emerald-700 hover:underline">
            Change
          </button>
        </div>
      )}

      {!value && (
        <>
          <div className="flex flex-wrap items-center gap-1 rounded-md bg-zinc-100 px-2 py-1.5 text-xs text-zinc-600">
            {path.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center">
                {i > 0 && <IconChevronRight className="mx-0.5 h-3 w-3 text-zinc-400" />}
                <button
                  type="button"
                  onClick={() => setPath(path.slice(0, i + 1))}
                  className={`rounded px-1.5 py-0.5 hover:bg-white ${
                    i === path.length - 1 ? "font-medium text-zinc-900" : "text-zinc-600"
                  }`}
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>

          <div className="overflow-hidden rounded-md border border-zinc-200">
            {current.id !== "root" && (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    id: current.id,
                    name: path.slice(1).map((p) => p.name).join(" / "),
                  })
                }
                className="flex w-full items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-100"
              >
                <IconCheck className="h-4 w-4 text-zinc-400" />
                Use &ldquo;{current.name}&rdquo; folder
              </button>
            )}

            {loading ? (
              <p className="px-3 py-8 text-center text-sm text-zinc-400">Loading…</p>
            ) : folders.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-zinc-400">
                {current.id === "root" ? "No folders in My Drive" : "No subfolders"}
              </p>
            ) : (
              <ul className="max-h-52 divide-y divide-zinc-100 overflow-y-auto">
                {folders.map((folder) => (
                  <li key={folder.id}>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => onChange({ id: folder.id, name: pathLabel(folder.name) })}
                        className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-zinc-50"
                      >
                        <IconFolder className="shrink-0 text-zinc-400" />
                        <span className="truncate font-medium text-zinc-800">{folder.name}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPath((p) => [...p, { id: folder.id, name: folder.name }])}
                        className="flex shrink-0 items-center gap-0.5 border-l border-zinc-100 px-3 py-2.5 text-xs font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                        aria-label={`Open ${folder.name}`}
                      >
                        Open
                        <IconChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {optional && !value && <p className="hint">Optional</p>}
    </div>
  );
}

export default FolderPicker;
