// Mode démo de l'application « Suivi des règlements ».
//
// Objectif : pouvoir faire tourner l'app en local, avec les vraies données du
// CSV, sans base Supabase. Les règlements pointés vivent en mémoire dans le
// processus du serveur de développement : ils survivent à la navigation entre
// les mois (critère d'acceptation n°3) mais pas à un redémarrage. C'est
// volontaire — le mode démo sert à voir l'écran fonctionner, la persistance
// réelle est le rôle de Supabase.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DEMO_CSV } from "@/lib/suivi/demo-data";
import { parseSeedCsv, type SeedData } from "@/lib/suivi/seed-csv";
import type {
  Box,
  Contrat,
  FicheLocataire,
  LigneMois,
  Locataire,
  Reglement,
} from "@/lib/suivi/types";

type DemoStore = {
  locataires: Map<string, Locataire>;
  box: Map<string, Box>;
  contrats: Map<string, Contrat>;
  /** Clé « contratId|periode » → règlement. */
  reglements: Map<string, Reglement>;
};

/**
 * Le vrai fichier, s'il est présent en local (il est gitignoré : le dépôt est
 * public et le CSV contient des données personnelles). Sinon le jeu
 * pseudonymisé embarqué, de structure identique.
 */
function chargeCsv(): string {
  try {
    return readFileSync(join(process.cwd(), "data", "locataires_seed.csv"), "utf-8");
  } catch {
    return DEMO_CSV;
  }
}

function construit(seed: SeedData): DemoStore {
  const store: DemoStore = {
    locataires: new Map(),
    box: new Map(),
    contrats: new Map(),
    reglements: new Map(),
  };

  // Les identifiants sont dérivés des clés du CSV : stables d'un démarrage à
  // l'autre, donc une URL de fiche reste valide après rechargement.
  for (const l of seed.locataires) {
    store.locataires.set(l.cle, {
      id: l.cle,
      nom: l.nom,
      societe: l.societe,
      telephone: l.telephone,
      email: l.email,
      date_entree: l.date_entree,
      actif: true,
      observations: null,
      observations_updated_at: null,
    });
  }

  for (const b of seed.box) {
    store.box.set(b.cle, {
      id: b.cle,
      numero: b.numero,
      batiment: b.batiment,
      surface_m2: b.surface_m2,
    });
  }

  for (const c of seed.contrats) {
    store.contrats.set(c.cle, {
      id: c.cle,
      locataire_id: c.locataire_cle,
      box_id: c.box_cle,
      loyer_mensuel_eur: c.loyer_mensuel_eur,
      date_debut: c.date_debut,
      date_fin: null,
      remarque: c.remarque,
    });
  }

  return store;
}

// Singleton attaché à globalThis : en développement, Next recharge les modules
// à chaque édition, et un simple `let` remettrait les règlements pointés à zéro
// à la moindre sauvegarde de fichier.
const GLOBAL_KEY = Symbol.for("lgbox.suivi.demo-store");
type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: DemoStore };

function store(): DemoStore {
  const g = globalThis as GlobalWithStore;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = construit(parseSeedCsv(chargeCsv()));
  }
  return g[GLOBAL_KEY];
}

function cle(contratId: string, periode: string): string {
  return `${contratId}|${periode}`;
}

export function demoLignesMois(periode: string): LigneMois[] {
  const s = store();
  return [...s.contrats.values()].map((contrat) => {
    const locataire = s.locataires.get(contrat.locataire_id)!;
    const box = contrat.box_id ? s.box.get(contrat.box_id) ?? null : null;
    return {
      contrat_id: contrat.id,
      locataire_id: locataire.id,
      nom: locataire.nom,
      societe: locataire.societe,
      box_numero: box?.numero ?? null,
      batiment: box?.batiment ?? null,
      loyer_mensuel_eur: contrat.loyer_mensuel_eur,
      reglement: s.reglements.get(cle(contrat.id, periode)) ?? null,
    };
  });
}

export function demoFiche(locataireId: string): FicheLocataire | null {
  const s = store();
  const locataire = s.locataires.get(locataireId);
  if (!locataire) return null;

  const contrats = [...s.contrats.values()]
    .filter((c) => c.locataire_id === locataireId)
    .map((c) => ({ ...c, box: c.box_id ? s.box.get(c.box_id) ?? null : null }));

  const ids = new Set(contrats.map((c) => c.id));
  const reglements = [...s.reglements.values()].filter((r) => ids.has(r.contrat_id));

  return { locataire, contrats, reglements };
}

export function demoUpsertReglement(
  contratId: string,
  periode: string,
  patch: Partial<Omit<Reglement, "id" | "contrat_id" | "periode">>
): Reglement {
  const s = store();
  const k = cle(contratId, periode);
  const existant = s.reglements.get(k);
  const suivant: Reglement = {
    id: k,
    contrat_id: contratId,
    periode,
    statut: patch.statut ?? existant?.statut ?? "paye",
    montant_encaisse_eur: patch.montant_encaisse_eur ?? existant?.montant_encaisse_eur ?? 0,
    date_encaissement: patch.date_encaissement ?? existant?.date_encaissement ?? null,
    moyen: patch.moyen ?? existant?.moyen ?? null,
    note: patch.note ?? existant?.note ?? null,
    updated_at: new Date().toISOString(),
  };
  s.reglements.set(k, suivant);
  return suivant;
}

export function demoSupprimeReglement(contratId: string, periode: string): void {
  store().reglements.delete(cle(contratId, periode));
}

export function demoEnregistreObservations(locataireId: string, observations: string): void {
  const s = store();
  const locataire = s.locataires.get(locataireId);
  if (!locataire) return;
  s.locataires.set(locataireId, {
    ...locataire,
    observations: observations.trim() === "" ? null : observations,
    observations_updated_at: new Date().toISOString(),
  });
}

export function demoContrat(contratId: string): Contrat | null {
  return store().contrats.get(contratId) ?? null;
}

/**
 * Les box du CSV, avec leur surface et le locataire en place — de quoi
 * alimenter l'écran Box en mode démo. `demoLignesMois` ne suffisait pas :
 * une ligne de mois ne porte pas la surface.
 */
export function demoBoxAvecOccupant(): Array<{
  box: Box;
  locataire: Locataire | null;
  contrat: Contrat | null;
  loyer: number;
}> {
  const s = store();
  const contratParBox = new Map<string, Contrat>();
  for (const c of s.contrats.values()) {
    if (c.box_id && !contratParBox.has(c.box_id)) contratParBox.set(c.box_id, c);
  }

  return [...s.box.values()].map((box) => {
    const contrat = contratParBox.get(box.id);
    const locataire = contrat ? s.locataires.get(contrat.locataire_id) ?? null : null;
    return {
      box,
      locataire,
      contrat: contrat ?? null,
      loyer: contrat?.loyer_mensuel_eur ?? 0,
    };
  });
}
