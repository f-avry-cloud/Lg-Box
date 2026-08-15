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

  const [unitsRes, contratsRes] = await Promise.all([
    supabase
      .from("units")
      .select("id, numero, zone, taille_m2, statut, prix_mensuel_standard")
      .order("numero", { ascending: true }),
    supabase
      .from("contracts")
      .select("unit_id, customers (prenom, nom)")
      .in("statut", ["actif", "en_preavis"]),
  ]);

  if (unitsRes.error) throw new Error(unitsRes.error.message);
  if (contratsRes.error) throw new Error(contratsRes.error.message);

  type ContratJointClient = {
    unit_id: string;
    customers: { prenom: string | null; nom: string | null } | null;
  };

  const locataireParBox = new Map<string, string>();
  for (const c of (contratsRes.data ?? []) as unknown as ContratJointClient[]) {
    const client = c.customers;
    if (!client) continue;
    locataireParBox.set(c.unit_id, [client.prenom, client.nom].filter(Boolean).join(" ").trim());
  }

  const box: BoxListe[] = (unitsRes.data ?? []).map((u) => ({
    id: u.id,
    numero: u.numero,
    batiment: u.zone,
    surface_m2: u.taille_m2,
    statut: u.statut,
    prix_mensuel_standard: u.prix_mensuel_standard,
    locataire: locataireParBox.get(u.id) ?? null,
  }));

  return groupeParBatiment(box);
}

/** L'édition écrit dans `units` : impossible sans base. */
export function boxModifiables(): boolean {
  return !estModeDemo();
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

  const [total, loues, impayes, preavis, demandes] = await Promise.all([
    supabase.from("units").select("id", { count: "exact", head: true }),
    supabase.from("units").select("id", { count: "exact", head: true }).eq("statut", "loue"),
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

  const [unitsRes, srBoxRes] = await Promise.all([
    supabase
      .from("units")
      .select("id, numero, zone, taille_m2, statut")
      .order("numero", { ascending: true }),
    supabase
      .from("sr_box")
      .select("id, unit_id, sr_contrats (sr_locataires (nom))")
      .not("unit_id", "is", null),
  ]);

  if (unitsRes.error) throw new Error(unitsRes.error.message);
  if (srBoxRes.error) throw new Error(srBoxRes.error.message);

  type SrBoxJoint = {
    unit_id: string | null;
    sr_contrats: Array<{ sr_locataires: { nom: string } | null }> | null;
  };

  const occupantParUnit = new Map<string, string>();
  for (const b of (srBoxRes.data ?? []) as unknown as SrBoxJoint[]) {
    if (!b.unit_id) continue;
    const nom = b.sr_contrats?.[0]?.sr_locataires?.nom;
    if (nom) occupantParUnit.set(b.unit_id, nom);
  }

  return (unitsRes.data ?? []).map((u) => ({
    unit_id: u.id,
    numero: u.numero,
    batiment: u.zone,
    surface_m2: u.taille_m2,
    statut: u.statut,
    dejaRattacheA: occupantParUnit.get(u.id) ?? null,
  }));
}
