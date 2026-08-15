"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Warehouse,
  Users,
  FileText,
  Receipt,
  Inbox,
  Download,
  Settings,
  Wallet,
  Landmark,
  CheckCircle2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

const NAV = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true, adminOnly: false },
  { href: "/admin/units", label: "Box", icon: Warehouse, adminOnly: false },
  { href: "/admin/customers", label: "Clients", icon: Users, adminOnly: false },
  { href: "/admin/contracts", label: "Contrats", icon: FileText, adminOnly: false },
  { href: "/admin/invoices", label: "Facturation", icon: Receipt, adminOnly: false },
  { href: "/admin/expenses", label: "Dépenses", icon: Wallet, adminOnly: false },
  { href: "/admin/bank", label: "Rapprochement", icon: Landmark, adminOnly: false },
  { href: "/admin/reservations", label: "Demandes", icon: Inbox, adminOnly: false },
  { href: "/admin/reports", label: "Rapports", icon: Download, adminOnly: false },
  { href: "/admin/settings", label: "Paramètres", icon: Settings, adminOnly: true },
];

// L'app compagnon « Suivi des règlements » n'est pas une page du back-office :
// c'est une PWA autonome, avec sa propre mise en page plein écran. On la
// pointe donc à part, hors de la navigation principale.
const APP_COMPAGNON = { href: "/suivi", label: "Suivi des règlements", icon: CheckCircle2 };

export function SidebarNav({ role, onNavigate }: { role: UserRole; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-0.5 p-2">
      {NAV.filter((item) => !item.adminOnly || role === "admin").map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground",
              active && "bg-accent text-accent-foreground font-medium"
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}

      <a
        href={APP_COMPAGNON.href}
        onClick={onNavigate}
        className="mt-2 flex items-center gap-2 rounded-md border border-dashed border-border px-2.5 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <APP_COMPAGNON.icon className="size-4" />
        {APP_COMPAGNON.label}
      </a>
    </nav>
  );
}
