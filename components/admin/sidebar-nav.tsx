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
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/admin/units", label: "Box", icon: Warehouse },
  { href: "/admin/customers", label: "Clients", icon: Users },
  { href: "/admin/contracts", label: "Contrats", icon: FileText },
  { href: "/admin/invoices", label: "Facturation", icon: Receipt },
  { href: "/admin/reservations", label: "Demandes", icon: Inbox },
  { href: "/admin/reports", label: "Rapports", icon: Download },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-0.5 p-2">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
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
    </nav>
  );
}
