-- ============================================================================
-- LG BOX — migration v1.13
-- Découple la surface commerciale (taille_m2) de la géométrie du plan
-- (largeur_cm / profondeur_cm).
--
-- Jusqu'ici, le trigger units_sync_taille_m2 recalculait taille_m2 à partir
-- des dimensions dessinées sur le plan interactif, à chaque écriture de
-- largeur_cm/profondeur_cm. Ça posait deux problèmes :
--   1. déplacer ou redimensionner un box sur le plan modifiait silencieusement
--      sa surface commerciale — donc potentiellement son prix ;
--   2. l'import des plans réels (relevés MagicPlan, dont l'éditeur indique
--      lui-même ne garantir aucune précision dimensionnelle) aurait écrasé
--      toutes les surfaces facturées par des valeurs mesurées au téléphone.
--
-- Le plan sert désormais uniquement au positionnement et à la numérotation
-- des box. La surface reste une donnée commerciale saisie à la main, éditable
-- depuis la liste des box et la fiche box (voir updateUnitSize dans
-- lib/actions/units.ts).
--
-- Les valeurs de taille_m2 déjà en base sont conservées telles quelles : elles
-- deviennent simplement modifiables sans être réécrites.
-- A exécuter après supabase/migrations/013_v1_12.sql.
-- ============================================================================

drop trigger if exists units_sync_taille_m2 on units;
drop function if exists units_sync_taille_m2();
