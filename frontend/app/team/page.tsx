"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { Alert } from "@/components/ui/Alert";

export default function TeamContent() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { user } = await api.me();
    if (user.role !== "superadmin") {
      router.replace("/");
      return;
    }
    setCurrentUser(user);
    const { users: list } = await api.listUsers();
    setUsers(list);
  }, [router]);

  useEffect(() => {
    load()
      .catch(() => setError("Could not load team"))
      .finally(() => setLoading(false));
  }, [load]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api.createUser(email, password);
      setEmail("");
      setPassword("");
      setMessage("Member added.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add member");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="page-container text-sm text-zinc-400">Loading…</div>;
  }

  if (!currentUser) return null;

  return (
    <div className="page-container max-w-2xl space-y-6">
      <header>
        <h1 className="page-title">Team</h1>
        <p className="page-subtitle">Add members who can use the app but cannot change integrations</p>
      </header>

      {message && <Alert tone="success">{message}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      <section className="panel">
        <div className="panel-header">
          <h2 className="text-sm font-semibold text-zinc-900">Add member</h2>
          <p className="hint">Members can upload and review invoices. Integrations are view-only for them.</p>
        </div>
        <form onSubmit={onSubmit} className="panel-body space-y-4">
          <label className="block">
            <span className="label">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input mt-1.5"
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className="label">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input mt-1.5"
              autoComplete="new-password"
            />
            <p className="hint">Minimum 8 characters</p>
          </label>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Adding…" : "Add member"}
          </button>
        </form>
      </section>

      <section className="panel overflow-hidden">
        <div className="panel-header">
          <h2 className="text-sm font-semibold text-zinc-900">Accounts</h2>
        </div>
        <ul className="divide-y divide-zinc-100">
          {users.map((user) => (
            <li key={user.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <p className="font-medium text-zinc-900">{user.email}</p>
                <p className="text-xs capitalize text-zinc-500">{user.role}</p>
              </div>
              {user.id === currentUser.id && (
                <span className="text-xs text-zinc-400">You</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
