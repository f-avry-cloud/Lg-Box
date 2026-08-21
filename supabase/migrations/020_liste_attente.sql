-- 020 — Liste d'attente, quand le centre est plein.

-- Le centre est à 100 % d'occupation. Les gens qui appellent ne peuvent pas
-- être servis tout de suite, mais ils ne sont pas refusés pour autant : ils
-- attendent qu'un box se libère. Les quatre statuts existants ne savaient pas
-- dire cela — « contactée » les faisait disparaître de la liste à traiter, et
-- ils étaient perdus le jour où un box se libérait.
--
-- Même liste, pas une seconde table : une demande venue du formulaire public
-- et un appel noté à la volée décrivent la même chose, et la personne qui
-- consulte la liste d'attente ne veut pas la consulter en deux endroits.

alter type reservation_status add value if not exists 'liste_attente';

-- Le formulaire public exige un e-mail ; le téléphone, non. Quelqu'un qui
-- appelle donne un numéro, pas toujours une adresse — et l'obliger reviendrait
-- à en faire inventer une, ce qui est pire qu'une case vide.
alter table reservation_requests alter column email drop not null;

-- D'où vient l'entrée. Le back-office annonce « les demandes reçues depuis la
-- page publique » : une inscription prise au téléphone n'en est pas une, et
-- rien ne permettait de les distinguer.
alter table reservation_requests
  add column if not exists origine text not null default 'formulaire';

alter table reservation_requests
  drop constraint if exists reservation_requests_origine_check;

alter table reservation_requests
  add constraint reservation_requests_origine_check
  check (origine in ('formulaire', 'manuelle'));

create index if not exists reservation_requests_statut_idx
  on reservation_requests (statut, created_at desc);

comment on column reservation_requests.origine is
  'formulaire = page publique ; manuelle = saisie depuis /suivi (liste d''attente).';

-- Le formulaire public insère sans être authentifié — c'est nécessaire — mais
-- il n'a pas à choisir son statut ni son origine. Sans cette borne, n'importe
-- qui pouvait poster une demande déjà « convertie », ou se présenter comme
-- notée au téléphone. `origine` ne voudrait alors rien dire.
drop policy if exists reservation_requests_public_insert on reservation_requests;
create policy reservation_requests_public_insert on reservation_requests
  for insert
  with check (statut = 'nouvelle' and origine = 'formulaire');

-- Le personnel, lui, inscrit en liste d'attente depuis /suivi.
drop policy if exists reservation_requests_staff_insert on reservation_requests;
create policy reservation_requests_staff_insert on reservation_requests
  for insert
  with check (is_staff());
