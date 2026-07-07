-- ============================================================================
-- LG BOX — migration v1.10
-- Code d'accès par box (utilisable dans le modèle de contrat), et
-- paramétrage de la TVA + des mentions légales de facture.
-- A exécuter après supabase/migrations/010_v1_9.sql.
-- ============================================================================

alter table units add column if not exists code_acces text;

alter table company_settings add column if not exists tva_applicable boolean not null default false;
alter table company_settings add column if not exists taux_tva numeric(5, 2) not null default 20;
alter table company_settings add column if not exists facture_mentions_legales text;
