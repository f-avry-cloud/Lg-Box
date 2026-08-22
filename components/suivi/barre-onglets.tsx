"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, Inbox, LayoutDashboard, PhoneCall, Users, Warehouse } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Barre d'onglets collée en bas : sur un téléphone tenu d'une main, c'est la
 * seule zone atteignable au pouce sans changer de prise. Les écrans du
 * quotidien y sont à un tap, dans l'ordre où on les consulte.
 */
const ONGLETS = [
  { href: "/suivi/tableau-de-bord", libelle: "Tableau", icone: LayoutDashboard },
  { href: "/suivi/box", libelle: "Box", icone: Warehouse },
  { href: "/suivi", libelle: "Règlements", icone: CheckCircle2, exact: true },
  { href: "/suivi/locataires", libelle: "Locataires", icone: Users },
  { href: "/suivi/demandes", libelle: "Demandes", icone: Inbox },
  // TEMPORAIRE — campagne de reprise du centre. Se retire avec l'écran
  // /suivi/reprise une fois tous les locataires prévenus.
  { href: "/suivi/reprise", libelle: "Reprise", icone: PhoneCall },
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
          // La fiche locataire vit sous /suivi/locataire/<id> : elle appartient
          // à l'onglet Règlements, qui doit rester allumé pendant la
          // consultation. La barre oblique finale n'est pas décorative — sans
          // elle, /suivi/locataires (l'annuaire) allumerait Règlements aussi,
          // et deux onglets s'éclaireraient en même temps.
          const actif = exact
            ? pathname === href || pathname.startsWith("/suivi/locataire/")
            : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={actif ? "page" : undefined}
              className={cn(
                "suivi-tap flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1 text-[0.6875rem] font-medium",
                actif ? "text-primary" : "text-[var(--suivi-gris)]"
              )}
            >
              <Icone className={cn("size-5", actif && "fill-primary/10")} />
              {libelle}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
