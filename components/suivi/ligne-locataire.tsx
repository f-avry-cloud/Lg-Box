"use client";

import Link from "next/link";

import { BoutonEncaissement } from "@/components/suivi/bouton-encaissement";
import { encaisseLigne, couleurPastille, initiales, statutLigne } from "@/lib/suivi/totals";
import { BOX_A_IDENTIFIER, type LigneMois } from "@/lib/suivi/types";

/**
 * Une ligne du carnet : pastille d'initiales, nom, box, loyer attendu, et le
 * bouton d'encaissement.
 *
 * Deux cibles tactiles distinctes se partagent la ligne — le lien vers la
 * fiche et le bouton. Le bouton est posé à côté du lien (et non dedans) : un
 * bouton imbriqué dans un <a> déclenche la navigation au moindre relâchement
 * décalé, ce qui ferait quitter la liste en plein pointage.
 */
export function LigneLocataire({
  ligne,
  periode,
  onBascule,
  onAppuiLong,
}: {
  ligne: LigneMois;
  periode: string;
  onBascule: () => void;
  onAppuiLong: () => void;
}) {
  const statut = statutLigne(ligne);
  const encaisse = encaisseLigne(ligne);
  const libelleBoxCourt = ligne.box_numero
    ? `Box ${ligne.box_numero}${ligne.batiment ? ` · ${ligne.batiment}` : ""}`
    : BOX_A_IDENTIFIER;

  return (
    <li className="flex items-stretch gap-2 border-b border-border/70 bg-card">
      <Link
        href={`/suivi/locataire/${encodeURIComponent(ligne.locataire_id)}?mois=${periode}`}
        className="suivi-tap flex min-h-[4.5rem] flex-1 items-center gap-3 py-2 pl-3 active:bg-secondary/60"
      >
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: couleurPastille(ligne.nom) }}
        >
          {initiales(ligne.nom)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-bold text-foreground">{ligne.nom}</span>
          <span className="block truncate text-sm text-[var(--suivi-gris)]">
            {ligne.societe ? `${ligne.societe} · ` : ""}
            {libelleBoxCourt}
          </span>
        </span>

        <span className="shrink-0 pr-1 text-right">
          <span className="block text-base font-semibold tabular-nums text-foreground">
            {ligne.loyer_mensuel_eur} €
          </span>
          {statut === "partiel" && (
            <span className="block text-sm font-medium tabular-nums text-[var(--suivi-orange)]">
              reste {Math.max(0, ligne.loyer_mensuel_eur - encaisse)} €
            </span>
          )}
        </span>
      </Link>

      <div className="flex items-center pr-3">
        <BoutonEncaissement
          statut={statut}
          montantEncaisse={encaisse}
          onBascule={onBascule}
          onAppuiLong={onAppuiLong}
          libelle={
            statut === "paye"
              ? `${ligne.nom} — annuler le règlement`
              : `${ligne.nom} — marquer comme réglé`
          }
        />
      </div>
    </li>
  );
}
