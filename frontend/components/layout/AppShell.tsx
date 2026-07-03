"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { IconDashboard, IconReview, IconSettings, IconUsers } from "@/components/ui/Icons";

const nav = [
  { href: "/", label: "Dashboard", Icon: IconDashboard },
  { href: "/review", label: "Review", Icon: IconReview },
  { href: "/settings", label: "Integrations", Icon: IconSettings },
];

const superadminNav = [{ href: "/team", label: "Team", Icon: IconUsers }];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (pathname === "/login") return;
    api.me().then(({ user }) => setUser(user)).catch(() => setUser(null));
  }, [pathname]);

  if (pathname === "/login") return <>{children}</>;

  const logout = async () => {
    await api.logout();
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-[var(--sidebar-width)] shrink-0 flex-col border-r border-zinc-200 bg-white lg:flex">
        <div className="flex h-14 items-center border-b border-zinc-100 px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white">
              IP
            </span>
            <span className="text-sm font-semibold text-zinc-900">Invoice Pipeline</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {[...nav, ...(user?.role === "superadmin" ? superadminNav : [])].map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                <Icon className={active ? "text-zinc-800" : "text-zinc-400"} />
                {label}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="border-t border-zinc-100 p-3">
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2.5">
              <p className="truncate text-sm font-medium text-zinc-900">{user.email}</p>
              <p className="text-xs capitalize text-zinc-500">{user.role}</p>
            </div>
            <button onClick={logout} className="btn-ghost mt-2 w-full justify-center py-1.5 text-xs">
              Sign out
            </button>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:hidden">
          <span className="text-sm font-semibold">Invoice Pipeline</span>
          <div className="flex gap-1">
            {[...nav, ...(user?.role === "superadmin" ? superadminNav : [])].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                  pathname === href ? "bg-zinc-100 text-zinc-900" : "text-zinc-500"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </header>
        <main className="flex flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
