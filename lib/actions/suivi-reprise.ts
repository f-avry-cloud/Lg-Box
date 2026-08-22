"use server";

// Campagne de reprise du centre — **temporaire**.
//
// Tout ce fichier disparaîtra avec l'onglet /suivi/reprise et la table
// `sr_reprise_contacts` une fois les locataires prévenus du changement de
// propriétaire. La correction des coordonnées et la création d'un locataire
// n'ont, elles, rien de temporaire : elles vivent désormais dans
// `suivi-locataires.ts`, et l'écran Reprise les emprunte le temps qu'il dure.

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
