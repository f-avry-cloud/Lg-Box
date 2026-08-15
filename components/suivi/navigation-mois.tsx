"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { FeuilleModale } from "@/components/suivi/feuille-modale";
import { anneesDisponibles, formatPeriode, labelPeriode, MOIS_FR, parsePeriode, shiftPeriode } from "@/lib/suivi/period";
import { cn } from "@/lib/utils";

/**
 * Navigation par mois : flèches, libellé cliquable ouvrant un sélecteur
 * mois/année. Le balayage horizontal est géré par la liste elle-même, qui
 * appelle `vaVersPeriode` via ce même routeur.
 */
export function NavigationMois({ periode }: { periode: string }) {
  const router = useRouter();
  const [selecteurOuvert, setSelecteurOuvert] = useState(false);
  const { annee, mois } = parsePeriode(periode);
  const [anneeAffichee, setAnneeAffichee] = useState(annee);

  const va = (cible: string) => {
    router.push(`/suivi?mois=${cible}`, { scroll: false });
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Mois précédent"
          onClick={() => va(shiftPeriode(periode, -1))}
          className="suivi-tap flex h-11 w-11 items-center justify-center rounded-full text-foreground active:bg-secondary"
        >
          <ChevronLeft className="size-6" />
        </button>

        <button
          type="button"
          onClick={() => {
            setAnneeAffichee(annee);
            setSelecteurOuvert(true);
          }}
          className="suivi-tap min-h-11 flex-1 rounded-lg px-2 text-lg font-semibold text-foreground active:bg-secondary"
          aria-label={`${labelPeriode(periode)} — changer de mois`}
        >
          {labelPeriode(periode)}
        </button>

        <button
          type="button"
          aria-label="Mois suivant"
          onClick={() => va(shiftPeriode(periode, 1))}
          className="suivi-tap flex h-11 w-11 items-center justify-center rounded-full text-foreground active:bg-secondary"
        >
          <ChevronRight className="size-6" />
        </button>
      </div>

      <FeuilleModale
        ouverte={selecteurOuvert}
        titre="Choisir un mois"
        onFermer={() => setSelecteurOuvert(false)}
      >
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            aria-label="Année précédente"
            onClick={() => setAnneeAffichee((a) => a - 1)}
            className="suivi-tap flex h-11 w-11 items-center justify-center rounded-full active:bg-secondary"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="text-base font-semibold">{anneeAffichee}</span>
          <button
            type="button"
            aria-label="Année suivante"
            onClick={() => setAnneeAffichee((a) => a + 1)}
            className="suivi-tap flex h-11 w-11 items-center justify-center rounded-full active:bg-secondary"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {MOIS_FR.map((libelle, index) => {
            const cible = formatPeriode(anneeAffichee, index + 1);
            const actif = anneeAffichee === annee && index + 1 === mois;
            return (
              <button
                key={libelle}
                type="button"
                onClick={() => {
                  setSelecteurOuvert(false);
                  va(cible);
                }}
                className={cn(
                  "suivi-tap min-h-14 rounded-xl border text-base font-medium",
                  actif
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground active:bg-secondary"
                )}
              >
                {libelle}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-center text-sm text-muted-foreground">
          Années disponibles : {anneesDisponibles(periode)[0]} –{" "}
          {anneesDisponibles(periode).at(-1)}
        </p>
      </FeuilleModale>
    </>
  );
}
