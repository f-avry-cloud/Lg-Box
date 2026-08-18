-- 018 — Campagne de reprise du centre. **Temporaire.**
--
-- Prévenir chaque locataire, un par un, du changement de propriétaire. Ce
-- n'est pas une fonction du carnet : c'est un chantier daté, qui aura une fin.
--
-- D'où une table à part plutôt que des colonnes sur `sr_locataires` : le jour
-- où la campagne est terminée, un `drop table` et la suppression de l'onglet
-- suffisent, sans rien laisser derrière ni toucher aux données d'exploitation.
--
-- La note de campagne est distincte de `sr_locataires.observations` pour la
-- même raison : « pas de réponse, rappeler samedi » n'a pas à rester dans les
-- observations du locataire une fois la reprise faite.

create table if not exists sr_reprise_contacts (
  locataire_id uuid primary key references sr_locataires(id) on delete cascade,

  -- Les deux états sont indépendants, et c'est voulu : on laisse un message,
  -- puis on finit par avoir la personne. Un seul champ « statut » forcerait à
  -- effacer le premier fait pour enregistrer le second.
  contacte boolean not null default false,
  contacte_le timestamptz,
  message_laisse boolean not null default false,
  message_laisse_le timestamptz,

  note text,
  updated_at timestamptz not null default now()
);

alter table sr_reprise_contacts enable row level security;

drop policy if exists sr_reprise_contacts_staff_select on sr_reprise_contacts;
create policy sr_reprise_contacts_staff_select on sr_reprise_contacts
  for select using (is_staff());

drop policy if exists sr_reprise_contacts_staff_insert on sr_reprise_contacts;
create policy sr_reprise_contacts_staff_insert on sr_reprise_contacts
  for insert with check (is_staff());

drop policy if exists sr_reprise_contacts_staff_update on sr_reprise_contacts;
create policy sr_reprise_contacts_staff_update on sr_reprise_contacts
  for update using (is_staff());

drop policy if exists sr_reprise_contacts_admin_delete on sr_reprise_contacts;
create policy sr_reprise_contacts_admin_delete on sr_reprise_contacts
  for delete using (is_admin());

comment on table sr_reprise_contacts is
  'Temporaire — campagne d''information des locataires (changement de propriétaire). Supprimable avec l''onglet /suivi/reprise une fois la campagne terminée.';
