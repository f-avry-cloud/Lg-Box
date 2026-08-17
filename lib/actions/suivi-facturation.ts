"use server";

// Facturation groupée du mois.
//
// Le geste : depuis le tableau de bord, marquer d'un coup « facturé » tous les
// locataires dus au titre du mois affiché. C'est l'état intermédiaire qui
// manquait au carnet — réclamé, pas encore encaissé.
//
// Deux garde-fous tiennent tout le reste :
//  - on n'écrase jamais une ligne existante. Un mois déjà encaissé, partiel ou
//    facturé garde son état ; seuls les « attendu » (aucune ligne en base)
//    deviennent « facturé ». Le bouton est donc rejouable sans dégât.
//  - la liste facturée est exactement celle du mois (`lignesDuMois`), qui
//    applique déjà « tout mois commencé est dû » et la date d'effet des
//    entrées : un locataire qui n'entre qu'en M+1 n'est pas facturé en M.

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { createClient } from "@/lib/supabase/server";
import { isPeriode } from "@/lib/suivi/period";
import { estModeDemo, lignesDuMois } from "@/lib/suivi/repository";
import { statutLigne } from "@/lib/suivi/totals";

async function autorise(): Promise<ActionResult | null> {
  if (estModeDemo()) return fail("Facturation indisponible en mode démo.");
  await requireStaff();
  return null;
}

export type ResultatFacturation = ActionResult & { factures?: number };

/**
 * Passe en « facturé » tous les loyers du mois encore attendus.
 * Renvoie le nombre de lignes réellement créées.
 */
export async function factureLeMois(periode: string): Promise<ResultatFacturation> {
  if (!isPeriode(periode)) return fail(`Période invalide : ${periode}`);

  try {
    const refus = await autorise();
    if (refus) return refus;

    const lignes = await lignesDuMois(periode);
    const aFacturer = lignes.filter((l) => statutLigne(l) === "attendu");
    if (aFacturer.length === 0) return { ...ok, factures: 0 };

    const aujourdhui = new Date().toISOString().slice(0, 10);
    const supabase = await createClient();

    const { error } = await supabase.from("sr_reglements").insert(
      aFacturer.map((l) => ({
        contrat_id: l.contrat_id,
        periode,
        statut: "facture" as const,
        montant_encaisse_eur: 0,
        date_facturation: aujourdhui,
      }))
    );

    if (error) return fail(error.message);

    revalidatePath("/suivi");
    revalidatePath("/suivi/box");
    revalidatePath("/suivi/tableau-de-bord");
    return { ...ok, factures: aFacturer.length };
  } catch (erreur) {
    return fail(erreur instanceof Error ? erreur.message : "Facturation impossible.");
  }
}

/**
 * Défait la facturation du mois : supprime les lignes restées « facturé ».
 *
 * Ne touche à rien d'encaissé — un loyer rentré entre-temps n'est plus au
 * statut « facturé » et survit donc à l'annulation. C'est le filet du bouton :
 * un tap malheureux se rattrape sans passer par la base.
 */
export async function annuleFacturationDuMois(periode: string): Promise<ResultatFacturation> {
  if (!isPeriode(periode)) return fail(`Période invalide : ${periode}`);

  try {
    const refus = await autorise();
    if (refus) return refus;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sr_reglements")
      .delete()
      .eq("periode", periode)
      .eq("statut", "facture")
      .select("id");

    if (error) return fail(error.message);

    revalidatePath("/suivi");
    revalidatePath("/suivi/box");
    revalidatePath("/suivi/tableau-de-bord");
    return { ...ok, factures: (data ?? []).length };
  } catch (erreur) {
    return fail(erreur instanceof Error ? erreur.message : "Annulation impossible.");
  }
}
