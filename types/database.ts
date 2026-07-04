// Types TypeScript reflétant supabase/schema.sql.
// Maintenus à la main (pas de génération automatique dans ce MVP).

export type UserRole = "admin" | "employee" | "tenant";
export type UnitType = "interieur" | "exterieur" | "climatise";
export type UnitStatus = "libre" | "loue" | "reserve" | "hors_service";
export type CustomerType = "particulier" | "professionnel";
export type ContractStatus = "brouillon" | "actif" | "en_preavis" | "resilie";
export type InvoiceStatus = "brouillon" | "emise" | "payee" | "en_retard" | "annulee";
export type PaymentMethod = "virement" | "carte" | "especes" | "cheque" | "prelevement";
export type PaymentStatus = "valide" | "en_attente" | "echoue";
export type ReservationStatus = "nouvelle" | "contactee" | "convertie" | "refusee";
export type DocumentType = "contrat" | "facture" | "piece_identite" | "autre";

export type Profile = {
  id: string;
  role: UserRole;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  created_at: string;
};

export type Site = {
  id: string;
  nom: string;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  telephone: string | null;
  email_contact: string | null;
  horaires: string | null;
  created_at: string;
};

export type Unit = {
  id: string;
  site_id: string;
  numero: string;
  taille_libelle: string;
  taille_m2: number | null;
  type: UnitType;
  zone: string | null;
  prix_mensuel_standard: number;
  statut: UnitStatus;
  notes: string | null;
  created_at: string;
};

export type Customer = {
  id: string;
  user_id: string | null;
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  type: CustomerType;
  siret: string | null;
  piece_identite_url: string | null;
  notes: string | null;
  created_at: string;
};

export type Contract = {
  id: string;
  customer_id: string;
  unit_id: string;
  date_debut: string;
  date_fin: string | null;
  statut: ContractStatus;
  prix_mensuel: number;
  depot_garantie: number;
  jour_prelevement_mensuel: number;
  preavis_jours: number;
  date_signature: string | null;
  date_demande_resiliation: string | null;
  contrat_pdf_url: string | null;
  motif_resiliation: string | null;
  created_at: string;
};

export type Invoice = {
  id: string;
  contract_id: string;
  customer_id: string;
  numero_facture: string;
  periode_debut: string;
  periode_fin: string;
  montant_ht: number;
  tva: number;
  montant_ttc: number;
  statut: InvoiceStatus;
  date_emission: string;
  date_echeance: string;
  facture_pdf_url: string | null;
  created_at: string;
};

export type Payment = {
  id: string;
  invoice_id: string;
  customer_id: string;
  montant: number;
  methode: PaymentMethod;
  date_paiement: string;
  reference: string | null;
  statut: PaymentStatus;
  created_at: string;
};

export type ReservationRequest = {
  id: string;
  nom: string;
  email: string;
  telephone: string | null;
  taille_souhaitee: string | null;
  date_souhaitee: string | null;
  message: string | null;
  statut: ReservationStatus;
  created_at: string;
};

export type DocumentRow = {
  id: string;
  related_table: string;
  related_id: string;
  nom_fichier: string;
  url: string;
  type: DocumentType;
  created_at: string;
};

export type ActivityLog = {
  id: string;
  user_id: string | null;
  action: string;
  table_concernee: string | null;
  enregistrement_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

export type CompanySettings = {
  id: true;
  nom_entreprise: string | null;
  siret: string | null;
  tva_intracom: string | null;
  adresse: string | null;
  rib: string | null;
  cgv: string | null;
  preavis_jours_defaut: number;
  jour_prelevement_defaut: number;
  updated_at: string;
};

export type PricingGridRow = {
  id: string;
  taille_libelle: string;
  prix_mensuel: number;
};

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Partial<Profile> & { id: string }>;
      sites: Table<Site>;
      units: Table<Unit>;
      customers: Table<Customer>;
      contracts: Table<Contract>;
      invoices: Table<Invoice>;
      payments: Table<Payment>;
      reservation_requests: Table<ReservationRequest>;
      documents: Table<DocumentRow>;
      activity_log: Table<ActivityLog>;
      company_settings: Table<CompanySettings>;
      pricing_grid: Table<PricingGridRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
