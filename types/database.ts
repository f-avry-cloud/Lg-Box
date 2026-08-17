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
export type UnitFloor = "sous_sol" | "rez_de_chaussee" | "premier_etage";
export type BankTransactionStatus = "non_rapproche" | "rapproche" | "ignore";
export type SignatureStatus = "non_requise" | "en_attente" | "signe";
export type SepaMandateStatus = "non_requis" | "en_attente" | "signe";
export type SignedDocumentType = "contrat" | "mandat_sepa";
export type SepaMandateTemplateMode = "integre" | "upload";
export type SecurityDepositStatus =
  | "non_demande"
  | "demande"
  | "recu"
  | "partiellement_rembourse"
  | "rembourse"
  | "retenu";

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
  latitude: number | null;
  longitude: number | null;
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
  floor: UnitFloor;
  pos_x: number | null;
  pos_y: number | null;
  largeur_cm: number | null;
  profondeur_cm: number | null;
  rotation_deg: number;
  code_acces: string | null;
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
  latitude: number | null;
  longitude: number | null;
  actif: boolean;
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
  signature_status: SignatureStatus;
  sepa_mandate_status: SepaMandateStatus;
  iban: string | null;
  bic: string | null;
  rum: string | null;
  created_at: string;
};

export type SignatureRequest = {
  id: string;
  contract_id: string;
  customer_id: string;
  includes_contract: boolean;
  includes_sepa_mandate: boolean;
  signer_full_name: string | null;
  signed_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  signature_token: string;
  token_expires_at: string;
  token_used_at: string | null;
  created_at: string;
};

export type SignedDocument = {
  id: string;
  signature_request_id: string;
  document_type: SignedDocumentType;
  document_hash: string;
  signed_document_path: string;
  created_at: string;
};

export type SecurityDeposit = {
  id: string;
  contract_id: string;
  customer_id: string;
  amount_expected: number;
  amount_received: number | null;
  payment_method: PaymentMethod | null;
  received_at: string | null;
  status: SecurityDepositStatus;
  amount_refunded: number | null;
  refunded_at: string | null;
  refund_reason: string | null;
  created_at: string;
  updated_at: string;
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
  contrat_modele: string | null;
  preavis_jours_defaut: number;
  jour_prelevement_defaut: number;
  relance_signature_jours_defaut: number;
  ics: string | null;
  mandat_sepa_modele: string | null;
  mandat_sepa_template_mode: SepaMandateTemplateMode;
  mandat_sepa_upload_path: string | null;
  signature_image_path: string | null;
  tva_applicable: boolean;
  taux_tva: number;
  facture_mentions_legales: string | null;
  code_porte_generale_active: boolean;
  code_porte_generale: string | null;
  updated_at: string;
};

export type PricingGridRow = {
  id: string;
  taille_libelle: string;
  prix_mensuel: number;
};

export type Expense = {
  id: string;
  categorie: string;
  montant: number;
  date_depense: string;
  fournisseur: string | null;
  description: string | null;
  justificatif_url: string | null;
  created_at: string;
};

export type BankTransaction = {
  id: string;
  import_batch_id: string;
  date_operation: string;
  libelle: string;
  montant: number;
  statut: BankTransactionStatus;
  invoice_id: string | null;
  expense_id: string | null;
  created_at: string;
};

export type EmailTemplateKey =
  | "j-3"
  | "j0"
  | "j+7"
  | "j+15"
  | "invoice_ready"
  | "contract_signature_request"
  | "contract_signature_reminder"
  | "documents_signed_confirmation"
  | "code_porte_generale"
  | "code_acces_box"
  | "portal_access";

export type EmailTemplate = {
  key: EmailTemplateKey;
  subject: string;
  body: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// Application compagnon « Suivi des règlements » (tables sr_*).
// Les types métier vivent dans lib/suivi/types.ts ; on ne décrit ici que les
// lignes telles que Supabase les renvoie, colonnes de liaison comprises.
// ---------------------------------------------------------------------------

export type SrLocataire = {
  id: string;
  nom: string;
  societe: string | null;
  telephone: string | null;
  email: string | null;
  date_entree: string | null;
  actif: boolean;
  observations: string | null;
  observations_updated_at: string | null;
  customer_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SrBox = {
  id: string;
  numero: string;
  batiment: string;
  surface_m2: number | null;
  unit_id: string | null;
  created_at: string;
};

export type SrContrat = {
  id: string;
  locataire_id: string;
  box_id: string | null;
  loyer_mensuel_eur: number;
  periodicite: "mensuelle" | "trimestrielle";
  date_debut: string | null;
  date_fin: string | null;
  remarque: string | null;
  contract_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SrReglement = {
  id: string;
  contrat_id: string;
  periode: string;
  statut: "attendu" | "facture" | "paye" | "partiel" | "retard";
  montant_encaisse_eur: number;
  date_encaissement: string | null;
  date_facturation: string | null;
  moyen: "virement" | "cheque" | "especes" | "CB" | "autre" | null;
  note: string | null;
  updated_at: string;
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
      expenses: Table<Expense>;
      bank_transactions: Table<BankTransaction>;
      email_templates: Table<EmailTemplate, EmailTemplate, Partial<EmailTemplate>>;
      signature_requests: Table<SignatureRequest>;
      signed_documents: Table<SignedDocument>;
      security_deposits: Table<SecurityDeposit>;
      sr_locataires: Table<SrLocataire>;
      sr_box: Table<SrBox>;
      sr_contrats: Table<SrContrat>;
      sr_reglements: Table<SrReglement>;
    };
    Views: Record<string, never>;
    Functions: {
      reset_tenant_data: { Args: Record<string, never>; Returns: void };
      reset_units_data: { Args: Record<string, never>; Returns: void };
    };
  };
};
