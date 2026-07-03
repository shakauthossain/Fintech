"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/review", label: "Review Queue" },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (pathname === "/login") return;
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null));
  }, [pathname]);

  const logout = async () => {
    await api.logout();
    router.replace("/login");
    router.refresh();
  };

  if (pathname === "/login") return null;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            IP
          </span>
          <span className="text-lg font-semibold text-slate-900">Invoice Pipeline</span>
        </Link>
        <div className="flex items-center gap-4">
          <nav className="flex gap-1">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          {user && (
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="text-right">
                <div className="text-sm font-medium text-slate-800">{user.email}</div>
                <div className="text-xs capitalize text-slate-400">{user.role}</div>
              </div>
              <button
                onClick={logout}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default NavBar;
