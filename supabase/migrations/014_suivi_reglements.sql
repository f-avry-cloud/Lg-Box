-- 014 — Application compagnon « Suivi des règlements » (route /suivi).
--
-- L'app compagnon vit dans la même base que le back-office mais dans ses
-- propres tables, préfixées `sr_` (suivi des règlements). Deux raisons :
--
--  1. Elle ne doit rien casser dans le back-office : `customers`, `units`,
--     `contracts` restent la propriété exclusive de /admin. L'import du CSV
--     n'écrit jamais dedans.
--  2. Le référentiel du carnet d'encaissement n'est pas celui du back-office :
--     un règlement se pointe même quand le box n'est pas encore identifié,
--     alors que `contracts.unit_id` est obligatoire côté back-office.
--
-- La connexion des deux bases se fait par les colonnes de liaison nullables
-- `customer_id`, `unit_id` et `contract_id` : tant qu'elles sont nulles, les
-- deux mondes vivent côte à côte ; une fois renseignées, chaque ligne du
-- carnet pointe vers son équivalent back-office et la synchronisation devient
-- possible dans les deux sens. Voir docs/suivi-reglements.md.

create extension if not exists "pgcrypto";

-- Locataire du carnet d'encaissement.
create table if not exists sr_locataires (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  societe text,
  telephone text,
  email text,
  date_entree date,
  actif boolean not null default true,
  observations text,
  observations_updated_at timestamptz,
  -- Liaison back-office (nullable tant que le rapprochement n'est pas fait).
  customer_id uuid references customers (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sr_locataires_nom on sr_locataires (nom);
create unique index if not exists idx_sr_locataires_customer
  on sr_locataires (customer_id) where customer_id is not null;

-- Box du carnet. Un box n'existe ici que lorsqu'il est identifié : les
-- contrats dont le box reste à établir portent simplement box_id = null.
create table if not exists sr_box (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  batiment text not null,
  surface_m2 numeric(6, 2),
  -- Liaison back-office.
  unit_id uuid references units (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_sr_box_numero on sr_box (batiment, numero);
create unique index if not exists idx_sr_box_unit
  on sr_box (unit_id) where unit_id is not null;

-- Contrat = une ligne dans la liste du mois. Un locataire à deux box a deux
-- contrats, donc deux lignes, mais une seule fiche.
create table if not exists sr_contrats (
  id uuid primary key default gen_random_uuid(),
  locataire_id uuid not null references sr_locataires (id) on delete cascade,
  box_id uuid references sr_box (id) on delete set null,
  loyer_mensuel_eur integer not null check (loyer_mensuel_eur >= 0),
  date_debut date,
  date_fin date,
  -- Remarque reprise du CSV (ex. « second box à identifier »).
  remarque text,
  -- Liaison back-office.
  contract_id uuid references contracts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sr_contrats_locataire on sr_contrats (locataire_id);
create unique index if not exists idx_sr_contrats_contract
  on sr_contrats (contract_id) where contract_id is not null;

-- Règlement d'un contrat pour un mois donné.
-- Aucune ligne n'est créée à l'avance : l'absence de ligne vaut « attendu ».
create table if not exists sr_reglements (
  id uuid primary key default gen_random_uuid(),
  contrat_id uuid not null references sr_contrats (id) on delete cascade,
  periode text not null check (periode ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  statut text not null default 'paye' check (statut in ('attendu', 'paye', 'partiel', 'retard')),
  montant_encaisse_eur integer not null default 0 check (montant_encaisse_eur >= 0),
  date_encaissement date,
  moyen text check (moyen in ('virement', 'cheque', 'especes', 'CB', 'autre')),
  note text,
  updated_at timestamptz not null default now(),
  unique (contrat_id, periode)
);

create index if not exists idx_sr_reglements_periode on sr_reglements (periode);

-- RLS : réservé au personnel (admin/employee), comme le back-office. Aucun
-- locataire ne doit pouvoir lire le carnet d'encaissement.
alter table sr_locataires enable row level security;
alter table sr_box enable row level security;
alter table sr_contrats enable row level security;
alter table sr_reglements enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['sr_locataires', 'sr_box', 'sr_contrats', 'sr_reglements'] loop
    execute format('drop policy if exists %I on %I', t || '_staff_select', t);
    execute format('drop policy if exists %I on %I', t || '_staff_insert', t);
    execute format('drop policy if exists %I on %I', t || '_staff_update', t);
    execute format('drop policy if exists %I on %I', t || '_admin_delete', t);

    execute format('create policy %I on %I for select using (is_staff())', t || '_staff_select', t);
    execute format('create policy %I on %I for insert with check (is_staff())', t || '_staff_insert', t);
    execute format('create policy %I on %I for update using (is_staff())', t || '_staff_update', t);
    execute format('create policy %I on %I for delete using (is_admin())', t || '_admin_delete', t);
  end loop;
end $$;
