"use server";

// Campagne de reprise du centre — **temporaire**.
//
// Tout ce fichier disparaîtra avec l'onglet /suivi/reprise et la table
// `sr_reprise_contacts` une fois les locataires prévenus du changement de
// propriétaire. Seule exception : `modifieLocataire`, qui touche aux vraies
// coordonnées et mérite de survivre à la campagne — c'est pendant les appels
// qu'on découvre les numéros faux, et il serait absurde de les corriger dans
// un écran qu'on s'apprête à supprimer.

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

function rafraichit(): void {
  revalidatePath("/suivi/reprise");
}

/**
 * Pose l'avancement d'un locataire. Un `upsert` parce que la ligne n'existe
 * pas tant que personne n'a été appelé : l'absence vaut « à contacter », et on
 * ne crée pas 62 lignes vides à l'ouverture de l'écran.
 */
async function poseEtat(
  locataireId: string,
  patch: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sr_reprise_contacts")
    .upsert(
      { locataire_id: locataireId, ...patch, updated_at: new Date().toISOString() },
      { onConflict: "locataire_id" }
    );

  if (error) return fail(error.message);

  rafraichit();
  return ok;
}

/** « Je l'ai eu au téléphone. » */
export async function marqueContacte(
  locataireId: string,
  contacte: boolean
): Promise<ActionResult> {
  const refus = await autorise();
  if (refus) return refus;

  return poseEtat(locataireId, {
    contacte,
    // La date n'est posée qu'à la mise en marche, et effacée au décochage :
    // garder une date sur un fait annulé induirait en erreur plus tard.
    contacte_le: contacte ? new Date().toISOString() : null,
  });
}

/**
 * « J'ai laissé un message. » Indépendant de « contacté » : on laisse un
 * message, puis on finit par avoir la personne, et les deux faits comptent.
 */
export async function marqueMessageLaisse(
  locataireId: string,
  messageLaisse: boolean
): Promise<ActionResult> {
  const refus = await autorise();
  if (refus) return refus;

  return poseEtat(locataireId, {
    message_laisse: messageLaisse,
    message_laisse_le: messageLaisse ? new Date().toISOString() : null,
  });
}

/** Note de campagne — distincte des observations du locataire. */
export async function enregistreNoteReprise(
  locataireId: string,
  note: string
): Promise<ActionResult> {
  if (note.length > 2000) return fail("La note est limitée à 2 000 caractères.");

  const refus = await autorise();
  if (refus) return refus;

  return poseEtat(locataireId, { note: note.trim() || null });
}

export type SaisieLocataire = {
  nom: string;
  societe: string | null;
  telephone: string | null;
  email: string | null;
};

function verifieSaisie(saisie: SaisieLocataire): string | null {
  if (!saisie.nom.trim()) return "Le nom est obligatoire.";
  const email = saisie.email?.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "L'adresse e-mail n'est pas valide.";
  }
  return null;
}

/**
 * Corrige les coordonnées d'un locataire.
 *
 * C'est en appelant qu'on découvre les numéros faux et les adresses périmées :
 * la correction doit se faire là, sans quitter l'écran ni attendre le
 * back-office. Touche `sr_locataires`, donc le carnet tout entier — c'est
 * voulu, ces coordonnées sont les mêmes partout.
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

  rafraichit();
  revalidatePath("/suivi");
  revalidatePath("/suivi/box");
  revalidatePath(`/suivi/locataire/${locataireId}`);
  return ok;
}

/**
 * Ajoute un locataire absent du carnet, sans contrat ni box.
 *
 * Le cas est réel et fréquent en reprise : quelqu'un occupe un box sans
 * figurer dans le fichier repris. Il faut pouvoir le noter tout de suite,
 * quitte à lui rattacher son box et son loyer plus tard depuis l'écran Box —
 * exiger le contrat à cet instant ferait perdre l'information.
 */
export async function creeLocataireSansContrat(
  saisie: SaisieLocataire
): Promise<ActionResult> {
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
  revalidatePath("/suivi/box");
  return ok;
}
