-- ============================================================================
-- LG BOX — migration v1.3
-- Coordonnées géographiques (sites, customers) pour la statistique de
-- distance moyenne au centre sur la page Rapports.
-- A exécuter après supabase/migrations/003_v1_2.sql.
-- ============================================================================

alter table sites add column if not exists latitude numeric(9, 6);
alter table sites add column if not exists longitude numeric(9, 6);

alter table customers add column if not exists latitude numeric(9, 6);
alter table customers add column if not exists longitude numeric(9, 6);
