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
};

export async function modifieBox(boxId: string, saisie: SaisieBox): Promise<ActionResult> {
  const refus = await autorise();
  if (refus) return refus;

  const numero = saisie.numero.trim();
  const batiment = saisie.batiment.trim();
  if (!numero) return fail("Le numéro ne peut pas être vide.");
  if (!batiment) return fail("Le bâtiment ne peut pas être vide.");

  const erreurSurface = verifieSurface(saisie.surface_m2);
  if (erreurSurface) return fail(erreurSurface);

  const supabase = await createClient();
  const { error } = await supabase
    .from("sr_box")
    .update({ numero, batiment, surface_m2: saisie.surface_m2 })
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

  const supabase = await createClient();
  const { error } = await supabase
    .from("sr_box")
    .insert({ numero, batiment, surface_m2: saisie.surface_m2 });

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
