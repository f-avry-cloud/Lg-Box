-- ============================================================================
-- LG BOX — migration v1.1
-- Plan visuel (étages + position libre), suivi des frais, rapprochement
-- bancaire par CSV, modèle de contrat personnalisable.
-- A exécuter après schema.sql + storage.sql + seed.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Plan visuel : étage + position libre par box
-- ----------------------------------------------------------------------------
create type unit_floor as enum ('sous_sol', 'rez_de_chaussee', 'premier_etage');

alter table units
  add column floor unit_floor not null default 'rez_de_chaussee',
  add column pos_x numeric(6, 2),
  add column pos_y numeric(6, 2);

-- ----------------------------------------------------------------------------
-- Suivi des frais (pour un tableau de bord résultat, pas seulement le CA)
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

alter table expenses enable row level security;

create policy "expenses_staff_select" on expenses for select using (is_staff());
create policy "expenses_staff_insert" on expenses for insert with check (is_staff());
create policy "expenses_staff_update" on expenses for update using (is_staff());
create policy "expenses_admin_delete" on expenses for delete using (is_admin());

-- ----------------------------------------------------------------------------
-- Rapprochement bancaire (import CSV)
-- ----------------------------------------------------------------------------
create type bank_transaction_status as enum ('non_rapproche', 'rapproche', 'ignore');

create table bank_transactions (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null,
  date_operation date not null,
  libelle text not null,
  montant numeric(10, 2) not null,
  statut bank_transaction_status not null default 'non_rapproche',
  invoice_id uuid references invoices (id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_bank_transactions_statut on bank_transactions (statut);
create index idx_bank_transactions_batch on bank_transactions (import_batch_id);

alter table bank_transactions enable row level security;

create policy "bank_transactions_staff_select" on bank_transactions for select using (is_staff());
create policy "bank_transactions_staff_insert" on bank_transactions for insert with check (is_staff());
create policy "bank_transactions_staff_update" on bank_transactions for update using (is_staff());
create policy "bank_transactions_admin_delete" on bank_transactions for delete using (is_admin());

-- ----------------------------------------------------------------------------
-- Modèle de contrat personnalisable (texte avec variables {{...}})
-- ----------------------------------------------------------------------------
alter table company_settings
  add column contrat_modele text;
