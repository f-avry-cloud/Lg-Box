// Modèle de données de l'application compagnon « Suivi des règlements ».
// Volontairement séparé du modèle back-office (types/database.ts) : le carnet
// d'encaissement manipule locataire / box / contrat / règlement, pas
// customer / unit / contract / invoice.

export type ReglementStatut = "attendu" | "facture" | "paye" | "partiel" | "retard";
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

/** Le loyer se lit sur le contrat, jamais sur le box : voir `tarif_indicatif_eur`. */

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
  /** Date de réclamation, posée par la facturation groupée du mois. */
  date_facturation: string | null;
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
  /**
   * Tarif mensuel de référence du box, facultatif.
   *
   * Indicatif au sens strict : il pré-remplit un loyer à l'affectation et
   * donne un prix aux box libres, mais le loyer réellement facturé est celui
   * du contrat, qui peut y déroger sans justification.
   */
  tarif_indicatif_eur: number | null;
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
  /** Année de la période affichée, et cumul encaissé depuis son 1er janvier. */
  annee: number;
  caAnnuel: number;
  /** Ce que la facturation groupée du mois changerait. */
  aFacturer: number;
  dejaFacturees: number;
  montantAFacturer: number;
  /**
   * Charges du mois affiché, et cumul depuis le 1er janvier — arrêté au même
   * mois que les recettes, sans quoi le solde annuel opposerait douze mois de
   * charges à huit mois de recettes.
   */
  chargesDuMois: number;
  chargesCumulees: number;
  /** Back-office. */
  impayesMontant: number;
  impayesClients: number;
  contratsEnPreavis: number;
  demandesNouvelles: number;
  /** Personnes en liste d'attente — celles qu'on rappelle quand un box se libère. */
  demandesEnAttente: number;
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

/**
 * Un locataire proposé à l'affectation d'un box, depuis l'écran Box.
 *
 * Deux cas, et c'est toute la logique de l'écran :
 *  - il a un contrat sans box → on lui rattache celui-ci (rien à créer) ;
 *  - il est déjà logé → il faut un **second contrat**, avec son propre loyer,
 *    puisqu'un contrat ne porte qu'un box. C'est ce chemin qui manquait, et
 *    sans lui une location à deux box restait repliée sur un loyer global.
 */
export type CandidatAffectation = {
  locataire_id: string;
  nom: string;
  societe: string | null;
  /** Contrat en attente de box, s'il y en a un. */
  contrat_libre: {
    contrat_id: string;
    loyer_mensuel_eur: number;
    date_debut: string | null;
  } | null;
  /** Contrats déjà logés : sources possibles d'une répartition de loyer. */
  contrats_loges: Array<{
    contrat_id: string;
    box_numero: string | null;
    loyer_mensuel_eur: number;
  }>;
};



// ---------------------------------------------------------------------------
// Écran Demandes de réservation
// ---------------------------------------------------------------------------

// Les demandes viennent du formulaire public (table `reservation_requests` du
// back-office). L'app mobile les lit et fait avancer leur statut : c'est le
// seul point où elle écrit hors de ses tables sr_*, parce qu'une demande se
// traite depuis le téléphone, souvent debout dans l'allée, et que la marquer
// « contactée » ailleurs qu'à l'endroit où on vient d'appeler ne se fait pas.

export type StatutDemande =
  | "nouvelle"
  | "contactee"
  | "convertie"
  | "refusee"
  /**
   * Le centre est plein. La personne n'est pas refusée : elle attend qu'un box
   * se libère. Sans ce statut, « contactée » la faisait disparaître de la liste
   * à traiter, et elle était perdue le jour où un box se libérait.
   */
  | "liste_attente";

export type DemandeReservation = {
  id: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  taille_souhaitee: string | null;
  date_souhaitee: string | null;
  message: string | null;
  statut: StatutDemande;
  /** 'formulaire' (page publique) ou 'manuelle' (notée depuis le téléphone). */
  origine: string;
  created_at: string;
};

export const STATUT_DEMANDE_LABELS: Record<StatutDemande, string> = {
  nouvelle: "Nouvelle",
  contactee: "Contactée",
  convertie: "Convertie",
  refusee: "Refusée",
  liste_attente: "Liste d'attente",
};

export const STATUTS_DEMANDE: readonly StatutDemande[] = [
  "nouvelle",
  "contactee",
  "liste_attente",
  "convertie",
  "refusee",
] as const;

export function couleurStatutDemande(statut: StatutDemande): string {
  if (statut === "nouvelle") return "var(--suivi-orange)";
  if (statut === "convertie") return "var(--suivi-vert)";
  if (statut === "refusee") return "var(--suivi-gris)";
  // L'attente n'est ni une urgence ni un aboutissement : une couleur à part,
  // qui ne se confond avec aucune des deux.
  if (statut === "liste_attente") return "var(--suivi-bleu)";
  return "var(--primary)";
}
