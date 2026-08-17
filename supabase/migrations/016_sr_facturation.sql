-- 016 — Facturation groupée du mois, depuis l'application mobile.
--
-- Le carnet ne connaissait que deux états utiles : attendu (pas de ligne) et
-- encaissé. Il manque l'état intermédiaire du mois réel : « réclamé, pas
-- encore rentré ». C'est ce que pose le bouton « Passer le mois en facturé »
-- du tableau de bord.
--
-- « facturé » ne compte pas dans l'encaissé (voir encaisseLigne) : il laisse
-- le loyer entier dans le reste à encaisser et se distingue seulement de
-- « attendu » par le fait qu'on a demandé son dû au locataire.

alter table sr_reglements
  drop constraint if exists sr_reglements_statut_check;

alter table sr_reglements
  add constraint sr_reglements_statut_check
  check (statut in ('attendu', 'facture', 'paye', 'partiel', 'retard'));

-- Date de réclamation, posée par la facturation groupée. Distincte de
-- date_encaissement : entre les deux il y a le délai de paiement, et c'est
-- justement ce délai qu'on veut pouvoir regarder.
alter table sr_reglements
  add column if not exists date_facturation date;

-- ---------------------------------------------------------------------------
-- Paramétrage du mail de facture
-- ---------------------------------------------------------------------------

-- Table à ligne unique : il n'y a qu'un expéditeur, qu'un modèle de message.
-- La contrainte `check (id)` sur un booléen primaire interdit la deuxième
-- ligne au niveau de la base, plutôt que par convention.
create table if not exists sr_mail_parametres (
  id boolean primary key default true check (id),
  expediteur_nom text not null default 'LG BOX',
  expediteur_email text not null default '',
  repondre_a text,
  copie_email text,
  objet text not null default 'Loyer {mois} — LG BOX',
  corps text not null default
    E'Bonjour {nom},\n\nVeuillez trouver ci-dessous le montant de votre loyer pour {mois} :\n\nBox {box} — {loyer} €\n\nNous vous remercions de votre règlement.\n\nLG BOX',
  updated_at timestamptz not null default now()
);

insert into sr_mail_parametres (id) values (true) on conflict (id) do nothing;

alter table sr_mail_parametres enable row level security;

drop policy if exists sr_mail_parametres_staff_select on sr_mail_parametres;
create policy sr_mail_parametres_staff_select on sr_mail_parametres
  for select using (is_staff());

drop policy if exists sr_mail_parametres_staff_update on sr_mail_parametres;
create policy sr_mail_parametres_staff_update on sr_mail_parametres
  for update using (is_staff());

-- ---------------------------------------------------------------------------
-- Journal des envois
-- ---------------------------------------------------------------------------

-- Un mail parti ne se rattrape pas : on garde trace de chaque envoi, réussi
-- ou non, pour que l'écran sache dire « déjà envoyé le 3 » plutôt que de
-- laisser relancer 60 locataires par erreur.
create table if not exists sr_envois_facture (
  id uuid primary key default gen_random_uuid(),
  contrat_id uuid not null references sr_contrats(id) on delete cascade,
  periode text not null check (periode ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  destinataire text not null,
  statut text not null check (statut in ('envoye', 'echec')),
  erreur text,
  created_at timestamptz not null default now()
);

create index if not exists sr_envois_facture_periode_idx
  on sr_envois_facture (periode);

create index if not exists sr_envois_facture_contrat_idx
  on sr_envois_facture (contrat_id, periode);

alter table sr_envois_facture enable row level security;

drop policy if exists sr_envois_facture_staff_select on sr_envois_facture;
create policy sr_envois_facture_staff_select on sr_envois_facture
  for select using (is_staff());

drop policy if exists sr_envois_facture_staff_insert on sr_envois_facture;
create policy sr_envois_facture_staff_insert on sr_envois_facture
  for insert with check (is_staff());
