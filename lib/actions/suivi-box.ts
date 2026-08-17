"use server";

// Gestion du référentiel de box **propre à l'application mobile** (table
// `sr_box`).
//
// Règle du projet : l'app mobile ne écrit jamais dans le back-office. Elle
// lit `units` pour informer (occupation, rapprochement), jamais pour modifier.
// Corriger un numéro ou une surface depuis le téléphone touche donc `sr_box`
// et rien d'autre — le travail fait dans /admin reste intact tant qu'on n'a
// pas décidé, explicitement, de reporter les corrections.
//
// Le pont entre les deux reste `sr_box.unit_id`, renseigné au rapprochement.

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { createClient } from "@/lib/supabase/server";
import { dernierJour, isPeriode } from "@/lib/suivi/period";
import { estModeDemo } from "@/lib/suivi/repository";

async function autorise(): Promise<ActionResult | null> {
  if (estModeDemo()) return fail("Modification indisponible en mode démo.");
  await requireStaff();
  return null;
}

function verifieSurface(surface: number | null): string | null {
  if (surface === null) return null;
  if (!Number.isFinite(surface) || surface <= 0) {
    return "La surface doit être un nombre positif.";
  }
  return null;
}

function rafraichit(): void {
  revalidatePath("/suivi/box");
  revalidatePath("/suivi");
  revalidatePath("/suivi/tableau-de-bord");
}

export type SaisieBox = {
  numero: string;
  batiment: string;
  /** null = surface inconnue, ce qui est un état légitime et fréquent. */
  surface_m2: number | null;
  /**
   * Tarif de référence, facultatif et non contraignant : il pré-remplit un
   * loyer à l'affectation, il ne le fixe pas. Le loyer facturé reste celui du
   * contrat, qui peut y déroger sans justification.
   */
  tarif_indicatif_eur: number | null;
};

function verifieTarif(tarif: number | null): string | null {
  if (tarif === null) return null;
  if (!Number.isFinite(tarif) || tarif <= 0) {
    return "Le tarif indicatif doit être un nombre positif.";
  }
  return null;
}

export async function modifieBox(boxId: string, saisie: SaisieBox): Promise<ActionResult> {
  const refus = await autorise();
  if (refus) return refus;

  const numero = saisie.numero.trim();
  const batiment = saisie.batiment.trim();
  if (!numero) return fail("Le numéro ne peut pas être vide.");
  if (!batiment) return fail("Le bâtiment ne peut pas être vide.");

  const erreurSurface = verifieSurface(saisie.surface_m2);
  if (erreurSurface) return fail(erreurSurface);

  const erreurTarif = verifieTarif(saisie.tarif_indicatif_eur);
  if (erreurTarif) return fail(erreurTarif);

  const supabase = await createClient();
  const { error } = await supabase
    .from("sr_box")
    .update({
      numero,
      batiment,
      surface_m2: saisie.surface_m2,
      tarif_indicatif_eur: saisie.tarif_indicatif_eur,
    })
    .eq("id", boxId);

  if (error) {
    if (error.code === "23505") return fail(`Le box ${numero} existe déjà dans ${batiment}.`);
    return fail(error.message);
  }

  rafraichit();
  return ok;
}

export async function creeBox(saisie: SaisieBox): Promise<ActionResult> {
  const refus = await autorise();
  if (refus) return refus;

  const numero = saisie.numero.trim();
  const batiment = saisie.batiment.trim();
  if (!numero) return fail("Le numéro ne peut pas être vide.");
  if (!batiment) return fail("Le bâtiment ne peut pas être vide.");

  const erreurSurface = verifieSurface(saisie.surface_m2);
  if (erreurSurface) return fail(erreurSurface);

  const erreurTarif = verifieTarif(saisie.tarif_indicatif_eur);
  if (erreurTarif) return fail(erreurTarif);

  const supabase = await createClient();
  const { error } = await supabase.from("sr_box").insert({
    numero,
    batiment,
    surface_m2: saisie.surface_m2,
    tarif_indicatif_eur: saisie.tarif_indicatif_eur,
  });

  if (error) {
    if (error.code === "23505") return fail(`Le box ${numero} existe déjà dans ${batiment}.`);
    return fail(error.message);
  }

  rafraichit();
  return ok;
}

