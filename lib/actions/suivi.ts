"use server";

// Server Actions de l'application « Suivi des règlements ».
//
// Critère d'acceptation n°6 : aucune donnée personnelle n'est journalisée.
// Ces actions ne manipulent que des identifiants et des montants, et ne
// tracent rien dans activity_log — le carnet d'encaissement n'a pas besoin
// d'un journal d'audit nominatif.

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { contratDuPour } from "@/lib/suivi/contrat";
import { isPeriode, periodeCourante, premierJour } from "@/lib/suivi/period";
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

// ---------------------------------------------------------------------------
// Rapprochement box ↔ locataire
// ---------------------------------------------------------------------------

/**
 * Rattache un box du référentiel de l'app à un contrat du carnet.
 *
 * Depuis que l'app a son propre référentiel de box (`sr_box`), ce geste se
 * réduit à poser `box_id` : plus besoin de recopier une unité du back-office,
 * ni de retrouver un box sur un libellé de bâtiment que les deux référentiels
 * n'écrivaient pas pareil. Le back-office n'est ni lu ni écrit ici.
 *
 * `periodeEffet` fixe le premier mois dû (`date_debut` au 1er du mois choisi).
 * C'est ce qui empêche la facturation groupée de réclamer un loyer à quelqu'un
 * qui n'entre que le mois prochain. Omise ou nulle, la date d'entrée du
 * contrat n'est pas touchée : rattacher tardivement le box d'un locataire déjà
 * en place ne doit pas réécrire son ancienneté.
 */
export async function rattacheBoxAuContrat(
  contratId: string,
  boxId: string,
  periodeEffet?: string | null
): Promise<ActionResult> {
  try {
    await autorise();
    if (estModeDemo()) return fail("Rattachement indisponible en mode démo.");

    const supabase = await createClient();

    // Un box ne peut porter qu'un locataire à la fois — mais un contrat dont
    // la sortie a pris effet ne compte plus : le box est libre, même si la
    // ligne conserve son box_id pour l'historique.
    const { data: autres, error: erreurLecture } = await supabase
      .from("sr_contrats")
      .select("id, date_debut, date_fin")
      .eq("box_id", boxId)
      .neq("id", contratId);

    if (erreurLecture) return fail(erreurLecture.message);

    const periode = periodeCourante();
    const occupe = (autres ?? []).some((c) => contratDuPour(periode, c.date_debut, c.date_fin));
    if (occupe) return fail("Ce box est déjà rattaché à un autre locataire.");

    const modification: { box_id: string; updated_at: string; date_debut?: string } = {
      box_id: boxId,
      updated_at: new Date().toISOString(),
    };

    if (periodeEffet != null) {
      if (!isPeriode(periodeEffet)) return fail(`Période invalide : ${periodeEffet}`);
      modification.date_debut = premierJour(periodeEffet);
    }

    const { error } = await supabase
      .from("sr_contrats")
      .update(modification)
      .eq("id", contratId);

    if (error) return fail(error.message);

    revalidatePath("/suivi");
    revalidatePath("/suivi/box");
    revalidatePath("/suivi/tableau-de-bord");
    return ok;
  } catch (erreur) {
    return fail(erreur instanceof Error ? erreur.message : "Rattachement impossible.");
  }
}

/** Détache le box d'un contrat : la ligne repasse en « box à identifier ». */
export async function detacheBoxDuContrat(contratId: string): Promise<ActionResult> {
  try {
    await autorise();
    if (estModeDemo()) return fail("Détachement indisponible en mode démo.");

    const supabase = await createClient();
    const { error } = await supabase
      .from("sr_contrats")
      .update({ box_id: null, updated_at: new Date().toISOString() })
      .eq("id", contratId);

    if (error) return fail(error.message);

    revalidatePath("/suivi");
    return ok;
  } catch (erreur) {
    return fail(erreur instanceof Error ? erreur.message : "Détachement impossible.");
  }
}
