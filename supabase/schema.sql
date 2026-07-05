-- ============================================================================
-- LG BOX — schema complet (tables, index, RLS)
-- A executer une seule fois sur une base Supabase neuve (SQL Editor ou CLI).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type user_role as enum ('admin', 'employee', 'tenant');
create type unit_type as enum ('interieur', 'exterieur', 'climatise');
create type unit_status as enum ('libre', 'loue', 'reserve', 'hors_service');
create type customer_type as enum ('particulier', 'professionnel');
create type contract_status as enum ('brouillon', 'actif', 'en_preavis', 'resilie');
create type invoice_status as enum ('brouillon', 'emise', 'payee', 'en_retard', 'annulee');
create type payment_method as enum ('virement', 'carte', 'especes', 'cheque', 'prelevement');
create type payment_status as enum ('valide', 'en_attente', 'echoue');
create type reservation_status as enum ('nouvelle', 'contactee', 'convertie', 'refusee');
create type document_type as enum ('contrat', 'facture', 'piece_identite', 'autre');
create type unit_floor as enum ('sous_sol', 'rez_de_chaussee', 'premier_etage');
create type bank_transaction_status as enum ('non_rapproche', 'rapproche', 'ignore');

-- ----------------------------------------------------------------------------
-- profiles — étend auth.users avec un rôle applicatif
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'tenant',
  prenom text,
  nom text,
  email text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- sites
-- ----------------------------------------------------------------------------
create table sites (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  adresse text,
  ville text,
  code_postal text,
  telephone text,
  email_contact text,
  horaires text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- units (box)
-- ----------------------------------------------------------------------------
create table units (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites (id) on delete cascade,
  numero text not null,
  taille_libelle text not null, -- ex "5m²"
  taille_m2 numeric(6, 2),
  type unit_type not null default 'interieur',
  zone text, -- étage / zone
  prix_mensuel_standard numeric(10, 2) not null default 0,
  statut unit_status not null default 'libre',
  notes text,
  floor unit_floor not null default 'rez_de_chaussee',
  pos_x numeric(6, 2),
  pos_y numeric(6, 2),
  created_at timestamptz not null default now(),
  unique (site_id, numero)
);

create index idx_units_statut on units (statut);
create index idx_units_site on units (site_id);

-- ----------------------------------------------------------------------------
-- customers
-- ----------------------------------------------------------------------------
create table customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  prenom text not null,
  nom text not null,
  email text not null,
  telephone text,
  adresse text,
  ville text,
  code_postal text,
  type customer_type not null default 'particulier',
  siret text,
  piece_identite_url text,
  notes text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  created_at timestamptz not null default now()
);

create index idx_customers_email on customers (email);
create index idx_customers_nom on customers (nom);

-- ----------------------------------------------------------------------------
-- contracts
-- ----------------------------------------------------------------------------
create table contracts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete restrict,
  unit_id uuid not null references units (id) on delete restrict,
  date_debut date not null,
  date_fin date,
  statut contract_status not null default 'brouillon',
  prix_mensuel numeric(10, 2) not null,
  depot_garantie numeric(10, 2) not null default 0,
  jour_prelevement_mensuel smallint not null default 1 check (jour_prelevement_mensuel between 1 and 28),
  preavis_jours smallint not null default 30,
  date_signature date,
  date_demande_resiliation date,
  contrat_pdf_url text,
  motif_resiliation text,
  created_at timestamptz not null default now()
);

create index idx_contracts_customer on contracts (customer_id);
create index idx_contracts_unit on contracts (unit_id);
create index idx_contracts_statut on contracts (statut);

-- ----------------------------------------------------------------------------
-- invoices
-- ----------------------------------------------------------------------------
create table invoices (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts (id) on delete restrict,
  customer_id uuid not null references customers (id) on delete restrict,
  numero_facture text not null unique,
  periode_debut date not null,
  periode_fin date not null,
  montant_ht numeric(10, 2) not null,
  tva numeric(10, 2) not null default 0,
  montant_ttc numeric(10, 2) not null,
  statut invoice_status not null default 'brouillon',
  date_emission date not null default current_date,
  date_echeance date not null,
  facture_pdf_url text,
  created_at timestamptz not null default now()
);

create index idx_invoices_customer on invoices (customer_id);
create index idx_invoices_contract on invoices (contract_id);
create index idx_invoices_statut on invoices (statut);
create index idx_invoices_echeance on invoices (date_echeance);

