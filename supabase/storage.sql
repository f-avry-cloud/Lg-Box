-- ============================================================================
-- LG BOX — buckets Supabase Storage + policies
-- A exécuter après schema.sql.
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('documents', 'documents', false),
  ('contracts', 'contracts', false),
  ('invoices', 'invoices', false)
on conflict (id) do nothing;

-- Staff (admin/employee) : accès total en lecture/écriture sur les 3 buckets.
create policy "storage_staff_all_documents" on storage.objects for all
  using (bucket_id = 'documents' and is_staff())
  with check (bucket_id = 'documents' and is_staff());

create policy "storage_staff_all_contracts" on storage.objects for all
  using (bucket_id = 'contracts' and is_staff())
  with check (bucket_id = 'contracts' and is_staff());

create policy "storage_staff_all_invoices" on storage.objects for all
  using (bucket_id = 'invoices' and is_staff())
  with check (bucket_id = 'invoices' and is_staff());

-- Client : lecture seule de ses propres fichiers.
-- Convention de chemin : <customer_id>/<nom_fichier> pour chaque bucket.
create policy "storage_tenant_read_contracts" on storage.objects for select
  using (bucket_id = 'contracts' and (storage.foldername(name))[1] = current_customer_id()::text);

create policy "storage_tenant_read_invoices" on storage.objects for select
  using (bucket_id = 'invoices' and (storage.foldername(name))[1] = current_customer_id()::text);

create policy "storage_tenant_read_own_documents" on storage.objects for select
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = current_customer_id()::text);
