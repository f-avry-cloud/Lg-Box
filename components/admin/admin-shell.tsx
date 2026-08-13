"use client";

import { useState } from "react";
import { LogOut, Menu, Search, X } from "lucide-react";

import { SidebarNav } from "@/components/admin/sidebar-nav";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

export function AdminShell({
  role,
  email,
  occupancy,
  children,
}: {
  role: UserRole;
  email: string | null;
  occupancy: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  function renderSidebarContent(onNavigate?: () => void) {
    return (
      <>
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <p className="font-semibold text-primary">LG BOX</p>
            <p className="text-[11px] text-muted-foreground">Back-office self-stockage</p>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary md:hidden"
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
          >
            <X className="size-5" />
          </button>
        </div>
        <form action="/admin/recherche" className="border-b border-border p-3" onSubmit={onNavigate}>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              placeholder="Rechercher un client ou un box..."
              className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </form>
        <SidebarNav role={role} onNavigate={onNavigate} />
        <div className="border-t border-border p-3 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Occupation</span>
            <span>{occupancy}%</span>
          </div>
          <div className="mt-1.5 h-1 rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${occupancy}%` }} />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border p-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{email}</p>
            <p className="text-[11px] capitalize text-muted-foreground">{role}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              title="Se déconnecter"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-x-hidden md:flex-row">
      {/* Barre mobile */}
      <div className="flex items-center justify-between border-b border-border bg-card p-3 md:hidden">
        <button
          type="button"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu className="size-5" />
        </button>
        <span className="font-semibold text-primary">LG BOX</span>
        <span className="w-7" />
      </div>

      {/* Sidebar desktop (toujours visible) */}
      <aside className="hidden w-56 flex-shrink-0 flex-col border-r border-border bg-card md:flex">
        {renderSidebarContent()}
      </aside>

      {/* Sidebar mobile (overlay) */}
      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className={cn("relative flex w-64 max-w-[80vw] flex-col bg-card shadow-lg")}>
            {renderSidebarContent(() => setOpen(false))}
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto max-w-6xl min-w-0 p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
