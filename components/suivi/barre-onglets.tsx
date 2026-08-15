"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, LayoutDashboard, Warehouse } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Barre d'onglets collée en bas : sur un téléphone tenu d'une main, c'est la
 * seule zone atteignable au pouce sans changer de prise. Les trois écrans du
 * quotidien y sont à un tap, dans l'ordre où on les consulte.
 */
const ONGLETS = [
  { href: "/suivi/tableau-de-bord", libelle: "Tableau", icone: LayoutDashboard },
  { href: "/suivi/box", libelle: "Box", icone: Warehouse },
  { href: "/suivi", libelle: "Règlements", icone: CheckCircle2, exact: true },
];

export function BarreOnglets() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="suivi-safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card"
    >
      <div className="mx-auto flex max-w-2xl">
        {ONGLETS.map(({ href, libelle, icone: Icone, exact }) => {
          // La fiche locataire vit sous /suivi/locataire : elle appartient à
          // l'onglet Règlements, qui doit rester allumé pendant la consultation.
          const actif = exact
            ? pathname === href || pathname.startsWith("/suivi/locataire")
            : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={actif ? "page" : undefined}
              className={cn(
                "suivi-tap flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-1 text-xs font-semibold",
                actif ? "text-primary" : "text-[var(--suivi-gris)]"
              )}
            >
              <Icone className={cn("size-6", actif && "fill-primary/10")} />
              {libelle}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
