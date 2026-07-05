-- ============================================================================
-- LG BOX — migration v1.4
-- Fonction de réinitialisation des données locataires (clients, contrats,
-- factures, paiements) pour repartir sur une base propre après les tests.
-- Réservée aux administrateurs (vérifié en base, en plus de la vérification
-- côté application). A exécuter après supabase/migrations/004_v1_3.sql.
-- ============================================================================

create or replace function reset_tenant_data()
returns void
language plpgsql
as $$
begin
  if not is_admin() then
    raise exception 'Seul un administrateur peut réinitialiser les données locataires.';
  end if;

  delete from payments;
  delete from invoices;
  delete from documents where related_table in ('customers', 'contracts', 'invoices');
  delete from contracts;
  delete from customers;
  update units set statut = 'libre' where statut <> 'hors_service';

  insert into activity_log (user_id, action, table_concernee, detail)
  values (auth.uid(), 'reset_tenant_data', 'customers', jsonb_build_object('triggered_at', now()));
end;
$$;

revoke all on function reset_tenant_data() from public;
grant execute on function reset_tenant_data() to authenticated;