/**
 * Supprimer un box refuse tant qu'un contrat s'y rattache. La contrainte
 * `on delete set null` de sr_contrats.box_id ferait sinon repasser
 * silencieusement un locataire en « box à identifier ».
 */
export async function supprimeBox(boxId: string): Promise<ActionResult> {
  const refus = await autorise();
  if (refus) return refus;

  const supabase = await createClient();

  const { count, error: erreurLecture } = await supabase
    .from("sr_contrats")
    .select("id", { count: "exact", head: true })
    .eq("box_id", boxId);

  if (erreurLecture) return fail(erreurLecture.message);
  if ((count ?? 0) > 0) {
    return fail("Ce box est rattaché à un locataire — détachez-le d'abord.");
  }

  const { error } = await supabase.from("sr_box").delete().eq("id", boxId);
  if (error) return fail(error.message);

  rafraichit();
  return ok;
}

/**
 * Périodicité de règlement du contrat qui occupe le box.
 *
 * Aujourd'hui purement descriptive : le carnet reste mensuel, un contrat
 * trimestriel apparaît donc « attendu » chaque mois. Le rendre réellement
 * trimestriel changerait les totaux mensuels — c'est une décision
 * d'exploitation, pas une conséquence à tirer en silence d'un champ ajouté.
 */
export async function modifiePeriodicite(
  contratId: string,
  periodicite: "mensuelle" | "trimestrielle"
): Promise<ActionResult> {
  const refus = await autorise();
  if (refus) return refus;

  const supabase = await createClient();
  const { error } = await supabase
    .from("sr_contrats")
    .update({ periodicite, updated_at: new Date().toISOString() })
    .eq("id", contratId);

  if (error) return fail(error.message);

  rafraichit();
  return ok;
}

/**
 * Programme la sortie d'un locataire : le contrat reste dû jusqu'à la fin du
 * mois choisi, puis le box se libère de lui-même.
 *
 * Détacher sur-le-champ ferait disparaître le loyer du mois en cours, alors
 * que tout mois commencé est dû. On enregistre donc une date d'effet — fin du
 * mois courant si le préavis est échu, fin de M+1 ou de M+2 sinon.
 */
export async function programmeSortie(
  contratId: string,
  periodeFin: string
): Promise<ActionResult> {
  const refus = await autorise();
  if (refus) return refus;

  if (!isPeriode(periodeFin)) return fail(`Période invalide : ${periodeFin}`);

  const supabase = await createClient();
  const { error } = await supabase
    .from("sr_contrats")
    .update({ date_fin: dernierJour(periodeFin), updated_at: new Date().toISOString() })
    .eq("id", contratId);

  if (error) return fail(error.message);

  rafraichit();
  return ok;
}

/** Annule une sortie programmée : le contrat redevient sans échéance. */
export async function annuleSortie(contratId: string): Promise<ActionResult> {
  const refus = await autorise();
  if (refus) return refus;

  const supabase = await createClient();
  const { error } = await supabase
    .from("sr_contrats")
    .update({ date_fin: null, updated_at: new Date().toISOString() })
    .eq("id", contratId);

  if (error) return fail(error.message);

  rafraichit();
  return ok;
}

/**
 * Loyer mensuel du contrat qui occupe le box.
 *
 * Le loyer vit sur le contrat, jamais sur le box (le box n'a qu'un tarif
 * indicatif). Le corriger était jusqu'ici impossible depuis le téléphone : il
 * n'entrait qu'à l'import, ou à la création d'un second contrat. Une révision
 * de loyer obligeait donc à passer par le back-office.
 *
 * Aucune historisation : le carnet enregistre le loyer en cours, et les mois
 * déjà pointés gardent le montant réellement encaissé, qui est stocké sur le
 * règlement. Changer le loyer ne réécrit donc pas le passé.
 */
export async function modifieLoyerContrat(
  contratId: string,
  loyer: number
): Promise<ActionResult> {
  const refus = await autorise();
  if (refus) return refus;

  const montant = Math.round(Number(loyer));
  if (!Number.isFinite(montant) || montant <= 0) {
    return fail("Le loyer doit être un nombre positif.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("sr_contrats")
    .update({ loyer_mensuel_eur: montant, updated_at: new Date().toISOString() })
    .eq("id", contratId);

  if (error) return fail(error.message);

  rafraichit();
  return ok;
}
