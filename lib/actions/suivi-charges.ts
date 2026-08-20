"use server";

// Saisie des charges du centre.
//
// Table propre à l'app (`sr_charges`) : la règle du projet reste que l'app
// mobile n'écrit pas dans le back-office, et `expenses` n'a de toute façon pas
// la notion de récurrence dont tout dépend ici.

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES_CHARGE } from "@/lib/suivi/charges";
import { isPeriode } from "@/lib/suivi/period";
import { estModeDemo } from "@/lib/suivi/repository";

async function autorise(): Promise<ActionResult | null> {
  if (estModeDemo()) return fail("Saisie indisponible en mode démo.");
  await requireStaff();
  return null;
}

function rafraichit(): void {
  revalidatePath("/suivi/charges");
  revalidatePath("/suivi/tableau-de-bord");
}

export type SaisieCharge = {
  libelle: string;
  montant: number;
  categorie: string;
  recurrente: boolean;
  /** Premier mois dû — et le seul, sur une ponctuelle. */
  periodeDebut: string;
  /** Dernier mois dû. Null = sans échéance (récurrente uniquement). */
  periodeFin: string | null;
};

/**
 * Contrôles communs à la création et à la modification.
 *
 * Le montant est arrondi au centime : une charge se saisit en euros et
 * centimes, contrairement aux loyers du carnet qui sont ronds.
 */
function verifie(saisie: SaisieCharge): string | null {
  if (!saisie.libelle.trim()) return "Le libellé est obligatoire.";

  const montant = Number(saisie.montant);
  if (!Number.isFinite(montant) || montant < 0) {
    return "Le montant doit être un nombre positif.";
  }

  if (!isPeriode(saisie.periodeDebut)) return "Le mois de début est invalide.";

  if (saisie.periodeFin !== null) {
    if (!isPeriode(saisie.periodeFin)) return "Le mois de fin est invalide.";
    if (saisie.periodeFin < saisie.periodeDebut) {
      return "La fin ne peut pas précéder le début.";
    }
    // Une ponctuelle ne s'étale pas : la base l'interdit, autant le dire
    // clairement plutôt que de laisser remonter une erreur de contrainte.
    if (!saisie.recurrente && saisie.periodeFin !== saisie.periodeDebut) {
      return "Une charge ponctuelle ne porte que sur un seul mois.";
    }
  }

  if (!(CATEGORIES_CHARGE as readonly string[]).includes(saisie.categorie)) {
    return "Catégorie inconnue.";
  }

  return null;
}

function versLigne(saisie: SaisieCharge) {
  return {
    libelle: saisie.libelle.trim(),
    montant_eur: Math.round(Number(saisie.montant) * 100) / 100,
    categorie: saisie.categorie,
    recurrente: saisie.recurrente,
    periode_debut: saisie.periodeDebut,
    // Une ponctuelle borne sa fin sur son début : la charge ne peut alors pas
    // se mettre à courir si quelqu'un la repasse en récurrente plus tard.
    periode_fin: saisie.recurrente ? saisie.periodeFin : saisie.periodeDebut,
  };
}

export async function creeCharge(saisie: SaisieCharge): Promise<ActionResult> {
  const erreur = verifie(saisie);
  if (erreur) return fail(erreur);

  const refus = await autorise();
  if (refus) return refus;

  const supabase = await createClient();
  const { error } = await supabase.from("sr_charges").insert(versLigne(saisie));
  if (error) return fail(error.message);

  rafraichit();
  return ok;
}

export async function modifieCharge(
  chargeId: string,
  saisie: SaisieCharge
): Promise<ActionResult> {
  const erreur = verifie(saisie);
  if (erreur) return fail(erreur);

  const refus = await autorise();
  if (refus) return refus;

  const supabase = await createClient();
  const { error } = await supabase
    .from("sr_charges")
    .update({ ...versLigne(saisie), updated_at: new Date().toISOString() })
    .eq("id", chargeId);

  if (error) return fail(error.message);

  rafraichit();
  return ok;
}

/**
 * Supprime une charge — y compris l'historique qu'elle portait.
 *
 * Pour arrêter une charge sans effacer le passé, il faut lui poser une fin :
 * les mois déjà écoulés continuent alors de la compter. C'est ce que fait
 * « Arrêter cette charge » dans l'écran ; la suppression est réservée aux
 * saisies erronées.
 */
export async function supprimeCharge(chargeId: string): Promise<ActionResult> {
  const refus = await autorise();
  if (refus) return refus;

  const supabase = await createClient();
  const { error } = await supabase.from("sr_charges").delete().eq("id", chargeId);
  if (error) return fail(error.message);

  rafraichit();
  return ok;
}
