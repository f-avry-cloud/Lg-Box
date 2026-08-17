// Modèle de données de l'application compagnon « Suivi des règlements ».
// Volontairement séparé du modèle back-office (types/database.ts) : le carnet
// d'encaissement manipule locataire / box / contrat / règlement, pas
// customer / unit / contract / invoice.

export type ReglementStatut = "attendu" | "paye" | "partiel" | "retard";
export type MoyenPaiement = "virement" | "cheque" | "especes" | "CB" | "autre";

export const MOYENS_PAIEMENT: readonly MoyenPaiement[] = [
  "virement",
  "cheque",
  "especes",
  "CB",
  "autre",
] as const;

export const MOYEN_LABELS: Record<MoyenPaiement, string> = {
  virement: "Virement",
  cheque: "Chèque",
  especes: "Espèces",
  CB: "Carte bancaire",
  autre: "Autre",
};

export type Locataire = {
  id: string;
  nom: string;
  societe: string | null;
  telephone: string | null;
  email: string | null;
  date_entree: string | null;
  actif: boolean;
  observations: string | null;
  observations_updated_at: string | null;
};

export type Box = {
  id: string;
  numero: string;
  batiment: string;
  surface_m2: number | null;
};

export type Contrat = {
  id: string;
  locataire_id: string;
  box_id: string | null;
  loyer_mensuel_eur: number;
  date_debut: string | null;
  date_fin: string | null;
  remarque: string | null;
};

export type Reglement = {
  id: string;
  contrat_id: string;
  periode: string;
  statut: ReglementStatut;
  montant_encaisse_eur: number;
  date_encaissement: string | null;
  moyen: MoyenPaiement | null;
  note: string | null;
  updated_at: string;
};

// Une ligne de la liste du mois : un contrat, son locataire, son box, et
// l'état de son règlement pour la période affichée. `reglement` est null
// quand aucune ligne n'existe encore — ce qui vaut « attendu ».
export type LigneMois = {
  contrat_id: string;
  locataire_id: string;
  nom: string;
  societe: string | null;
  box_numero: string | null;
  batiment: string | null;
  loyer_mensuel_eur: number;
  reglement: Reglement | null;
};

// Fiche locataire : le locataire, ses contrats (un par box) et les règlements
// des douze derniers mois, toutes périodes confondues.
export type FicheLocataire = {
  locataire: Locataire;
  contrats: Array<
    Contrat & {
      box: Box | null;
    }
  >;
  reglements: Reglement[];
};

// Libellé affiché à la place du numéro de box tant qu'il n'est pas établi.
export const BOX_A_IDENTIFIER = "box à identifier";

// Libellé affiché quand l'export ne donne pas le nom du locataire : le loyer
// est bien encaissé, la ligne doit rester pointable et comptée dans les totaux.
export const LOCATAIRE_A_IDENTIFIER = "Locataire à identifier";

// ---------------------------------------------------------------------------
// Écran Box — le référentiel des box vient du back-office (table `units`),
// pas de sr_box : c'est lui qui fait foi pour la surface et le numéro, et
// c'est lui que l'exploitant veut corriger depuis son téléphone.
// ---------------------------------------------------------------------------

export type BoxListe = {
  id: string;
  numero: string;
  batiment: string | null;
  surface_m2: number | null;
  statut: "libre" | "loue" | "reserve" | "hors_service";
  prix_mensuel_standard: number;
  /** Locataire en place, quand le box est loué. */
  locataire: string | null;
  /** Contrat qui occupe ce box — nécessaire pour l'en détacher. */
  contrat_id: string | null;
  /**
   * Détail du locataire en place, chargé avec la liste plutôt qu'à
   * l'ouverture de la fiche : 67 box tiennent en une requête, et la fiche
   * s'ouvre sans attente ni écran de chargement.
   */
  detail: DetailOccupation | null;
};

export type Periodicite = "mensuelle" | "trimestrielle";

export const PERIODICITE_LABELS: Record<Periodicite, string> = {
  mensuelle: "Mensuelle",
  trimestrielle: "Trimestrielle",
};

/** Ce qu'il faut savoir d'un occupant sans quitter la fiche du box. */
export type DetailOccupation = {
  locataire_id: string;
  nom: string;
  societe: string | null;
  telephone: string | null;
  email: string | null;
  date_entree: string | null;
  loyer_mensuel_eur: number;
  periodicite: Periodicite;
  /** Sortie programmée : dernier mois dû. Null tant qu'aucune n'est prévue. */
  date_fin: string | null;
  /** Règlement de la période affichée, null quand rien n'est pointé. */
  reglement: Reglement | null;
};

export type GroupeBatiment = {
  batiment: string;
  box: BoxListe[];
  surface_totale: number;
};

export const BATIMENT_NON_PRECISE = "Sans bâtiment";

// Zone posée par l'import du registre Excel sur les box dont l'emplacement
// n'est pas encore établi : 70 des 137 box du site sont dans ce cas. Ce n'est
// pas un bâtiment, c'est une file d'attente — elle se range en fin de liste et
// s'affiche en orange, comme les box sans surface.
export const BATIMENT_A_LOCALISER = "À localiser";

export function estBatimentATraiter(batiment: string): boolean {
  return batiment === BATIMENT_NON_PRECISE || batiment === BATIMENT_A_LOCALISER;
}

// ---------------------------------------------------------------------------
// Écran Tableau de bord
// ---------------------------------------------------------------------------

export type StatsTableauDeBord = {
  boxTotal: number;
  boxLoues: number;
  boxLibres: number;
  tauxOccupation: number;
  /** Carnet d'encaissement du mois affiché (tables sr_*). */
  periode: string;
  encaisse: number;
  reste: number;
  contratsRegles: number;
  contratsTotal: number;
  /** Back-office. */
  impayesMontant: number;
  impayesClients: number;
  contratsEnPreavis: number;
  demandesNouvelles: number;
};

// ---------------------------------------------------------------------------
// Rapprochement box ↔ locataire
// ---------------------------------------------------------------------------

/** Un box du référentiel mobile proposé au rattachement à un locataire. */
export type BoxRattachable = {
  box_id: string;
  numero: string;
  batiment: string | null;
  surface_m2: number | null;
  /** Nom du locataire déjà rattaché à ce box, le cas échéant. */
  dejaRattacheA: string | null;
};

/** Un contrat encore sans box, proposé à l'affectation depuis l'écran Box. */
export type ContratSansBox = {
  contrat_id: string;
  locataire_id: string;
  nom: string;
  societe: string | null;
  loyer_mensuel_eur: number;
};
