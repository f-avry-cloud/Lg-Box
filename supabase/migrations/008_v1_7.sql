-- ============================================================================
-- LG BOX — migration v1.7
-- Signature électronique simple des contrats (art. 1367 du Code civil) et
-- gestion du dépôt de garantie, rattachées à un contrat ET à un locataire.
-- A exécuter après supabase/migrations/007_v1_6.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Signature électronique
-- ----------------------------------------------------------------------------
alter table contracts add column if not exists signature_status text
  not null default 'non_requise'
  check (signature_status in ('non_requise', 'en_attente', 'signe'));

create table contract_signatures (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  signer_full_name text,
  signed_at timestamptz,
  ip_address text,
  user_agent text,
  document_hash text,
  signed_document_path text,
  signature_token text not null unique,
  token_expires_at timestamptz not null,
  token_used_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_contract_signatures_contract on contract_signatures (contract_id);
create index idx_contract_signatures_customer on contract_signatures (customer_id);

alter table contract_signatures enable row level security;

-- Lecture réservée au staff et au locataire propriétaire du contrat. Aucune
-- policy d'écriture n'est exposée à authenticated/anon : la création (envoi
-- pour signature) et la mise à jour (signature via le lien à token) passent
-- exclusivement par le service role, en dehors du contexte RLS utilisateur —
-- voir lib/actions/contract-signature.ts.
create policy "contract_signatures_staff_select" on contract_signatures for select using (
  is_staff() or customer_id = current_customer_id()
);

-- ----------------------------------------------------------------------------
-- Dépôt de garantie
-- ----------------------------------------------------------------------------
create table security_deposits (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  amount_expected numeric(10, 2) not null default 0,
  amount_received numeric(10, 2),
  payment_method payment_method,
  received_at date,
  status text not null default 'non_demande'
    check (status in ('non_demande', 'demande', 'recu', 'partiellement_rembourse', 'rembourse', 'retenu')),
  amount_refunded numeric(10, 2),
  refunded_at date,
  refund_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_security_deposits_contract on security_deposits (contract_id);
create index idx_security_deposits_customer on security_deposits (customer_id);

alter table security_deposits enable row level security;

create policy "security_deposits_staff_select" on security_deposits for select using (
  is_staff() or customer_id = current_customer_id()
);
create policy "security_deposits_staff_insert" on security_deposits for insert with check (is_staff());
create policy "security_deposits_staff_update" on security_deposits for update using (is_staff());
create policy "security_deposits_admin_delete" on security_deposits for delete using (is_admin());

-- ----------------------------------------------------------------------------
-- Modèles d'email : demande + relance de signature
-- ----------------------------------------------------------------------------
alter table email_templates drop constraint email_templates_key_check;
alter table email_templates add constraint email_templates_key_check
  check (key in ('j-3', 'j0', 'j+7', 'j+15', 'invoice_ready', 'contract_signature_request', 'contract_signature_reminder'));

insert into email_templates (key, subject, body) values
('contract_signature_request', 'Votre contrat LG BOX est prêt à être signé', 'Bonjour {{prenom}},

Votre contrat de location est prêt. Merci de le consulter et de le signer électroniquement via le lien suivant (valable 7 jours) :

{{lien_signature}}

Bien cordialement,
L''équipe LG BOX'),
('contract_signature_reminder', '[Rappel] Votre contrat LG BOX est toujours en attente de signature', 'Bonjour {{prenom}},

Nous n''avons pas encore reçu votre signature électronique pour votre contrat de location. Merci de le signer via le lien suivant :

{{lien_signature}}

Bien cordialement,
L''équipe LG BOX')
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- Paramètres : délai avant relance de signature
-- ----------------------------------------------------------------------------
alter table company_settings add column if not exists relance_signature_jours_defaut smallint not null default 7;
