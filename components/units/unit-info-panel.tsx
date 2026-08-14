"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, User, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UnitStatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { UnitTenantInfo } from "@/lib/units/floor-plan";
import type { Unit } from "@/types/database";

// Panneau d'info du box sélectionné sur le plan interactif — sélection
// visuelle -> qui l'occupe -> accès au contrat si besoin, sans quitter le
// plan. Remplace la navigation immédiate vers la fiche box au clic, qui ne
// laissait voir aucune info avant d'avoir changé de page.
export function UnitInfoPanel({
  unit,
  tenant,
  onClose,
}: {
  unit: Unit;
  tenant: UnitTenantInfo | undefined;
  onClose: () => void;
}) {
  // Transition d'entrée déclenchée en JS plutôt que via des classes
  // "animate-in" : ce projet Tailwind v4 n'a aucun plugin d'animation
  // installé, ces classes n'existeraient nulle part ailleurs dans l'app.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-xl border border-border bg-card transition-all duration-200 ease-out",
        entered ? "translate-y-0 opacity-100 lg:translate-x-0" : "translate-y-2 opacity-0 lg:translate-x-4 lg:translate-y-0"
      )}
    >
      <div className="flex items-start justify-between gap-2 border-b border-border p-4">
        <div>
          <p className="font-mono text-lg font-semibold">Box {unit.numero}</p>
          <p className="text-sm text-muted-foreground">{unit.zone ?? "Zone non renseignée"}</p>
        </div>
        <div className="flex items-center gap-1">
          <UnitStatusBadge status={unit.statut} />
          <Button size="icon" variant="ghost" className="size-8" onClick={onClose} aria-label="Fermer">
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info label="Taille" value={unit.taille_libelle} />
          <Info label="Type" value={<span className="capitalize">{unit.type}</span>} />
          <Info label="Prix standard" value={`${formatCurrency(unit.prix_mensuel_standard)}/mois`} />
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-3">
          {tenant ? (
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <User className="size-3.5" /> Locataire
              </p>
              <Link
                href={`/admin/customers/${tenant.customerId}`}
                className="text-sm font-medium hover:text-primary"
              >
                {tenant.customerName}
              </Link>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(tenant.prixMensuel)}/mois
                {tenant.prixMensuel !== unit.prix_mensuel_standard && " (≠ prix standard)"}
              </p>
              <Link
                href={`/admin/contracts/${tenant.contractId}`}
                className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Voir le contrat <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun locataire — box libre.</p>
          )}
        </div>

        <Link
          href={`/admin/units/${unit.id}`}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Voir la fiche complète du box <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p>{value}</p>
    </div>
  );
}
