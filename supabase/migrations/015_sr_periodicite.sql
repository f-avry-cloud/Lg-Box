-- 015 — Périodicité de règlement des contrats du carnet mobile.
--
-- Affichée et modifiable depuis la fiche box de l'application (/suivi/box).
--
-- Par défaut « mensuelle » : c'est le cas de tous les contrats importés, et le
-- carnet d'encaissement raisonne aujourd'hui mois par mois. Passer un contrat
-- en trimestriel ne change pour l'instant que l'affichage — le mois reste
-- l'unité de pointage. Rendre le carnet réellement trimestriel (ne réclamer le
-- loyer qu'un mois sur trois) modifierait les totaux mensuels : c'est une
-- décision d'exploitation, pas une conséquence à tirer en silence.

alter table sr_contrats
  add column if not exists periodicite text not null default 'mensuelle';

alter table sr_contrats
  drop constraint if exists sr_contrats_periodicite_check;

alter table sr_contrats
  add constraint sr_contrats_periodicite_check
  check (periodicite in ('mensuelle', 'trimestrielle'));
