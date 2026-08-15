// Accès aux données de l'application « Suivi des règlements ».
//
// Deux implémentations derrière la même interface :
//  - Supabase, sur les tables sr_* de la base du back-office ;
//  - un magasin en mémoire alimenté par le CSV, pour tourner en local sans base.
//
// C'est ici, et uniquement ici, que se décide laquelle est utilisée : les
// écrans et les Server Actions ne connaissent que cette interface.

import { createClient } from "@/lib/supabase/server";
import {
  demoBoxAvecOccupant,
  demoContrat,
  demoEnregistreObservations,
  demoFiche,
  demoLignesMois,
  demoSupprimeReglement,
  demoUpsertReglement,
} from "@/lib/suivi/demo-store";
import { calculeTotaux } from "@/lib/suivi/totals";
import { groupeParBatiment } from "@/lib/suivi/box";
import {
  type Box,
  type BoxListe,
  type Contrat,
  type FicheLocataire,
  type GroupeBatiment,
  type LigneMois,
  type Locataire,
  type BoxRattachable,
  type Reglement,
  type StatsTableauDeBord,
} from "@/lib/suivi/types";

/**
 * Mode démo si Supabase n'est pas configuré, ou si on le force via
 * SUIVI_DEMO=1 (utile pour montrer l'app sans toucher aux données réelles).
 */
