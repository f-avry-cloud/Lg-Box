-- ============================================================================
-- LG BOX — migration v1.6
-- Réinitialisation de l'inventaire des box (données de démo ne
-- correspondant pas à la réalité du site), sur le même principe que
-- reset_tenant_data() : réservée aux administrateurs, exposée en
-- Paramètres avec confirmation à plusieurs facteurs côté application.
-- Refuse d'agir tant que des contrats existent encore (il faut d'abord
-- réinitialiser les données locataires) pour ne jamais heurter la
-- contrainte "on delete restrict" de contracts.unit_id avec une erreur
-- Postgres brute.
-- A exécuter après supabase/migrations/006_v1_5.sql.
-- ============================================================================

create or replace function reset_units_data()
returns void
language plpgsql
as $$
begin
  if not is_admin() then
    raise exception 'Seul un administrateur peut réinitialiser les box.';
  end if;

  if exists (select 1 from contracts) then
    raise exception 'Des contrats existent encore sur ces box — réinitialisez d''abord les données locataires.';
  end if;

  delete from units where true;

  insert into activity_log (user_id, action, table_concernee, detail)
  values (auth.uid(), 'reset_units_data', 'units', jsonb_build_object('triggered_at', now()));
end;
$$;

revoke all on function reset_units_data() from public;
grant execute on function reset_units_data() to authenticated;
