"use server";

// Server Actions de l'application « Suivi des règlements ».
//
// Critère d'acceptation n°6 : aucune donnée personnelle n'est journalisée.
// Ces actions ne manipulent que des identifiants et des montants, et ne
// tracent rien dans activity_log — le carnet d'encaissement n'a pas besoin
// d'un journal d'audit nominatif.

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { isPeriode } from "@/lib/suivi/period";
import {
  annuleReglement,
  enregistreObservations,
  enregistreReglement,
  estModeDemo,
} from "@/lib/suivi/repository";
import { MOYENS_PAIEMENT, type MoyenPaiement } from "@/lib/suivi/types";

/**
 * Le mode démo tourne sans Supabase, donc sans session : exiger un profil
 * staff y provoquerait une redirection vers /connexion, elle-même inopérante.
 */
async function autorise(): Promise<void> {
  if (estModeDemo()) return;
  await requireStaff();
}

function verifiePeriode(periode: string): string | null {
  return isPeriode(periode) ? null : `Période invalide : ${periode}`;
}

/**
 * Le geste principal : un tap qui bascule payé / non payé.
 * Marquer comme payé sans montant vaut « loyer plein » (voir encaisseLigne).
 */
export async function basculeReglement(
  contratId: string,
  periode: string,
  paye: boolean
): Promise<ActionResult> {
  const erreurPeriode = verifiePeriode(periode);
  if (erreurPeriode) return fail(erreurPeriode);

  try {
    await autorise();
    if (paye) {
      await enregistreReglement(contratId, periode, {
        statut: "paye",
        montant_encaisse_eur: 0,
        date_encaissement: new Date().toISOString().slice(0, 10),
      });
    } else {
      await annuleReglement(contratId, periode);
    }
    revalidatePath("/suivi");
    return ok;
  } catch (erreur) {
    return fail(erreur instanceof Error ? erreur.message : "Enregistrement impossible.");
  }
}

export type DetailReglement = {
  montant: number;
  date: string | null;
  moyen: string | null;
  note: string | null;
};

/**
 * Saisie détaillée depuis la feuille modale : montant partiel, date réelle
 * d'encaissement, moyen de paiement.
 */
export async function enregistreDetailReglement(
  contratId: string,
  periode: string,
  loyerMensuel: number,
  detail: DetailReglement
): Promise<ActionResult> {
  const erreurPeriode = verifiePeriode(periode);
  if (erreurPeriode) return fail(erreurPeriode);

  const montant = Math.round(Number(detail.montant));
  if (!Number.isFinite(montant) || montant < 0) {
    return fail("Le montant encaissé doit être un nombre positif.");
  }

  const moyen =
    detail.moyen && (MOYENS_PAIEMENT as readonly string[]).includes(detail.moyen)
      ? (detail.moyen as MoyenPaiement)
      : null;

  // Le statut se déduit du montant : c'est la règle métier, pas un choix laissé
  // à l'interface. Un encaissement complet (ou davantage : régularisation)
  // solde le mois, un encaissement moindre le laisse partiel.
  const statut = montant === 0 ? "attendu" : montant >= loyerMensuel ? "paye" : "partiel";

  try {
    await autorise();

    if (statut === "attendu") {
      await annuleReglement(contratId, periode);
    } else {
      await enregistreReglement(contratId, periode, {
        statut,
        montant_encaisse_eur: montant,
        date_encaissement: detail.date || new Date().toISOString().slice(0, 10),
        moyen,
        note: detail.note?.trim() || null,
      });
    }

    revalidatePath("/suivi");
    revalidatePath(`/suivi/locataire`, "layout");
    return ok;
  } catch (erreur) {
    return fail(erreur instanceof Error ? erreur.message : "Enregistrement impossible.");
  }
}

/** Observations libres de la fiche locataire, sauvegardées à la perte de focus. */
export async function sauvegardeObservations(
  locataireId: string,
  observations: string
): Promise<ActionResult> {
  if (observations.length > 5000) {
    return fail("Les observations sont limitées à 5 000 caractères.");
  }

  try {
    await autorise();
    await enregistreObservations(locataireId, observations);
    revalidatePath(`/suivi/locataire/${locataireId}`);
    return ok;
  } catch (erreur) {
    return fail(erreur instanceof Error ? erreur.message : "Enregistrement impossible.");
  }
}
