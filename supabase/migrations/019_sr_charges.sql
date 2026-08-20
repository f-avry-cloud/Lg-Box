-- 019 — Charges du centre, et résultat mensuel.
--
-- Le carnet savait ce qui rentre. Il ne savait pas ce qui sort, donc il ne
-- pouvait rien dire du résultat — le seul chiffre qui intéresse vraiment un
-- exploitant.
--
-- Table propre à l'app plutôt que la table `expenses` du back-office, pour
-- deux raisons :
--
--  1. la règle du projet — l'app mobile n'écrit pas dans le back-office ;
--  2. `expenses` enregistre des dépenses **datées**, une ligne par sortie.
--     Or l'essentiel des charges d'un centre de stockage est **récurrent** :
--     loyer, assurance, électricité, abonnements. Les ressaisir chaque mois
--     serait le meilleur moyen qu'elles cessent d'être saisies.
--
-- D'où la notion de récurrence portée par la charge elle-même. Les deux tables
-- pourront être rapprochées plus tard si le besoin s'en fait sentir ; rien ici
-- ne l'empêche.

create table if not exists sr_charges (
  id uuid primary key default gen_random_uuid(),

  libelle text not null,
  montant_eur numeric(10, 2) not null check (montant_eur >= 0),
  categorie text not null default 'autre',

  -- Récurrente : due chaque mois de `periode_debut` à `periode_fin`.
  -- Ponctuelle : due le seul mois `periode_debut`.
  recurrente boolean not null default true,

  periode_debut text not null check (periode_debut ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  -- Null sur une charge récurrente = sans échéance connue, ce qui est le cas
  -- courant : on ne sait pas quand on cessera de payer son assurance.
  periode_fin text check (periode_fin ~ '^\d{4}-(0[1-9]|1[0-2])$'),

  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Une charge ponctuelle ne s'étale pas : sa fin est son début. La contrainte
-- évite une charge « ponctuelle » qui courrait sur six mois par accident de
-- saisie, et que rien n'aurait signalée.
alter table sr_charges
  drop constraint if exists sr_charges_ponctuelle_check;

alter table sr_charges
  add constraint sr_charges_ponctuelle_check
  check (recurrente or periode_fin is null or periode_fin = periode_debut);

-- Une fin antérieure au début ne décrit rien.
alter table sr_charges
  drop constraint if exists sr_charges_ordre_check;

alter table sr_charges
  add constraint sr_charges_ordre_check
  check (periode_fin is null or periode_fin >= periode_debut);

create index if not exists sr_charges_periode_idx on sr_charges (periode_debut, periode_fin);

alter table sr_charges enable row level security;

drop policy if exists sr_charges_staff_select on sr_charges;
create policy sr_charges_staff_select on sr_charges for select using (is_staff());

drop policy if exists sr_charges_staff_insert on sr_charges;
create policy sr_charges_staff_insert on sr_charges for insert with check (is_staff());

drop policy if exists sr_charges_staff_update on sr_charges;
create policy sr_charges_staff_update on sr_charges for update using (is_staff());

drop policy if exists sr_charges_staff_delete on sr_charges;
create policy sr_charges_staff_delete on sr_charges for delete using (is_staff());

comment on table sr_charges is
  'Charges du centre, récurrentes ou ponctuelles. Sert au résultat mensuel de /suivi.';
