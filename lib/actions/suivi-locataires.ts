"use server";

// Le carnet d'adresses des locataires.
//
// Ces deux actions vivaient dans `suivi-reprise.ts`, fichier destiné à
// disparaître avec la campagne de reprise. Elles n'ont rien de temporaire :
// corriger un numéro faux et noter un arrivant sont des gestes du quotidien.
// Elles vivent donc ici, et l'écran Reprise les emprunte le temps qu'il dure.

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { createClient } from "@/lib/supabase/server";
import { estModeDemo } from "@/lib/suivi/repository";

export type SaisieLocataire = {
  nom: string;
  societe: string | null;
  telephone: string | null;
  email: string | null;
};

async function autorise(): Promise<ActionResult | null> {
  if (estModeDemo()) return fail("Modification indisponible en mode démo.");
  await requireStaff();
  return null;
}

function verifieSaisie(saisie: SaisieLocataire): string | null {
  if (!saisie.nom.trim()) return "Le nom est obligatoire.";
  const email = saisie.email?.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "L'adresse e-mail n'est pas valide.";
  }
  return null;
}

/**
 * Les écrans qui montrent un nom ou un numéro de locataire.
 *
 * Ils sont nombreux, et c'est le prix de coordonnées uniques : la liste du
 * mois, la fiche du box, le plan et l'annuaire lisent tous `sr_locataires`.
 * En oublier un laisserait un ancien numéro affiché quelque part.
 */
function rafraichit(locataireId?: string): void {
  revalidatePath("/suivi");
  revalidatePath("/suivi/locataires");
  revalidatePath("/suivi/box");
  revalidatePath("/suivi/reprise");
  if (locataireId) revalidatePath(`/suivi/locataire/${locataireId}`);
}

/**
 * Corrige les coordonnées d'un locataire.
 *
 * C'est en appelant qu'on découvre les numéros faux et les adresses périmées :
 * la correction doit se faire là où on s'en aperçoit, sans quitter l'écran ni
 * attendre le back-office.
 */
export async function modifieLocataire(
  locataireId: string,
  saisie: SaisieLocataire
): Promise<ActionResult> {
  const erreur = verifieSaisie(saisie);
  if (erreur) return fail(erreur);

  const refus = await autorise();
  if (refus) return refus;

  const supabase = await createClient();
  const { error } = await supabase
    .from("sr_locataires")
    .update({
      nom: saisie.nom.trim(),
      societe: saisie.societe?.trim() || null,
      telephone: saisie.telephone?.trim() || null,
      email: saisie.email?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", locataireId);

  if (error) return fail(error.message);

  rafraichit(locataireId);
  return ok;
}

/**
 * Ajoute un locataire sans contrat ni box.
 *
 * Le rattachement du box et la saisie du loyer se font ensuite depuis l'écran
 * Box : les exiger à cet instant ferait perdre l'information, alors que le cas
 * courant est justement qu'on note quelqu'un avant d'avoir tout réglé.
 * L'annuaire le signale tant que ce n'est pas fait — sans quoi il resterait
 * indéfiniment sans box, sans que rien ne le rappelle.
 */
export async function creeLocataire(saisie: SaisieLocataire): Promise<ActionResult> {
  const erreur = verifieSaisie(saisie);
  if (erreur) return fail(erreur);

  const refus = await autorise();
  if (refus) return refus;

  const supabase = await createClient();
  const { error } = await supabase.from("sr_locataires").insert({
    nom: saisie.nom.trim(),
    societe: saisie.societe?.trim() || null,
    telephone: saisie.telephone?.trim() || null,
    email: saisie.email?.trim() || null,
    actif: true,
  });

  if (error) return fail(error.message);

  rafraichit();
  return ok;
}
