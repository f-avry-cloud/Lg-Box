// Accès aux données de l'application « Suivi des règlements ».
//
// Deux implémentations derrière la même interface :
//  - Supabase, sur les tables sr_* de la base du back-office ;
//  - un magasin en mémoire alimenté par le CSV, pour tourner en local sans base.
//
// C'est ici, et uniquement ici, que se décide laquelle est utilisée : les
// écrans et les Server Actions ne connaissent que cette interface.

import { createClient } from "@/lib/supabase/server";
import type { UnitFloor } from "@/types/database";
import {
  demoBoxAvecOccupant,
  demoCharges,
  demoContrat,
  demoDemandes,
  demoEnregistreObservations,
  demoFiche,
  demoLignesMois,
  demoReglementsDeLAnnee,
  demoSupprimeReglement,
  demoUpsertReglement,
} from "@/lib/suivi/demo-store";
import { calculeTotaux, cumuleEncaisse, resumeFacturation } from "@/lib/suivi/totals";
import { chargesCumulees, chargesDuMois, totalCharges } from "@/lib/suivi/charges";
import { trieDemandes } from "@/lib/suivi/demandes";
import { groupeParBatiment, parseBoxReferenceCsv } from "@/lib/suivi/box";
import { estPlace, type BoxPlan } from "@/lib/suivi/plan";
import { BOX_REFERENCE_CSV } from "@/lib/suivi/box-reference";
import { contratDuPour } from "@/lib/suivi/contrat";
import type { DestinataireFacture, ParametresMail } from "@/lib/suivi/mail";
import type { EtatReprise, LocataireReprise } from "@/lib/suivi/reprise";
import type { Charge } from "@/lib/suivi/charges";
import { parsePeriode, periodeCourante, premierJour } from "@/lib/suivi/period";
import {
  type Box,
  type BoxListe,
  type Contrat,
  type FicheLocataire,
  type GroupeBatiment,
  type LigneMois,
  type Locataire,
  type BoxRattachable,
  type DetailOccupation,
  type Periodicite,
  type CandidatAffectation,
  type DemandeReservation,
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
      ),
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
    // Tout mois commencé est dû : un contrat sorti au 30 septembre reste
    // réclamé en septembre, et disparaît en octobre. Filtrer sur
    // « date_fin is null » l'aurait fait disparaître dès la programmation
    // de la sortie, avec le loyer du mois en cours.
    .filter((c) => contratDuPour(periode, c.date_debut, c.date_fin))
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
  const periode = periodeCourante();

  const [boxRes, contratsRes, reglementsRes] = await Promise.all([
    supabase.from("sr_box").select("id, numero, batiment, surface_m2, tarif_indicatif_eur, unit_id"),
    supabase
      .from("sr_contrats")
      .select(
        "id, box_id, loyer_mensuel_eur, date_debut, date_fin, periodicite, sr_locataires (id, nom, societe, telephone, email)"
      )
      .not("box_id", "is", null),
    supabase.from("sr_reglements").select("*").eq("periode", periode),
  ]);

  if (boxRes.error) throw new Error(boxRes.error.message);
  if (contratsRes.error) throw new Error(contratsRes.error.message);
  if (reglementsRes.error) throw new Error(reglementsRes.error.message);

  type ContratDetaille = {
    id: string;
    box_id: string | null;
    loyer_mensuel_eur: number;
    date_debut: string | null;
    date_fin: string | null;
    periodicite: Periodicite;
    sr_locataires: {
      id: string;
      nom: string;
      societe: string | null;
      telephone: string | null;
      email: string | null;
    } | null;
  };

  const reglementParContrat = new Map<string, Reglement>();
  for (const r of (reglementsRes.data ?? []) as Reglement[]) {
    reglementParContrat.set(r.contrat_id, r);
  }

  const occupantParBox = new Map<string, { contratId: string; detail: DetailOccupation }>();
  for (const c of (contratsRes.data ?? []) as unknown as ContratDetaille[]) {
    const l = c.sr_locataires;
    if (!c.box_id || !l) continue;
    // Un box dont la sortie est programmée reste occupé jusqu'à l'échéance.
    if (!contratDuPour(periode, c.date_debut, c.date_fin)) continue;
    occupantParBox.set(c.box_id, {
      contratId: c.id,
      detail: {
        locataire_id: l.id,
        nom: l.nom,
        societe: l.societe,
        telephone: l.telephone,
        email: l.email,
        date_entree: c.date_debut,
        loyer_mensuel_eur: c.loyer_mensuel_eur,
        periodicite: c.periodicite,
        date_fin: c.date_fin,
        reglement: reglementParContrat.get(c.id) ?? null,
      },
    });
  }

  const box: BoxListe[] = (boxRes.data ?? []).map((b) => {
    const occupant = occupantParBox.get(b.id) ?? null;
    return {
      id: b.id,
      numero: b.numero,
      batiment: b.batiment,
      surface_m2: b.surface_m2,
      // Le carnet ne connaît que deux états : occupé par un locataire, ou non.
      statut: occupant ? ("loue" as const) : ("libre" as const),
      tarif_indicatif_eur: b.tarif_indicatif_eur,
      locataire: occupant?.detail.nom ?? null,
      contrat_id: occupant?.contratId ?? null,
      detail: occupant?.detail ?? null,
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
  if (estModeDemo()) {
    return [...new Set(parseBoxReferenceCsv(BOX_REFERENCE_CSV).map((b) => b.batiment))].sort(
      (a, b) => a.localeCompare(b, "fr", { numeric: true })
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("sr_box").select("batiment");
  if (error) throw new Error(error.message);
  return [...new Set((data ?? []).map((b) => b.batiment))].sort((a, b) =>
    a.localeCompare(b, "fr", { numeric: true })
  );
}

/**
 * Comparaison de bâtiments tolérante aux accents et à la casse : le carnet
 * d'encaissement écrit « Bat I » et « Etage », le référentiel « Bât I » et
 * « Étage ». Utilisée uniquement par le mode démo, pour rapprocher les deux
 * jeux de fichiers ; en base, c'est `box_id` qui fait foi.
 */
function normaliseBatiment(valeur: string | null): string {
  return (valeur ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr")
    .trim();
}

function demoBoxListe(): BoxListe[] {
  // Le mode démo part du référentiel fourni par l'exploitant (67 box), et non
  // des seuls box déduits du carnet : sans cela, tous les box seraient occupés
  // et l'affectation d'un locataire n'aurait aucune cible.
  const occupants = new Map<string, { detail: DetailOccupation; loyer: number }>();
  for (const { box, locataire, contrat, loyer } of demoBoxAvecOccupant()) {
    if (!locataire) continue;
    occupants.set(`${normaliseBatiment(box.batiment)}|${box.numero.toLowerCase()}`, {
      loyer,
      detail: {
        locataire_id: locataire.id,
        nom: locataire.nom,
        societe: locataire.societe,
        telephone: locataire.telephone,
        email: locataire.email,
        date_entree: contrat?.date_debut ?? null,
        loyer_mensuel_eur: loyer,
        // Une périodicité sur trois en trimestriel, pour éprouver l'affichage.
        periodicite: loyer % 3 === 0 ? "trimestrielle" : "mensuelle",
        date_fin: null,
        reglement: null,
      },
    });
  }

  const reference = parseBoxReferenceCsv(BOX_REFERENCE_CSV);

  return reference.map((b) => {
    const occupant =
      occupants.get(`${normaliseBatiment(b.batiment)}|${b.numero.toLowerCase()}`) ?? null;
    return {
      id: `${b.batiment}|${b.numero}`,
      numero: b.numero,
      batiment: b.batiment,
      surface_m2: b.surface_m2,
      statut: occupant ? ("loue" as const) : ("libre" as const),
      tarif_indicatif_eur: null,
      locataire: occupant?.detail.nom ?? null,
      contrat_id: null,
      detail: occupant?.detail ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Écran Tableau de bord
// ---------------------------------------------------------------------------

/**
 * Chiffre d'affaires encaissé depuis le 1er janvier de l'année demandée.
 *
 * Compté sur les règlements du carnet, avec la même règle que le total du
 * mois (`cumuleEncaisse`) : un mois pointé d'un tap, sans montant saisi, vaut
 * le loyer plein. Les périodes sont des textes `AAAA-MM` de largeur fixe, donc
 * comparables tels quels — pas besoin de convertir en dates.
 */
export async function caDepuisJanvier(annee: number): Promise<number> {
  if (estModeDemo()) return cumuleEncaisse(demoReglementsDeLAnnee(annee));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sr_reglements")
    .select("statut, montant_encaisse_eur, sr_contrats (loyer_mensuel_eur)")
    .gte("periode", `${annee}-01`)
    .lte("periode", `${annee}-12`);

  if (error) throw new Error(error.message);

  type ReglementJoint = {
    statut: Reglement["statut"];
    montant_encaisse_eur: number;
    sr_contrats: { loyer_mensuel_eur: number } | null;
  };

  return cumuleEncaisse(
    ((data ?? []) as unknown as ReglementJoint[]).map((r) => ({
      statut: r.statut,
      montant_encaisse_eur: r.montant_encaisse_eur,
      loyer_mensuel_eur: r.sr_contrats?.loyer_mensuel_eur ?? 0,
    }))
  );
}

export async function statsTableauDeBord(periode: string): Promise<StatsTableauDeBord> {
  const { annee } = parsePeriode(periode);
  const [lignes, caAnnuel, charges] = await Promise.all([
    lignesDuMois(periode),
    caDepuisJanvier(annee),
    listeCharges(),
  ]);
  const totaux = calculeTotaux(lignes);
  const facturation = resumeFacturation(lignes);

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
    annee,
    caAnnuel,
    aFacturer: facturation.aFacturer,
    dejaFacturees: facturation.dejaFacturees,
    montantAFacturer: facturation.montant,
    chargesDuMois: totalCharges(chargesDuMois(charges, periode)),
    chargesCumulees: chargesCumulees(charges, periode),
    impayesMontant: 0,
    impayesClients: 0,
    contratsEnPreavis: 0,
    demandesNouvelles: 0,
    demandesEnAttente: 0,
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
  const [total, loues, impayes, preavis, demandes, attente] = await Promise.all([
    supabase.from("sr_box").select("id", { count: "exact", head: true }),
    supabase
      .from("sr_contrats")
      .select("id", { count: "exact", head: true })
      .not("box_id", "is", null)
      .or(`date_fin.is.null,date_fin.gte.${premierJour(periode)}`),
    supabase.from("invoices").select("montant_ttc, customer_id").in("statut", ["emise", "en_retard"]),
    supabase.from("contracts").select("id", { count: "exact", head: true }).eq("statut", "en_preavis"),
    supabase
      .from("reservation_requests")
      .select("id", { count: "exact", head: true })
      .eq("statut", "nouvelle"),
    supabase
      .from("reservation_requests")
      .select("id", { count: "exact", head: true })
      .eq("statut", "liste_attente"),
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
    demandesEnAttente: attente.count ?? 0,
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
      .select("box_id, date_debut, date_fin, sr_locataires (nom)")
      .not("box_id", "is", null),
  ]);

  if (boxRes.error) throw new Error(boxRes.error.message);
  if (contratsRes.error) throw new Error(contratsRes.error.message);

  type ContratJointNom = {
    box_id: string | null;
    date_debut: string | null;
    date_fin: string | null;
    sr_locataires: { nom: string } | null;
  };

  // Un contrat dont la sortie a pris effet ne bloque plus le box : sans ce
  // filtre, un box libéré resterait marqué « pris » et impossible à
  // réattribuer, alors que son occupant est parti.
  const periodeCourse = periodeCourante();
  const occupantParBox = new Map<string, string>();
  for (const c of (contratsRes.data ?? []) as unknown as ContratJointNom[]) {
    if (!c.box_id || !c.sr_locataires?.nom) continue;
    if (!contratDuPour(periodeCourse, c.date_debut, c.date_fin)) continue;
    occupantParBox.set(c.box_id, c.sr_locataires.nom);
  }

  return (boxRes.data ?? []).map((b) => ({
    box_id: b.id,
    numero: b.numero,
    batiment: b.batiment,
    surface_m2: b.surface_m2,
    dejaRattacheA: occupantParBox.get(b.id) ?? null,
  }));
}


// ---------------------------------------------------------------------------
// Plan interactif
// ---------------------------------------------------------------------------

export type GroupePlan = { batiment: string; boxes: BoxPlan[] };

/**
 * Les box du référentiel mobile, enrichis de la géométrie du plan.
 *
 * La géométrie vit dans `units` (c'est le plan dessiné dans le back-office) et
 * n'est ici que **lue** : l'app mobile ne modifie pas le back-office. Le
 * raccord se fait sur `sr_box.unit_id` — 60 des 67 box aujourd'hui. Les sept
 * autres sont des sous-numéros (2A, 4C, 10bis…) sans unité propre dans le
 * plan : ils restent dans la liste, signalés comme non placés, plutôt que de
 * disparaître silencieusement de l'écran.
 */
export async function planParBatiment(): Promise<GroupePlan[]> {
  if (estModeDemo()) return planDemo();

  const supabase = await createClient();

  const [boxRes, geoRes, contratsRes] = await Promise.all([
    supabase.from("sr_box").select("id, numero, batiment, surface_m2, tarif_indicatif_eur, unit_id"),
    supabase
      .from("units")
      .select("id, floor, pos_x, pos_y, largeur_cm, profondeur_cm, rotation_deg"),
    supabase
      .from("sr_contrats")
      .select("id, box_id, date_debut, date_fin, sr_locataires (nom)")
      .not("box_id", "is", null),
  ]);

  if (boxRes.error) throw new Error(boxRes.error.message);
  if (geoRes.error) throw new Error(geoRes.error.message);
  if (contratsRes.error) throw new Error(contratsRes.error.message);

  type Geo = {
    id: string;
    floor: UnitFloor;
    pos_x: number | null;
    pos_y: number | null;
    largeur_cm: number | null;
    profondeur_cm: number | null;
    rotation_deg: number;
  };
  type ContratJointNom = { id: string; box_id: string | null; sr_locataires: { nom: string } | null };

  const geoParUnit = new Map<string, Geo>();
  for (const g of (geoRes.data ?? []) as Geo[]) geoParUnit.set(g.id, g);

  const occupantParBox = new Map<string, { nom: string; contratId: string }>();
  for (const c of (contratsRes.data ?? []) as unknown as ContratJointNom[]) {
    if (c.box_id && c.sr_locataires?.nom) {
      occupantParBox.set(c.box_id, { nom: c.sr_locataires.nom, contratId: c.id });
    }
  }

  const boxes: BoxPlan[] = (boxRes.data ?? []).map((b) => {
    const geo = b.unit_id ? geoParUnit.get(b.unit_id) ?? null : null;
    const occupant = occupantParBox.get(b.id) ?? null;
    return {
      id: b.id,
      numero: b.numero,
      batiment: b.batiment,
      surface_m2: b.surface_m2,
      occupe: occupant !== null,
      locataire: occupant?.nom ?? null,
      contrat_id: occupant?.contratId ?? null,
      floor: geo?.floor ?? null,
      x: geo?.pos_x ?? null,
      y: geo?.pos_y ?? null,
      largeur: geo?.largeur_cm ?? null,
      profondeur: geo?.profondeur_cm ?? null,
      rotation: geo?.rotation_deg ?? 0,
    };
  });

  return regroupePlan(boxes);
}

function regroupePlan(boxes: BoxPlan[]): GroupePlan[] {
  const parBatiment = new Map<string, BoxPlan[]>();
  for (const b of boxes) {
    const liste = parBatiment.get(b.batiment);
    if (liste) liste.push(b);
    else parBatiment.set(b.batiment, [b]);
  }

  return [...parBatiment.entries()]
    .map(([batiment, liste]) => ({
      batiment,
      boxes: liste.sort((a, b) =>
        a.numero.localeCompare(b.numero, "fr", { numeric: true, sensitivity: "base" })
      ),
    }))
    // Les bâtiments sans aucun box placé passent en dernier : leur onglet
    // n'affiche pas de plan, seulement la liste des box non placés.
    .sort((a, b) => {
      const aPlace = a.boxes.some(estPlace);
      const bPlace = b.boxes.some(estPlace);
      if (aPlace !== bPlace) return aPlace ? -1 : 1;
      return a.batiment.localeCompare(b.batiment, "fr", { numeric: true });
    });
}

/**
 * En démo, aucune géométrie n'est disponible : on en fabrique une en grille
 * régulière, uniquement pour éprouver le rendu et les gestes. Les proportions
 * ne prétendent pas décrire le site réel.
 */
function planDemo(): GroupePlan[] {
  const boxes: BoxPlan[] = demoBoxListe().map((b, index) => {
    const colonne = index % 5;
    const rangee = Math.floor(index / 5);
    return {
      id: b.id,
      numero: b.numero,
      batiment: b.batiment ?? "Sans bâtiment",
      surface_m2: b.surface_m2,
      occupe: b.locataire !== null,
      locataire: b.locataire,
      contrat_id: b.contrat_id,
      floor: null,
      x: colonne * 350,
      y: rangee * 350,
      largeur: 300,
      profondeur: 300,
      rotation: 0,
    };
  });

  return regroupePlan(boxes);
}


// ---------------------------------------------------------------------------
// Demandes de réservation
// ---------------------------------------------------------------------------

/**
 * Les demandes de réservation, à traiter d'abord puis en attente.
 *
 * Le tri vit dans `lib/suivi/demandes.ts` : il n'a rien d'évident, les deux
 * premiers groupes se classant dans des sens opposés.
 */
export async function demandesReservation(): Promise<DemandeReservation[]> {
  // Sans base, l'écran se montre sur des demandes fictives — numéros de la
  // plage réservée aux fictions, adresses en example.org : les composer ne
  // peut atteindre personne.
  // Le tri s'applique aussi à la démo : sans lui, l'écran de démonstration
  // montrait la file dans le désordre, avec le n° 2 au-dessus du n° 1.
  if (estModeDemo()) return trieDemandes(demoDemandes());

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservation_requests")
    .select(
      "id, nom, email, telephone, taille_souhaitee, date_souhaitee, message, statut, origine, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return trieDemandes((data ?? []) as DemandeReservation[]);
}


// ---------------------------------------------------------------------------
// Envoi groupé des factures
// ---------------------------------------------------------------------------

/** Paramétrage du mail de facture. Null tant que la table est vide. */
export async function parametresMail(): Promise<ParametresMail | null> {
  if (estModeDemo()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sr_mail_parametres")
    .select("expediteur_nom, expediteur_email, repondre_a, copie_email, objet, corps")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as ParametresMail | null) ?? null;
}

/**
 * Qui doit recevoir sa facture pour la période, et qui l'a déjà reçue.
 *
 * On ne retient que les loyers passés en « facturé » : envoyer la facture est
 * le second temps du geste, après l'avoir réclamée. Un loyer déjà encaissé n'a
 * plus de facture à recevoir, un loyer encore « attendu » n'a pas été réclamé.
 */
export async function destinatairesFactures(periode: string): Promise<DestinataireFacture[]> {
  if (estModeDemo()) return [];

  const supabase = await createClient();

  const [contratsRes, reglementsRes, envoisRes] = await Promise.all([
    supabase
      .from("sr_contrats")
      .select(
        "id, date_debut, date_fin, loyer_mensuel_eur, sr_locataires (nom, email), sr_box (numero)"
      ),
    supabase.from("sr_reglements").select("contrat_id, statut").eq("periode", periode),
    supabase
      .from("sr_envois_facture")
      .select("contrat_id")
      .eq("periode", periode)
      .eq("statut", "envoye"),
  ]);

  if (contratsRes.error) throw new Error(contratsRes.error.message);
  if (reglementsRes.error) throw new Error(reglementsRes.error.message);
  if (envoisRes.error) throw new Error(envoisRes.error.message);

  const statuts = new Map<string, string>();
  for (const r of reglementsRes.data ?? []) statuts.set(r.contrat_id, r.statut);

  const expedies = new Set((envoisRes.data ?? []).map((e) => e.contrat_id));

  type ContratJointMail = {
    id: string;
    date_debut: string | null;
    date_fin: string | null;
    loyer_mensuel_eur: number;
    sr_locataires: { nom: string; email: string | null } | null;
    sr_box: { numero: string } | null;
  };

  return ((contratsRes.data ?? []) as unknown as ContratJointMail[])
    .filter((c) => c.sr_locataires !== null)
    .filter((c) => contratDuPour(periode, c.date_debut, c.date_fin))
    .filter((c) => statuts.get(c.id) === "facture")
    .map((c) => ({
      contrat_id: c.id,
      nom: c.sr_locataires!.nom,
      email: c.sr_locataires!.email,
      box: c.sr_box?.numero ?? null,
      loyer: c.loyer_mensuel_eur,
      dejaEnvoye: expedies.has(c.id),
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }));
}


// ---------------------------------------------------------------------------
// Affectation : tous les locataires, logés ou non
// ---------------------------------------------------------------------------

/**
 * Les locataires auxquels on peut affecter un box, avec ce qu'ils louent déjà.
 *
 * La version précédente ne listait que les contrats **en attente** de box :
 * un locataire déjà logé y était introuvable, et lui donner un second box
 * impossible. Or c'est précisément le cas qui faussait les loyers —
 * un bail sur deux box replié sur un seul contrat au montant global.
 */
export async function candidatsAffectation(): Promise<CandidatAffectation[]> {
  if (estModeDemo()) {
    // Tous les locataires, logés compris : c'est justement le locataire déjà
    // logé qu'il faut pouvoir retrouver pour lui donner un second box.
    const parLocataireDemo = new Map<string, CandidatAffectation>();
    for (const l of demoLignesMois(periodeCourante())) {
      const candidat = parLocataireDemo.get(l.locataire_id) ?? {
        locataire_id: l.locataire_id,
        nom: l.nom,
        societe: l.societe,
        contrat_libre: null,
        contrats_loges: [],
      };

      if (l.box_numero) {
        candidat.contrats_loges.push({
          contrat_id: l.contrat_id,
          box_numero: l.box_numero,
          loyer_mensuel_eur: l.loyer_mensuel_eur,
        });
      } else if (!candidat.contrat_libre) {
        candidat.contrat_libre = {
          contrat_id: l.contrat_id,
          loyer_mensuel_eur: l.loyer_mensuel_eur,
          date_debut: demoContrat(l.contrat_id)?.date_debut ?? null,
        };
      }

      parLocataireDemo.set(l.locataire_id, candidat);
    }

    return [...parLocataireDemo.values()].sort((a, b) =>
      a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" })
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sr_contrats")
    .select(
      "id, locataire_id, box_id, loyer_mensuel_eur, date_debut, date_fin, sr_locataires (id, nom, societe), sr_box (numero)"
    );

  if (error) throw new Error(error.message);

  type Joint = {
    id: string;
    box_id: string | null;
    loyer_mensuel_eur: number;
    date_debut: string | null;
    date_fin: string | null;
    sr_locataires: { id: string; nom: string; societe: string | null } | null;
    sr_box: { numero: string } | null;
  };

  const periode = periodeCourante();
  const parLocataire = new Map<string, CandidatAffectation>();

  for (const c of (data ?? []) as unknown as Joint[]) {
    const l = c.sr_locataires;
    if (!l) continue;
    // Un contrat dont la sortie a pris effet ne compte plus : ni comme
    // logement en cours, ni comme contrat en attente de box.
    if (!contratDuPour(periode, c.date_debut, c.date_fin)) continue;

    const candidat = parLocataire.get(l.id) ?? {
      locataire_id: l.id,
      nom: l.nom,
      societe: l.societe,
      contrat_libre: null,
      contrats_loges: [],
    };

    if (c.box_id) {
      candidat.contrats_loges.push({
        contrat_id: c.id,
        box_numero: c.sr_box?.numero ?? null,
        loyer_mensuel_eur: c.loyer_mensuel_eur,
      });
    } else if (!candidat.contrat_libre) {
      candidat.contrat_libre = {
        contrat_id: c.id,
        loyer_mensuel_eur: c.loyer_mensuel_eur,
        date_debut: c.date_debut,
      };
    }

    parLocataire.set(l.id, candidat);
  }

  return [...parLocataire.values()].sort((a, b) =>
    a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" })
  );
}


// ---------------------------------------------------------------------------
// Reprise du centre — temporaire (voir lib/suivi/reprise.ts)
// ---------------------------------------------------------------------------

/**
 * Tous les locataires du carnet, avec leurs box et l'avancement de la
 * campagne d'appels.
 *
 * On part de `sr_locataires` et non des contrats : il faut prévenir chaque
 * personne une fois, pas une fois par box — et un locataire saisi à la main
 * pendant la campagne n'a pas encore de contrat du tout.
 */
export async function listeReprise(): Promise<LocataireReprise[]> {
  if (estModeDemo()) {
    return demoLignesMois(periodeCourante()).map((l) => ({
      locataire_id: l.locataire_id,
      nom: l.nom,
      societe: l.societe,
      telephone: null,
      email: null,
      box: l.box_numero ? [l.box_numero] : [],
      etat: { contacte: false, message_laisse: false, note: null },
    }));
  }

  const supabase = await createClient();

  const [locatairesRes, contratsRes, etatsRes] = await Promise.all([
    supabase.from("sr_locataires").select("id, nom, societe, telephone, email"),
    supabase.from("sr_contrats").select("locataire_id, date_debut, date_fin, sr_box (numero)"),
    supabase
      .from("sr_reprise_contacts")
      .select("locataire_id, contacte, message_laisse, note"),
  ]);

  if (locatairesRes.error) throw new Error(locatairesRes.error.message);
  if (contratsRes.error) throw new Error(contratsRes.error.message);
  if (etatsRes.error) throw new Error(etatsRes.error.message);

  type ContratBox = {
    locataire_id: string;
    date_debut: string | null;
    date_fin: string | null;
    sr_box: { numero: string } | null;
  };

  const periode = periodeCourante();
  const boxParLocataire = new Map<string, string[]>();
  for (const c of (contratsRes.data ?? []) as unknown as ContratBox[]) {
    // Un contrat déjà sorti ne dit plus où trouver la personne sur le site.
    if (!c.sr_box?.numero || !contratDuPour(periode, c.date_debut, c.date_fin)) continue;
    const liste = boxParLocataire.get(c.locataire_id);
    if (liste) liste.push(c.sr_box.numero);
    else boxParLocataire.set(c.locataire_id, [c.sr_box.numero]);
  }

  const etats = new Map<string, EtatReprise>();
  for (const e of etatsRes.data ?? []) {
    etats.set(e.locataire_id, {
      contacte: e.contacte,
      message_laisse: e.message_laisse,
      note: e.note,
    });
  }

  return (locatairesRes.data ?? []).map((l) => ({
    locataire_id: l.id,
    nom: l.nom,
    societe: l.societe,
    telephone: l.telephone,
    email: l.email,
    box: (boxParLocataire.get(l.id) ?? []).sort((a, b) =>
      a.localeCompare(b, "fr", { numeric: true })
    ),
    // Aucune ligne d'avancement = personne n'a encore été appelé. L'absence
    // vaut « à contacter », comme l'absence de règlement vaut « attendu ».
    etat: etats.get(l.id) ?? { contacte: false, message_laisse: false, note: null },
  }));
}


// ---------------------------------------------------------------------------
// Charges du centre
// ---------------------------------------------------------------------------

/**
 * Toutes les charges saisies, sans filtre de période : le filtrage se fait
 * dans `lib/suivi/charges.ts`, qui est pur et testé. Le volume l'autorise
 * largement — une exploitation de cette taille compte quelques dizaines de
 * lignes, pas des milliers.
 */
export async function listeCharges(): Promise<Charge[]> {
  if (estModeDemo()) return demoCharges();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sr_charges")
    .select("id, libelle, montant_eur, categorie, recurrente, periode_debut, periode_fin, note");

  if (error) throw new Error(error.message);

  return (data ?? []).map((c) => ({
    ...c,
    // `numeric` revient en chaîne depuis PostgREST : sans cette conversion,
    // les additions concaténeraient au lieu d'additionner.
    montant_eur: Number(c.montant_eur),
  }));
}
