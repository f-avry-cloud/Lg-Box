"use client";

import { useState } from "react";

import { FeuilleModale } from "@/components/suivi/feuille-modale";
import { Button } from "@/components/ui/button";
import { labelPeriode } from "@/lib/suivi/period";
import { encaisseLigne } from "@/lib/suivi/totals";
import { MOYEN_LABELS, MOYENS_PAIEMENT, type LigneMois, type MoyenPaiement } from "@/lib/suivi/types";
import { cn } from "@/lib/utils";

export type SaisieEncaissement = {
  montant: number;
  date: string | null;
  moyen: string | null;
  note: string | null;
};

/**
 * Saisie détaillée d'un encaissement : montant partiel, date réelle, moyen de
 * paiement. Ouverte par appui long sur le bouton, ou depuis la fiche.
 *
 * Le moyen de paiement se choisit sur une grille de gros boutons plutôt que
 * dans un <select> natif : le sélecteur roulant iOS demande trois gestes là où
 * la grille en demande un.
 */
export function FeuilleEncaissement({
  ligne,
  periode,
  onFermer,
  onValider,
}: {
  ligne: LigneMois | null;
  periode: string;
  onFermer: () => void;
  onValider: (saisie: SaisieEncaissement) => void;
}) {
  const dejaEncaisse = ligne ? encaisseLigne(ligne) : 0;
  const [montant, setMontant] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [moyen, setMoyen] = useState<MoyenPaiement | null>(null);
  const [note, setNote] = useState<string>("");
  const [initialisePour, setInitialisePour] = useState<string | null>(null);

  // Réinitialise les champs quand la feuille s'ouvre sur une autre ligne,
  // sans useEffect : on compare l'identité de la ligne au rendu.
  if (ligne && initialisePour !== ligne.contrat_id) {
    setInitialisePour(ligne.contrat_id);
    setMontant(dejaEncaisse > 0 ? String(dejaEncaisse) : "");
    setDate(ligne.reglement?.date_encaissement ?? new Date().toISOString().slice(0, 10));
    setMoyen(ligne.reglement?.moyen ?? null);
    setNote(ligne.reglement?.note ?? "");
  }

  if (!ligne) return null;

  const valeur = Number(montant);
  const montantValide = montant === "" || (Number.isFinite(valeur) && valeur >= 0);

  return (
    <FeuilleModale ouverte titre={ligne.nom} onFermer={onFermer}>
      <p className="-mt-2 mb-4 text-sm text-[var(--suivi-gris)]">
        {labelPeriode(periode)} · loyer attendu{" "}
        <strong className="text-foreground">{ligne.loyer_mensuel_eur} €</strong>
      </p>

      <label className="mb-1 block text-sm font-medium" htmlFor="suivi-montant">
        Montant encaissé (€)
      </label>
      <div className="mb-2 flex gap-2">
        <input
          id="suivi-montant"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          placeholder="0"
          className="h-14 min-w-0 flex-1 rounded-xl border border-input bg-background px-4 text-lg tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={() => setMontant(String(ligne.loyer_mensuel_eur))}
          className="suivi-tap h-14 shrink-0 rounded-xl border border-input px-4 text-sm font-medium active:bg-secondary"
        >
          Loyer plein
        </button>
      </div>
      {!montantValide && (
        <p className="mb-2 text-sm font-medium text-destructive">
          Saisissez un montant positif, en euros entiers.
        </p>
      )}

      <label className="mb-1 mt-3 block text-sm font-medium" htmlFor="suivi-date">
        Date d&apos;encaissement
      </label>
      <input
        id="suivi-date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="mb-3 h-14 w-full rounded-xl border border-input bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <span className="mb-1 block text-sm font-medium">Moyen de paiement</span>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {MOYENS_PAIEMENT.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMoyen(moyen === m ? null : m)}
            className={cn(
              "suivi-tap min-h-14 rounded-xl border text-sm font-medium",
              moyen === m
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background active:bg-secondary"
            )}
          >
            {MOYEN_LABELS[m]}
          </button>
        ))}
      </div>

      <label className="mb-1 block text-sm font-medium" htmlFor="suivi-note">
        Note (facultative)
      </label>
      <input
        id="suivi-note"
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Chèque remis le 12, à déposer"
        className="mb-4 h-14 w-full rounded-xl border border-input bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-14 flex-1 text-base"
          onClick={onFermer}
        >
          Annuler
        </Button>
        <Button
          type="button"
          className="h-14 flex-1 text-base"
          disabled={!montantValide}
          onClick={() =>
            onValider({
              montant: montant === "" ? 0 : Math.round(valeur),
              date: date || null,
              moyen,
              note: note.trim() || null,
            })
          }
        >
          Enregistrer
        </Button>
      </div>

      <p className="mt-3 text-center text-sm text-[var(--suivi-gris)]">
        Un montant à 0 € remet le mois en attente.
      </p>
    </FeuilleModale>
  );
}
