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