export function estModeDemo(): boolean {
  if (process.env.SUIVI_DEMO === "1") return true;
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

// Formes renvoyées par les jointures Supabase, avant aplatissement.
type ContratJoint = Contrat & {
  sr_locataires: Pick<Locataire, "id" | "nom" | "societe"> | null;
  sr_box: Pick<Box, "numero" | "batiment"> | null;
};

export async function lignesDuMois(periode: string): Promise<LigneMois[]> {
  if (estModeDemo()) return demoLignesMois(periode);

  const supabase = await createClient();

  // Deux requêtes plutôt qu'une jointure sur les règlements : on veut TOUS les
  // contrats, y compris ceux sans ligne pour la période (= « attendu »), et un
  // left join filtré sur la période est plus fragile à écrire côté PostgREST.
  const [contratsRes, reglementsRes] = await Promise.all([
    supabase
      .from("sr_contrats")
      .select(
        "id, locataire_id, box_id, loyer_mensuel_eur, date_debut, date_fin, remarque, sr_locataires (id, nom, societe), sr_box (numero, batiment)"
      )
      .is("date_fin", null),
    supabase.from("sr_reglements").select("*").eq("periode", periode),
  ]);

  if (contratsRes.error) throw new Error(contratsRes.error.message);
  if (reglementsRes.error) throw new Error(reglementsRes.error.message);

  const parContrat = new Map<string, Reglement>();
  for (const r of (reglementsRes.data ?? []) as Reglement[]) {
    parContrat.set(r.contrat_id, r);
  }

  return ((contratsRes.data ?? []) as unknown as ContratJoint[])
    .filter((c) => c.sr_locataires !== null)
    .map((c) => ({
      contrat_id: c.id,
      locataire_id: c.sr_locataires!.id,
      nom: c.sr_locataires!.nom,
      societe: c.sr_locataires!.societe,
      box_numero: c.sr_box?.numero ?? null,
      batiment: c.sr_box?.batiment ?? null,
      loyer_mensuel_eur: c.loyer_mensuel_eur,
      reglement: parContrat.get(c.id) ?? null,
    }));
}

export async function ficheLocataire(locataireId: string): Promise<FicheLocataire | null> {
  if (estModeDemo()) return demoFiche(locataireId);

  const supabase = await createClient();

  const { data: locataire, error } = await supabase
    .from("sr_locataires")
    .select("*")
    .eq("id", locataireId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!locataire) return null;

  const { data: contrats, error: erreurContrats } = await supabase
    .from("sr_contrats")
    .select(
      "id, locataire_id, box_id, loyer_mensuel_eur, date_debut, date_fin, remarque, sr_box (id, numero, batiment, surface_m2)"
    )
    .eq("locataire_id", locataireId);

  if (erreurContrats) throw new Error(erreurContrats.message);

  const lignes = (contrats ?? []) as unknown as Array<Contrat & { sr_box: Box | null }>;
  const ids = lignes.map((c) => c.id);

  let reglements: Reglement[] = [];
  if (ids.length > 0) {
    const { data, error: erreurReglements } = await supabase
      .from("sr_reglements")
      .select("*")
      .in("contrat_id", ids);
    if (erreurReglements) throw new Error(erreurReglements.message);
    reglements = (data ?? []) as Reglement[];
  }

  return {
    locataire: locataire as Locataire,
    contrats: lignes.map(({ sr_box, ...contrat }) => ({ ...contrat, box: sr_box })),
    reglements,
  };
}

export async function contratParId(contratId: string): Promise<Contrat | null> {
  if (estModeDemo()) return demoContrat(contratId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sr_contrats")
    .select("id, locataire_id, box_id, loyer_mensuel_eur, date_debut, date_fin, remarque")
    .eq("id", contratId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Contrat | null) ?? null;
}

export type PatchReglement = Partial<Omit<Reglement, "id" | "contrat_id" | "periode">>;

export async function enregistreReglement(
  contratId: string,
  periode: string,
  patch: PatchReglement
): Promise<void> {
  if (estModeDemo()) {
    demoUpsertReglement(contratId, periode, patch);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("sr_reglements").upsert(
    {
      contrat_id: contratId,
      periode,
      statut: patch.statut ?? "paye",
      montant_encaisse_eur: patch.montant_encaisse_eur ?? 0,
      date_encaissement: patch.date_encaissement ?? null,
      moyen: patch.moyen ?? null,
      note: patch.note ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "contrat_id,periode" }
  );

  if (error) throw new Error(error.message);
}

/**
 * Annuler un règlement supprime la ligne au lieu de la passer à « attendu » :
 * l'absence de ligne EST l'état attendu, garder une ligne vide encombrerait la
 * table de 63 enregistrements inutiles par mois.
 */
export async function annuleReglement(contratId: string, periode: string): Promise<void> {
  if (estModeDemo()) {
    demoSupprimeReglement(contratId, periode);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("sr_reglements")
    .delete()
    .eq("contrat_id", contratId)
    .eq("periode", periode);

  if (error) throw new Error(error.message);
}

export async function enregistreObservations(
  locataireId: string,
  observations: string
): Promise<void> {
  if (estModeDemo()) {
    demoEnregistreObservations(locataireId, observations);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("sr_locataires")
    .update({
      observations: observations.trim() === "" ? null : observations,
      observations_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", locataireId);

  if (error) throw new Error(error.message);
}


// ---------------------------------------------------------------------------
// Écran Box
// ---------------------------------------------------------------------------

/**
 * Le référentiel des box est celui du back-office (`units`), pas `sr_box` :
 * sr_box ne contient que les 39 box identifiés dans l'export d'encaissement,
 * alors que le site en compte davantage, et c'est bien la fiche back-office
 * que l'exploitant veut corriger depuis son téléphone.
 *
 * En mode démo, faute de base, la liste est reconstituée depuis le CSV — en
 * lecture seule (voir `boxModifiables`).
 */
export async function listeBox(): Promise<GroupeBatiment[]> {
  if (estModeDemo()) return groupeParBatiment(demoBoxListe());

  const supabase = await createClient();

  // Le référentiel de l'app est `sr_box`, pas `units` : corriger un numéro ou
  // une surface depuis le téléphone ne doit rien changer au back-office.
  // `unit_id` reste le pont, renseigné au rapprochement, jamais écrit ici.
  const [boxRes, contratsRes] = await Promise.all([
    supabase.from("sr_box").select("id, numero, batiment, surface_m2, unit_id"),
    supabase
      .from("sr_contrats")
      .select("box_id, sr_locataires (nom)")
      .not("box_id", "is", null)
      .is("date_fin", null),
  ]);

  if (boxRes.error) throw new Error(boxRes.error.message);
  if (contratsRes.error) throw new Error(contratsRes.error.message);

  type ContratJointNom = {
    box_id: string | null;
    sr_locataires: { nom: string } | null;
  };

  const locataireParBox = new Map<string, string>();
  for (const c of (contratsRes.data ?? []) as unknown as ContratJointNom[]) {
    if (c.box_id && c.sr_locataires?.nom) locataireParBox.set(c.box_id, c.sr_locataires.nom);
  }

  const box: BoxListe[] = (boxRes.data ?? []).map((b) => {
    const locataire = locataireParBox.get(b.id) ?? null;
    return {
      id: b.id,
      numero: b.numero,
      batiment: b.batiment,
      surface_m2: b.surface_m2,
      // Le carnet ne connaît que deux états : occupé par un locataire, ou non.
      statut: locataire ? ("loue" as const) : ("libre" as const),
      prix_mensuel_standard: 0,
      locataire,
    };
  });

  return groupeParBatiment(box);
}

/** L'édition écrit dans `sr_box` : impossible sans base. */
export function boxModifiables(): boolean {
  return !estModeDemo();
}

/** Les bâtiments déjà utilisés, proposés à la saisie d'un nouveau box. */
export async function batimentsConnus(): Promise<string[]> {
  if (estModeDemo()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("sr_box").select("batiment");
  if (error) throw new Error(error.message);
  return [...new Set((data ?? []).map((b) => b.batiment))].sort((a, b) =>
    a.localeCompare(b, "fr", { numeric: true })
  );
}

function demoBoxListe(): BoxListe[] {
  // Le mode démo n'a pas de table units : on reconstitue la liste depuis les
  // box du CSV, surface comprise, avec le loyer du contrat associé comme prix.
  return demoBoxAvecOccupant().map(({ box, locataire, loyer }) => ({
    id: box.id,
    numero: box.numero,
    batiment: box.batiment,
    surface_m2: box.surface_m2,
    statut: locataire ? ("loue" as const) : ("libre" as const),
    prix_mensuel_standard: loyer,
    locataire,
  }));
}

// ---------------------------------------------------------------------------
// Écran Tableau de bord
// ---------------------------------------------------------------------------

export async function statsTableauDeBord(periode: string): Promise<StatsTableauDeBord> {
  const lignes = await lignesDuMois(periode);
  const totaux = calculeTotaux(lignes);

  const base: StatsTableauDeBord = {
    boxTotal: 0,
    boxLoues: 0,
    boxLibres: 0,
    tauxOccupation: 0,
    periode,
    encaisse: totaux.encaisse,
    reste: totaux.reste,
    contratsRegles: totaux.regles,
    contratsTotal: totaux.total,
    impayesMontant: 0,
    impayesClients: 0,
    contratsEnPreavis: 0,
    demandesNouvelles: 0,
  };

  if (estModeDemo()) {
    // Sans base, seuls les chiffres du carnet sont réels ; le reste tient du
    // back-office et reste donc à zéro plutôt qu'inventé.
    const box = demoBoxListe();
    return { ...base, boxTotal: box.length, boxLoues: box.length, tauxOccupation: 100 };
  }

  const supabase = await createClient();

  // L'occupation se lit sur le référentiel de l'app (67 box réels), pas sur
  // `units` : celle-ci contient encore 70 lignes « À localiser » issues d'un
  // import, qui gonfleraient le total et écraseraient le taux.
  const [total, loues, impayes, preavis, demandes] = await Promise.all([
    supabase.from("sr_box").select("id", { count: "exact", head: true }),
    supabase
      .from("sr_contrats")
      .select("id", { count: "exact", head: true })
      .not("box_id", "is", null)
      .is("date_fin", null),
    supabase.from("invoices").select("montant_ttc, customer_id").in("statut", ["emise", "en_retard"]),
    supabase.from("contracts").select("id", { count: "exact", head: true }).eq("statut", "en_preavis"),
    supabase
      .from("reservation_requests")
      .select("id", { count: "exact", head: true })
      .eq("statut", "nouvelle"),
  ]);

  const boxTotal = total.count ?? 0;
  const boxLoues = loues.count ?? 0;
  const factures = impayes.data ?? [];

  return {
    ...base,
    boxTotal,
    boxLoues,
    boxLibres: Math.max(0, boxTotal - boxLoues),
    tauxOccupation: boxTotal > 0 ? Math.round((boxLoues / boxTotal) * 100) : 0,
    impayesMontant: factures.reduce((somme, f) => somme + f.montant_ttc, 0),
    impayesClients: new Set(factures.map((f) => f.customer_id)).size,
    contratsEnPreavis: preavis.count ?? 0,
    demandesNouvelles: demandes.count ?? 0,
  };
}


// ---------------------------------------------------------------------------
// Rapprochement box ↔ locataire
// ---------------------------------------------------------------------------

/**
 * Les box du back-office proposés au rattachement d'un contrat du carnet.
 *
 * On ne masque pas ceux déjà rattachés : l'exploitant doit voir qu'un box est
 * pris, et par qui, plutôt que de le chercher en vain dans une liste amputée.
 * C'est le bouton de rattachement qui est neutralisé côté interface.
 */
export async function boxRattachables(): Promise<BoxRattachable[]> {
  if (estModeDemo()) return [];

  const supabase = await createClient();

  const [boxRes, contratsRes] = await Promise.all([
    supabase.from("sr_box").select("id, numero, batiment, surface_m2"),
    supabase
      .from("sr_contrats")
      .select("box_id, sr_locataires (nom)")
      .not("box_id", "is", null),
  ]);

  if (boxRes.error) throw new Error(boxRes.error.message);
  if (contratsRes.error) throw new Error(contratsRes.error.message);

  type ContratJointNom = { box_id: string | null; sr_locataires: { nom: string } | null };

  const occupantParBox = new Map<string, string>();
  for (const c of (contratsRes.data ?? []) as unknown as ContratJointNom[]) {
    if (c.box_id && c.sr_locataires?.nom) occupantParBox.set(c.box_id, c.sr_locataires.nom);
  }

  return (boxRes.data ?? []).map((b) => ({
    box_id: b.id,
    numero: b.numero,
    batiment: b.batiment,
    surface_m2: b.surface_m2,
    dejaRattacheA: occupantParBox.get(b.id) ?? null,
  }));
}