-- ----------------------------------------------------------------------------
-- payments
-- ----------------------------------------------------------------------------
create table payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices (id) on delete restrict,
  customer_id uuid not null references customers (id) on delete restrict,
  montant numeric(10, 2) not null,
  methode payment_method not null,
  date_paiement date not null default current_date,
  reference text,
  statut payment_status not null default 'valide',
  created_at timestamptz not null default now()
);

create index idx_payments_invoice on payments (invoice_id);
create index idx_payments_customer on payments (customer_id);

-- ----------------------------------------------------------------------------
-- reservation_requests (portail public)
-- ----------------------------------------------------------------------------
create table reservation_requests (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  email text not null,
  telephone text,
  taille_souhaitee text,
  date_souhaitee date,
  message text,
  statut reservation_status not null default 'nouvelle',
  created_at timestamptz not null default now()
);

create index idx_reservation_requests_statut on reservation_requests (statut);

-- ----------------------------------------------------------------------------
-- documents (pièces jointes génériques)
-- ----------------------------------------------------------------------------
create table documents (
  id uuid primary key default gen_random_uuid(),
  related_table text not null,
  related_id uuid not null,
  nom_fichier text not null,
  url text not null,
  type document_type not null default 'autre',
  created_at timestamptz not null default now()
);

create index idx_documents_related on documents (related_table, related_id);

