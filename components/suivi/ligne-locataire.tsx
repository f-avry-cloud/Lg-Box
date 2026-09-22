"use client";

import Link from "next/link";

import { BoutonEncaissement } from "@/components/suivi/bouton-encaissement";
import { couleurPastille, encaisseLigne, pastilleBox, statutLigne } from "@/lib/suivi/totals";
import { BOX_A_IDENTIFIER, type LigneMois } from "@/lib/suivi/types";

/**
 * Une ligne du carnet : pastille du **box**, box, locataire, loyer attendu, et
 * le bouton d'encaissement.
 *
 * Le carnet réclame un loyer par box, pas par personne. La ligne est donc
 * nommée par le box et non par le locataire : quand quelqu'un en loue deux,
 * deux lignes portaient le même nom en gras et plus rien ne disait laquelle on
 * venait de pointer. La couleur de la pastille reste tirée du nom, si bien que
 * les box d'un même locataire restent visiblement solidaires.
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
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums text-white"
          style={{ backgroundColor: couleurPastille(ligne.nom) }}
        >
          {pastilleBox(ligne.box_numero)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate t-corps font-bold text-foreground">
            {libelleBoxCourt}
          </span>
          <span className="block truncate t-meta">
            {ligne.nom}
            {ligne.societe ? ` · ${ligne.societe}` : ""}
          </span>
        </span>

        <span className="shrink-0 pr-1 text-right">
          <span className="block t-corps font-medium tabular-nums text-foreground">
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
          // Deux lignes d'un même locataire ne se distinguent que par le box :
          // l'étiquette lue à voix haute doit donc le porter.
          libelle={
            statut === "paye"
              ? `${libelleBoxCourt}, ${ligne.nom} — annuler le règlement`
              : `${libelleBoxCourt}, ${ligne.nom} — marquer comme réglé`
          }
        />
      </div>
    </li>
  );
}
