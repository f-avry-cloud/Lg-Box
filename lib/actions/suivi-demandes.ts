"use server";

// Inscription manuelle sur la liste d'attente.
//
// Le formulaire public alimente `reservation_requests` depuis le site ; cette
// action l'alimente depuis le téléphone, quand quelqu'un appelle et que le
// centre est plein. Même table, donc même liste : la personne apparaît dans
// l'app et dans le back-office, et il n'y a pas deux endroits où chercher.

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { createClient } from "@/lib/supabase/server";
import { estModeDemo } from "@/lib/suivi/repository";

export type SaisieAttente = {
  nom: string;
  telephone: string;
  email: string;
  tailleSouhaitee: string;
  note: string;
};

/**
 * Ajoute quelqu'un à la liste d'attente.
 *
 * Seul le nom est exigé. Le formulaire public réclame une adresse e-mail —
 * c'est tenable derrière un écran, pas au téléphone : obliger à en saisir une
 * reviendrait à en faire inventer, et une adresse inventée est pire qu'une
 * case vide le jour où l'on cherche à joindre la personne.
 *
 * Un numéro est fortement souhaitable, en revanche, puisque c'est par là qu'on
 * rappellera : l'écran le demande sans l'imposer.
 */
export async function ajouteEnListeAttente(saisie: SaisieAttente): Promise<ActionResult> {
  const nom = saisie.nom.trim();
  if (!nom) return fail("Le nom est obligatoire.");

  if (!saisie.telephone.trim() && !saisie.email.trim()) {
    return fail("Un numéro ou une adresse est nécessaire pour rappeler la personne.");
  }

  if (estModeDemo()) return fail("Saisie indisponible en mode démo.");
  await requireStaff();

  const supabase = await createClient();
  const { error } = await supabase.from("reservation_requests").insert({
    nom,
    email: saisie.email.trim() || null,
    telephone: saisie.telephone.trim() || null,
    taille_souhaitee: saisie.tailleSouhaitee.trim() || null,
    message: saisie.note.trim() || null,
    statut: "liste_attente",
    origine: "manuelle",
  });

  if (error) return fail(error.message);

  revalidatePath("/suivi/demandes");
  revalidatePath("/suivi/tableau-de-bord");
  revalidatePath("/admin/reservations");
  return ok;
}

/**
 * Corrige les coordonnées d'une demande.
 *
 * C'est en rappelant qu'on découvre les numéros faux, et devoir changer
 * d'écran pour les réparer, c'est ne pas les réparer.
 */
export async function modifieDemande(
  demandeId: string,
  saisie: SaisieAttente
): Promise<ActionResult> {
  const nom = saisie.nom.trim();
  if (!nom) return fail("Le nom est obligatoire.");

  if (estModeDemo()) return fail("Modification indisponible en mode démo.");
  await requireStaff();

  const supabase = await createClient();
  const { error } = await supabase
    .from("reservation_requests")
    .update({
      nom,
      email: saisie.email.trim() || null,
      telephone: saisie.telephone.trim() || null,
      taille_souhaitee: saisie.tailleSouhaitee.trim() || null,
      message: saisie.note.trim() || null,
    })
    .eq("id", demandeId);

  if (error) return fail(error.message);

  revalidatePath("/suivi/demandes");
  revalidatePath("/admin/reservations");
  return ok;
}
