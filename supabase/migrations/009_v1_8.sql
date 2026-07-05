-- ============================================================================
-- LG BOX — migration v1.8
-- Généralise la signature électronique pour couvrir aussi le mandat de
-- prélèvement SEPA, signable avec le contrat ou séparément. Remplace
-- contract_signatures (0 ligne en production, migration 008_v1_7.sql non
-- encore fusionnée) par un modèle générique signature_requests/signed_documents.
-- A exécuter après supabase/migrations/008_v1_7.sql.
-- ============================================================================

drop table if exists contract_signatures;

alter table contracts add column if not exists sepa_mandate_status text
  not null default 'non_requis'
  check (sepa_mandate_status in ('non_requis', 'en_attente', 'signe'));
alter table contracts add column if not exists iban text;
alter table contracts add column if not exists bic text;
alter table contracts add column if not exists rum text unique;

-- ----------------------------------------------------------------------------
-- signature_requests : une demande peut couvrir le contrat, le mandat SEPA,
-- ou les deux — signés en un seul geste (un token, un consentement).
-- ----------------------------------------------------------------------------
create table signature_requests (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  includes_contract boolean not null default true,
  includes_sepa_mandate boolean not null default false,
  signer_full_name text,
  signed_at timestamptz,
  ip_address text,
  user_agent text,
  signature_token text not null unique,
  token_expires_at timestamptz not null,
  token_used_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_signature_requests_contract on signature_requests (contract_id);
create index idx_signature_requests_customer on signature_requests (customer_id);

-- ----------------------------------------------------------------------------
-- signed_documents : un document certifié (contrat ou mandat) par demande.
-- ----------------------------------------------------------------------------
create table signed_documents (
  id uuid primary key default gen_random_uuid(),
  signature_request_id uuid not null references signature_requests (id) on delete cascade,
  document_type text not null check (document_type in ('contrat', 'mandat_sepa')),
  document_hash text not null,
  signed_document_path text not null,
  created_at timestamptz not null default now()
);

create index idx_signed_documents_request on signed_documents (signature_request_id);

alter table signature_requests enable row level security;
alter table signed_documents enable row level security;

-- Comme pour l'ancienne contract_signatures : lecture staff + locataire
-- propriétaire, aucune écriture exposée à authenticated/anon (service role
-- uniquement, voir lib/actions/contract-signature.tsx).
create policy "signature_requests_staff_select" on signature_requests for select using (
  is_staff() or customer_id = current_customer_id()
);

create policy "signed_documents_staff_select" on signed_documents for select using (
  is_staff() or exists (
    select 1 from signature_requests sr
    where sr.id = signed_documents.signature_request_id
    and sr.customer_id = current_customer_id()
  )
);

-- ----------------------------------------------------------------------------
-- Paramètres du mandat SEPA : ICS (identifiant créancier, obligatoire pour
-- tout mandat), et choix entre modèle intégré (texte paramétrable, comme le
-- modèle de contrat) ou modèle importé (PDF de référence uploadé).
-- ----------------------------------------------------------------------------
alter table company_settings add column if not exists ics text;
alter table company_settings add column if not exists mandat_sepa_modele text;
alter table company_settings add column if not exists mandat_sepa_template_mode text
  not null default 'integre' check (mandat_sepa_template_mode in ('integre', 'upload'));
alter table company_settings add column if not exists mandat_sepa_upload_path text;
