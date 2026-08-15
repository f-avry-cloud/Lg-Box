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

// ---------------------------------------------------------------------------
// Rapprochement box ↔ locataire
// ---------------------------------------------------------------------------

/**
 * Rattache un box du back-office (`units`) à un contrat du carnet.
 *
 * C'est ce geste qui matérialise la connexion des deux bases, box par box :
 * la ligne `sr_box` créée porte `unit_id`, la colonne de liaison. Faire ce
 * rapprochement automatiquement par correspondance de numéro serait risqué —
 * plusieurs bâtiments réutilisent les mêmes numéros — d'où ce choix explicite,
 * fait par quelqu'un qui connaît le site.
 *
 * Le back-office n'est jamais modifié : on lit `units`, on n'y écrit pas.
 */
export async function rattacheBoxAuContrat(
  contratId: string,
  unitId: string
): Promise<ActionResult> {
  try {
    await autorise();
    if (estModeDemo()) return fail("Rattachement indisponible en mode démo.");

    const supabase = await createClient();

    const { data: unit, error: erreurUnit } = await supabase
      .from("units")
      .select("id, numero, zone, taille_m2")
      .eq("id", unitId)
      .maybeSingle();

    if (erreurUnit) return fail(erreurUnit.message);
    if (!unit) return fail("Box introuvable dans le back-office.");

    // Le box du carnet peut déjà exister sans qu'on doive le recréer. On le
    // cherche d'abord sur `unit_id`, la colonne de liaison — et pas sur le
    // libellé de bâtiment : les deux référentiels ne les écrivent pas pareil
    // (« Bat I » côté carnet issu du CSV, « Bâtiment 1 » côté back-office),
    // si bien qu'une comparaison de libellés ne trouverait jamais rien et
    // créerait un doublon à chaque rattachement.
    const batiment = unit.zone?.trim() || "Non précisé";

    const { data: parLiaison, error: erreurLiaison } = await supabase
      .from("sr_box")
      .select("id")
      .eq("unit_id", unit.id)
      .maybeSingle();

    if (erreurLiaison) return fail(erreurLiaison.message);

    // À défaut, une ligne créée depuis l'app porte déjà le libellé
    // back-office : elle se retrouve sur sa clé naturelle.
    const { data: parLibelle, error: erreurLecture } =
      parLiaison
        ? { data: null, error: null }
        : await supabase
            .from("sr_box")
            .select("id")
            .eq("batiment", batiment)
            .eq("numero", unit.numero)
            .maybeSingle();

    if (erreurLecture) return fail(erreurLecture.message);

    const existant = parLiaison ?? parLibelle;

    let boxId = existant?.id ?? null;

    if (boxId) {
      const { error } = await supabase
        .from("sr_box")
        .update({ unit_id: unit.id, surface_m2: unit.taille_m2 })
        .eq("id", boxId);
      if (error) return fail(error.message);
    } else {
      const { data, error } = await supabase
        .from("sr_box")
        .insert({
          numero: unit.numero,
          batiment,
          surface_m2: unit.taille_m2,
          unit_id: unit.id,
        })
        .select("id")
        .single();
      if (error) return fail(error.message);
      boxId = data.id;
    }

    const { error: erreurContrat } = await supabase
      .from("sr_contrats")
      .update({ box_id: boxId, updated_at: new Date().toISOString() })
      .eq("id", contratId);

    if (erreurContrat) return fail(erreurContrat.message);

    revalidatePath("/suivi");
    revalidatePath("/suivi/box");
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
