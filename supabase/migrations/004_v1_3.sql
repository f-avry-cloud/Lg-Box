-- ============================================================================
-- LG BOX — migration v1.3
-- Coordonnées géographiques (site + clients) pour la statistique de distance
-- moyenne des locataires par rapport au centre.
-- A exécuter après supabase/migrations/003_v1_2.sql.
-- ============================================================================

alter table sites
  add column latitude numeric(9, 6),
  add column longitude numeric(9, 6);

alter table customers
  add column latitude numeric(9, 6),
  add column longitude numeric(9, 6);
