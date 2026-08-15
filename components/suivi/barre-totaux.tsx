"use client";

import type { TotauxMois } from "@/lib/suivi/totals";

/**
 * Barre de totaux collante en bas de l'écran. C'est l'information que
 * l'exploitant garde sous les yeux pendant tout le pointage : elle est
 * recalculée côté client à chaque tap, sans attendre le serveur.
 */
export function BarreTotaux({ totaux }: { totaux: TotauxMois }) {
  const attendu = totaux.encaisse + totaux.reste;
  const progression = attendu === 0 ? 0 : Math.round((totaux.encaisse / attendu) * 100);

  return (
    <div className="suivi-totaux fixed inset-x-0 z-30 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto max-w-2xl px-4 pb-2 pt-2">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <span className="block text-xs font-medium uppercase tracking-wide text-[var(--suivi-gris)]">
              Encaissé
            </span>
            <span className="block text-xl font-bold tabular-nums text-[var(--suivi-vert)]">
              {totaux.encaisse.toLocaleString("fr-FR")} €
            </span>
          </div>
          <div className="text-right">
            <span className="block text-xs font-medium uppercase tracking-wide text-[var(--suivi-gris)]">
              Reste à encaisser
            </span>
            <span className="block text-xl font-bold tabular-nums text-[var(--suivi-orange)]">
              {totaux.reste.toLocaleString("fr-FR")} €
            </span>
          </div>
        </div>

        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-valuenow={progression}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Part du mois encaissée"
        >
          <div
            className="h-full rounded-full bg-[var(--suivi-vert)] transition-[width] duration-150"
            style={{ width: `${progression}%` }}
          />
        </div>

        <p className="mt-1 text-center text-sm font-medium tabular-nums text-[var(--suivi-gris)]">
          {totaux.regles} / {totaux.total} locataires
        </p>
      </div>
    </div>
  );
}