-- ----------------------------------------------------------------------------
-- activity_log (journal d'audit)
-- ----------------------------------------------------------------------------
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  table_concernee text,
  enregistrement_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index idx_activity_log_table on activity_log (table_concernee, enregistrement_id);

-- ----------------------------------------------------------------------------
-- company_settings (singleton) + pricing_grid
-- ----------------------------------------------------------------------------
create table company_settings (
  id boolean primary key default true constraint singleton check (id),
  nom_entreprise text,
  siret text,
  tva_intracom text,
  adresse text,
  rib text,
  cgv text,
  contrat_modele text,
  preavis_jours_defaut smallint not null default 30,
  jour_prelevement_defaut smallint not null default 1,
  updated_at timestamptz not null default now()
);

insert into company_settings (id) values (true);

create table pricing_grid (
  id uuid primary key default gen_random_uuid(),
  taille_libelle text not null unique,
  prix_mensuel numeric(10, 2) not null
);

-- ----------------------------------------------------------------------------
-- expenses (suivi des frais, pour un résultat net et pas seulement le CA)
-- ----------------------------------------------------------------------------
create table expenses (
  id uuid primary key default gen_random_uuid(),
  categorie text not null,
  montant numeric(10, 2) not null,
  date_depense date not null default current_date,
  fournisseur text,
  description text,
  justificatif_url text,
  created_at timestamptz not null default now()
);

create index idx_expenses_date on expenses (date_depense);

-- ----------------------------------------------------------------------------
-- bank_transactions (rapprochement bancaire par import CSV)
-- ----------------------------------------------------------------------------
create table bank_transactions (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null,
  date_operation date not null,
  libelle text not null,
  montant numeric(10, 2) not null,
  statut bank_transaction_status not null default 'non_rapproche',
  invoice_id uuid references invoices (id) on delete set null,
  expense_id uuid references expenses (id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_bank_transactions_statut on bank_transactions (statut);
create index idx_bank_transactions_batch on bank_transactions (import_batch_id);

-- ----------------------------------------------------------------------------
-- email_templates (relances + facture disponible, éditables dans Paramètres)
-- ----------------------------------------------------------------------------
create table email_templates (
  key text primary key check (key in ('j-3', 'j0', 'j+7', 'j+15', 'invoice_ready')),
  subject text not null,
  body text not null,
  updated_at timestamptz not null default now()
);

insert into email_templates (key, subject, body) values
('j-3', 'Rappel — votre facture {{numero_facture}} arrive à échéance', 'Bonjour {{prenom}},

Petit rappel amical : votre facture {{numero_facture}} d''un montant de {{montant}} arrive à échéance le {{date_echeance}}.

Vous pouvez la consulter et la régler depuis votre espace client : {{lien_portail}}

Bien cordialement,
L''équipe LG BOX'),
('j0', 'Votre facture {{numero_facture}} est due aujourd''hui', 'Bonjour {{prenom}},

Votre facture {{numero_facture}} d''un montant de {{montant}} est due aujourd''hui ({{date_echeance}}).

Vous pouvez la consulter et la régler depuis votre espace client : {{lien_portail}}

Bien cordialement,
L''équipe LG BOX'),
('j+7', '[Relance] Facture {{numero_facture}} impayée — 7 jours de retard', 'Bonjour {{prenom}},

Ceci est une relance : votre facture {{numero_facture}} d''un montant de {{montant}}, échue le {{date_echeance}}, est toujours impayée à ce jour.

Vous pouvez la consulter et la régler depuis votre espace client : {{lien_portail}}

Merci de régulariser votre situation rapidement. Sans nouvelle de votre part, nous serons contraints d''appliquer les pénalités de retard prévues au contrat.

Bien cordialement,
L''équipe LG BOX'),
('j+15', '[Relance] Mise en demeure — facture {{numero_facture}} impayée depuis 15 jours', 'Bonjour {{prenom}},

Ceci est une relance : malgré nos précédentes relances, votre facture {{numero_facture}} d''un montant de {{montant}}, échue le {{date_echeance}}, demeure impayée.

Vous pouvez la consulter et la régler depuis votre espace client : {{lien_portail}}

Nous vous demandons de régulariser cette situation sous 48h. À défaut, nous nous réservons le droit d''engager une procédure de recouvrement et de suspendre l''accès à votre box.

Bien cordialement,
L''équipe LG BOX'),
('invoice_ready', 'Votre facture {{numero_facture}} est disponible', 'Bonjour {{prenom}},

Votre facture {{numero_facture}} d''un montant de {{montant}} est disponible dans votre espace client, échéance le {{date_echeance}}.

Vous pouvez la consulter et la télécharger à tout moment depuis votre espace client : {{lien_portail}}

Bien cordialement,
L''équipe LG BOX');

-- ============================================================================
-- Fonctions utilitaires pour RLS
-- ============================================================================

create or replace function current_role_app()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false);
$$;

create or replace function is_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin', 'employee') from profiles where id = auth.uid()), false);
$$;

create or replace function current_customer_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select id from customers where user_id = auth.uid();
$$;

-- Réinitialisation des données locataires (clients, contrats, factures,
-- paiements) — réservée aux administrateurs, exposée via Paramètres avec
-- confirmation à plusieurs facteurs côté application.
create or replace function reset_tenant_data()
returns void
language plpgsql
as $$
begin
  if not is_admin() then
    raise exception 'Seul un administrateur peut réinitialiser les données locataires.';
  end if;

  delete from payments where true;
  delete from invoices where true;
  delete from documents where related_table in ('customers', 'contracts', 'invoices');
  delete from contracts where true;
  delete from customers where true;
  update units set statut = 'libre' where statut <> 'hors_service';

  insert into activity_log (user_id, action, table_concernee, detail)
  values (auth.uid(), 'reset_tenant_data', 'customers', jsonb_build_object('triggered_at', now()));
end;
$$;

revoke all on function reset_tenant_data() from public;
grant execute on function reset_tenant_data() to authenticated;

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table profiles enable row level security;
alter table sites enable row level security;
alter table units enable row level security;
alter table customers enable row level security;
alter table contracts enable row level security;
alter table invoices enable row level security;
alter table payments enable row level security;
alter table reservation_requests enable row level security;
alter table documents enable row level security;
alter table activity_log enable row level security;
alter table company_settings enable row level security;
alter table pricing_grid enable row level security;
alter table expenses enable row level security;
alter table bank_transactions enable row level security;
alter table email_templates enable row level security;

-- profiles : chacun voit son propre profil, admin voit tout
create policy "profiles_self_select" on profiles for select using (id = auth.uid() or is_admin());
create policy "profiles_self_update" on profiles for update using (id = auth.uid() or is_admin());
create policy "profiles_admin_insert" on profiles for insert with check (is_admin() or id = auth.uid());
create policy "profiles_admin_delete" on profiles for delete using (is_admin());

-- sites : lecture publique (page vitrine), écriture admin uniquement
create policy "sites_public_select" on sites for select using (true);
create policy "sites_admin_write" on sites for insert with check (is_admin());
create policy "sites_admin_update" on sites for update using (is_admin());
create policy "sites_admin_delete" on sites for delete using (is_admin());

-- units : lecture publique (dispo/prix vitrine), écriture staff, suppression admin
create policy "units_public_select" on units for select using (true);
create policy "units_staff_insert" on units for insert with check (is_staff());
create policy "units_staff_update" on units for update using (is_staff());
create policy "units_admin_delete" on units for delete using (is_admin());

-- customers : staff voit tout, client voit sa propre fiche
create policy "customers_staff_select" on customers for select using (is_staff() or user_id = auth.uid());
create policy "customers_staff_insert" on customers for insert with check (is_staff());
create policy "customers_staff_update" on customers for update using (is_staff() or user_id = auth.uid());
create policy "customers_admin_delete" on customers for delete using (is_admin());

-- contracts : staff voit tout, client voit ses contrats
create policy "contracts_staff_select" on contracts for select using (is_staff() or customer_id = current_customer_id());
create policy "contracts_staff_insert" on contracts for insert with check (is_staff());
create policy "contracts_staff_update" on contracts for update using (is_staff());
create policy "contracts_admin_delete" on contracts for delete using (is_admin());

-- invoices : staff voit tout, client voit ses factures
create policy "invoices_staff_select" on invoices for select using (is_staff() or customer_id = current_customer_id());
create policy "invoices_staff_insert" on invoices for insert with check (is_staff());
create policy "invoices_staff_update" on invoices for update using (is_staff());
create policy "invoices_admin_delete" on invoices for delete using (is_admin());

-- payments : staff voit/saisit tout (financier -> pas d'accès employé à la suppression), client voit ses paiements
create policy "payments_staff_select" on payments for select using (is_staff() or customer_id = current_customer_id());
create policy "payments_staff_insert" on payments for insert with check (is_staff());
create policy "payments_admin_update" on payments for update using (is_admin());
create policy "payments_admin_delete" on payments for delete using (is_admin());

-- reservation_requests : création publique (formulaire vitrine), lecture/traitement staff
create policy "reservation_requests_public_insert" on reservation_requests for insert with check (true);
create policy "reservation_requests_staff_select" on reservation_requests for select using (is_staff());
create policy "reservation_requests_staff_update" on reservation_requests for update using (is_staff());
create policy "reservation_requests_admin_delete" on reservation_requests for delete using (is_admin());

-- documents : staff voit tout, client voit les documents liés à ses contrats/factures/fiche client
create policy "documents_staff_select" on documents for select using (
  is_staff()
  or (related_table = 'customers' and related_id = current_customer_id())
  or (related_table = 'contracts' and related_id in (select id from contracts where customer_id = current_customer_id()))
  or (related_table = 'invoices' and related_id in (select id from invoices where customer_id = current_customer_id()))
);
create policy "documents_staff_insert" on documents for insert with check (is_staff());
create policy "documents_admin_delete" on documents for delete using (is_admin());

-- activity_log : admin uniquement
create policy "activity_log_admin_select" on activity_log for select using (is_admin());
create policy "activity_log_staff_insert" on activity_log for insert with check (is_staff());

-- company_settings / pricing_grid : lecture publique (prix vitrine), écriture admin
create policy "company_settings_public_select" on company_settings for select using (true);
create policy "company_settings_admin_update" on company_settings for update using (is_admin());
create policy "pricing_grid_public_select" on pricing_grid for select using (true);
create policy "pricing_grid_admin_write" on pricing_grid for all using (is_admin()) with check (is_admin());

-- expenses / bank_transactions : staff uniquement (données financières internes)
create policy "expenses_staff_select" on expenses for select using (is_staff());
create policy "expenses_staff_insert" on expenses for insert with check (is_staff());
create policy "expenses_staff_update" on expenses for update using (is_staff());
create policy "expenses_admin_delete" on expenses for delete using (is_admin());

create policy "bank_transactions_staff_select" on bank_transactions for select using (is_staff());
create policy "bank_transactions_staff_insert" on bank_transactions for insert with check (is_staff());
create policy "bank_transactions_staff_update" on bank_transactions for update using (is_staff());
create policy "bank_transactions_admin_delete" on bank_transactions for delete using (is_admin());

create policy "email_templates_staff_select" on email_templates for select using (is_staff());
create policy "email_templates_admin_update" on email_templates for update using (is_admin());

-- ============================================================================
-- Trigger : création automatique du profil à l'inscription (rôle tenant par défaut)
-- ============================================================================
create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, role)
  values (new.id, new.email, 'tenant')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
