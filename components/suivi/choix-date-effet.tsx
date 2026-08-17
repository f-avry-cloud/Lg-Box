"use client";

import { formatDate } from "@/lib/format";
import { labelPeriode, periodeCourante, shiftPeriode } from "@/lib/suivi/period";
import { cn } from "@/lib/utils";

/**
 * Date d'effet d'une affectation : à partir de quel mois le loyer est dû.
 *
 * Sans elle, un locataire rattaché aujourd'hui pour une entrée au 1er du mois
 * prochain se retrouve facturé ce mois-ci par le bouton du tableau de bord.
 * Le choix se fait donc au moment de l'affectation, pas après coup.
 *
 * `null` signifie « ne rien changer » : proposé seulement quand le contrat a
 * déjà une date d'entrée, pour qu'un rattachement tardif (le locataire est là
 * depuis trois ans, on vient d'identifier son box) ne réécrive pas son
 * historique.
 */
export function ChoixDateEffet({
  dateDebutActuelle,
  valeur,
  onChange,
  desactive,
}: {
  dateDebutActuelle: string | null;
  /** Période d'effet choisie, ou null pour « inchangée ». */
  valeur: string | null;
  onChange: (periode: string | null) => void;
  desactive?: boolean;
}) {
  const periode = periodeCourante();

  const options: Array<{ cle: string; valeur: string | null; titre: string; detail: string }> = [];

  if (dateDebutActuelle) {
    options.push({
      cle: "inchangee",
      valeur: null,
      titre: "Date d'entrée inchangée",
      detail: `depuis le ${formatDate(dateDebutActuelle)}`,
    });
  }

  for (const decalage of [0, 1, 2]) {
    const cible = shiftPeriode(periode, decalage);
    options.push({
      cle: cible,
      valeur: cible,
      titre: labelPeriode(cible),
      detail: decalage === 0 ? "mois en cours" : decalage === 1 ? "mois prochain" : "dans deux mois",
    });
  }

  return (
    <fieldset disabled={desactive} className="mb-3">
      <legend className="mb-1 t-etiquette">
        Premier mois dû
      </legend>
      <div className="space-y-2">
        {options.map((option) => {
          const actif = option.valeur === valeur;
          return (
            <button
              key={option.cle}
              type="button"
              aria-pressed={actif}
              onClick={() => onChange(option.valeur)}
              className={cn(
                "suivi-tap flex min-h-14 w-full items-center justify-between rounded-xl border px-3 text-left",
                actif
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background active:bg-secondary"
              )}
            >
              <span className="font-semibold">{option.titre}</span>
              <span className="t-meta">{option.detail}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
