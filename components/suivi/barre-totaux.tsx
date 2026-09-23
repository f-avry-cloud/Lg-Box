"use client";

import type { ParcBox } from "@/lib/suivi/repository";
import type { TotauxMois } from "@/lib/suivi/totals";

/**
 * Barre de totaux collante en bas de l'écran. C'est l'information que
 * l'exploitant garde sous les yeux pendant tout le pointage : elle est
 * recalculée côté client à chaque tap, sans attendre le serveur.
 */
export function BarreTotaux({ totaux, parc }: { totaux: TotauxMois; parc: ParcBox }) {
  const attendu = totaux.encaisse + totaux.reste;
  const progression = attendu === 0 ? 0 : Math.round((totaux.encaisse / attendu) * 100);

  return (
    <div className="suivi-totaux fixed inset-x-0 z-30 border-t border-[var(--suivi-trait)] bg-card/95 backdrop-blur">
      <div className="mx-auto max-w-2xl px-4 pb-2 pt-2">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <span className="t-etiquette block">Encaissé</span>
            <span
              className="t-chiffre block"
              style={{
                color: totaux.encaisse > 0 ? "var(--suivi-vert)" : "var(--foreground)",
              }}
            >
              {totaux.encaisse.toLocaleString("fr-FR")} €
            </span>
          </div>
          <div className="text-right">
            <span className="t-etiquette block">Reste à encaisser</span>
            <span className="t-chiffre block text-[var(--suivi-orange)]">
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

        {/* Trois comptes, et trois questions différentes : où en est
            l'occupation du parc, ce qui reste à louer, et où en est le
            pointage du mois. Le dénominateur du pointage est le nombre de
            **contrats dus**, non celui des box : un bail peut porter sur deux
            box, et un box peut se louer sans que son contrat soit saisi. */}
        <p className="t-meta t-nombre mt-1 text-center">
          <span>
            {parc.loues} box loué{parc.loues > 1 ? "s" : ""} / {parc.total}
          </span>
          {parc.vides > 0 && (
            <>
              {" · "}
              <span className="font-medium text-[var(--suivi-rouge)]">
                {parc.vides} vide{parc.vides > 1 ? "s" : ""}
              </span>
            </>
          )}
          <span className="block">
            {totaux.regles} payé{totaux.regles > 1 ? "s" : ""} / {totaux.total} loyer
            {totaux.total > 1 ? "s" : ""} dus
          </span>
        </p>
      </div>
    </div>
  );
}
