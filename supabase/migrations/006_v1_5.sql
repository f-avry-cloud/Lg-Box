-- ============================================================================
-- LG BOX — migration v1.5
-- Corrige reset_tenant_data() : Supabase bloque les DELETE/UPDATE sans
-- clause WHERE pour le rôle authenticated (extension plan_filter), y
-- compris à l'intérieur d'une fonction — ce qui faisait échouer la
-- réinitialisation avec « DELETE requires a WHERE clause ». Les clauses
-- « where true » ci-dessous ne changent pas le comportement (tout est
-- toujours supprimé) mais satisfont ce garde-fou.
-- A exécuter après supabase/migrations/005_v1_4.sql.
-- ============================================================================

create or replace function reset_tenant_data()
returns void
language plpgsql
as $$
begin
  if not is_admin() then
    raise exception 'Seul un administrateur peut réinitialiser les données locataires.';
  end if;

  delete from payments where true;
  delete from invoices where true;
  delete from documents where related_table in ('customers', 'contracts', 'invoices');
  delete from contracts where true;
  delete from customers where true;
  update units set statut = 'libre' where statut <> 'hors_service';

  insert into activity_log (user_id, action, table_concernee, detail)
  values (auth.uid(), 'reset_tenant_data', 'customers', jsonb_build_object('triggered_at', now()));
end;
$$;
