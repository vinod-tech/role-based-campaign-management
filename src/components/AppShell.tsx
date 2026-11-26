"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Icon, type IconName } from "./Icon";
import { cn, Spinner } from "./ui";
import { api } from "@/lib/api";
import type { SessionUser } from "@/lib/types";

type NavItem =
  | { type: "link"; href: string; label: string; icon: IconName }
  | { type: "group"; base: string; label: string; icon: IconName; children: { href: string; label: string; icon: IconName; exact?: boolean }[] };

const NAV: NavItem[] = [
  { type: "link", href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  {
    type: "group",
    base: "/channels",
    label: "Manage Channel",
    icon: "tv",
    children: [
      { href: "/channels/new", label: "Add Channel", icon: "plus", exact: true },
      { href: "/channels", label: "Channel List", icon: "list" },
    ],
  },
  { type: "link", href: "/sponsors", label: "Manage Sponsors", icon: "building" },
  { type: "link", href: "/districts", label: "District Master", icon: "pin" },
  { type: "link", href: "/states", label: "State Master", icon: "globe" },
  {
    type: "group",
    base: "/campaigns",
    label: "Campaign Manager",
    icon: "megaphone",
    children: [
      { href: "/campaigns/new", label: "Add Campaign", icon: "plus", exact: true },
      { href: "/campaigns", label: "Campaign List", icon: "list" },
    ],
  },
  { type: "link", href: "/msos", label: "Manage MSO", icon: "users" },
  { type: "link", href: "/reports", label: "Reports", icon: "chart" },
];

export function Logo({ light }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 text-white shadow-sm">
        <Icon name="play" className="size-4 translate-x-px" />
      </span>
      <span className={cn("text-lg font-bold tracking-tight", light ? "text-white" : "text-slate-900")}>
        Ad<span className={light ? "text-white/80" : "text-brand-600"}>Cast</span>
      </span>
    </span>
  );
}

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const isAdmin = user.role === "admin";
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawer]);

  async function logout() {
    setLoggingOut(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      qc.clear();
      router.replace("/login");
      router.refresh();
    }
  }

  const sidebar = (
    <nav aria-label="Main" className="thin-scroll flex h-full flex-col overflow-y-auto">
      <div className="flex h-16 shrink-0 items-center px-5">
        <Link href="/dashboard" aria-label="AdCast home">
          <Logo />
        </Link>
      </div>
      <ul className="flex-1 space-y-1 px-3 pb-4">
        {NAV.map((item) => {
          if (item.type === "link") {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  <Icon name={item.icon} className="size-[18px]" />
                  {item.label}
                </Link>
              </li>
            );
          }
          const groupActive = pathname === item.base || pathname.startsWith(item.base + "/");
          const open = openGroups[item.base] ?? groupActive;
          return (
            <li key={item.base}>
              <button
                onClick={() => setOpenGroups((s) => ({ ...s, [item.base]: !open }))}
                aria-expanded={open}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  groupActive ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100",
                )}
              >
                <Icon name={item.icon} className="size-[18px]" />
                <span className="flex-1 text-left">{item.label}</span>
                <Icon name="chevronDown" className={cn("size-4 transition-transform", open && "rotate-180")} />
              </button>
              {open && (
                <ul className="mt-1 space-y-0.5 pl-3">
                  {item.children.map((c) => {
                    const active = c.exact ? pathname === c.href : pathname === c.href || (pathname.startsWith(c.href + "/") && !pathname.startsWith(item.base + "/new"));
                    return (
                      <li key={c.href}>
                        <Link
                          href={c.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                            active ? "bg-brand-50 font-semibold text-brand-700" : "text-slate-600 hover:bg-slate-100",
                          )}
                        >
                          <Icon name={c.icon} className="size-4" />
                          {c.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <div className="border-t border-slate-200 p-3">
        <button
          onClick={logout}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
        >
          {loggingOut ? <Spinner className="size-[18px]" /> : <Icon name="logout" className="size-[18px]" />}
          Logout
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh">
      {/* Sidebar — admins only. Sponsors get no navigation at all. */}
      {isAdmin && (
        <>
          <aside
            className={cn(
              "fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 lg:shadow-none",
              drawer ? "translate-x-0" : "-translate-x-full",
              collapsed ? "lg:-translate-x-full" : "lg:translate-x-0",
            )}
          >
            {sidebar}
          </aside>
          {drawer && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setDrawer(false)} aria-hidden="true" />}
        </>
      )}

      <div className={cn("flex min-h-dvh flex-col transition-[padding] duration-200", isAdmin && !collapsed && "lg:pl-64")}>
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between bg-gradient-to-b from-brand-500 to-brand-800 px-4 text-white shadow-md sm:px-6">
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <button
                onClick={() => (window.matchMedia("(min-width: 1024px)").matches ? setCollapsed((c) => !c) : setDrawer((d) => !d))}
                className="rounded-lg p-2 hover:bg-white/15"
                aria-label="Toggle navigation"
                aria-expanded={drawer || !collapsed}
              >
                <Icon name="menu" className="size-5" />
              </button>
            ) : (
              <Logo light />
            )}
            {isAdmin && <span className="hidden text-sm font-medium text-white/90 sm:block">Ad Campaign Management</span>}
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="flex items-center gap-2 text-sm font-medium">
              <span className="flex size-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold uppercase">{user.name.slice(0, 2)}</span>
              <span className="hidden max-w-[10rem] truncate sm:block">{user.username}</span>
              <span className="hidden rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide md:block">{user.role}</span>
            </span>
            <button onClick={logout} disabled={loggingOut} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium hover:bg-white/15" aria-label="Logout">
              {loggingOut ? <Spinner /> : <Icon name="logout" className="size-4" />}
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
