-- 017 — Tarif indicatif du box, et le loyer rendu à son box.
--
-- Le carnet portait le loyer sur le contrat, et un contrat sur un seul box :
-- l'architecture était bonne, mais une location à deux box importée sur une
-- seule ligne du CSV y entrait comme UN contrat au loyer global. La fiche du
-- box affichait alors le loyer des deux (CALONNE Eric : 270 € sur le box 11,
-- avec la mention « second box à identifier » dans le fichier d'origine).
--
-- Rien à changer au schéma pour le corriger — il suffit de créer le second
-- contrat et de répartir. Ce que la migration ajoute, c'est ce qui manquait
-- pour le faire sans deviner : un tarif de référence par box.

-- Tarif indicatif : ce que le box vaut, indépendamment de qui l'occupe.
--
-- Volontairement facultatif et non contraignant. Il pré-remplit un loyer à
-- l'affectation et donne un prix aux box libres ; le loyer réellement pratiqué
-- reste celui du contrat, qui peut y déroger sans justification. 26 des 67 box
-- n'ont même pas de surface connue — imposer un tarif serait inventer.
alter table sr_box
  add column if not exists tarif_indicatif_eur integer;

alter table sr_box
  drop constraint if exists sr_box_tarif_indicatif_check;

alter table sr_box
  add constraint sr_box_tarif_indicatif_check
  check (tarif_indicatif_eur is null or tarif_indicatif_eur > 0);

comment on column sr_box.tarif_indicatif_eur is
  'Tarif mensuel de référence, facultatif. Le loyer facturé reste celui du contrat.';
