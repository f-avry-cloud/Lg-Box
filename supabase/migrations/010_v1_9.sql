-- ============================================================================
-- LG BOX — migration v1.9
-- Signature du Loueur pré-apposée (image), et confirmation par email après
-- signature — renforce l'opposabilité de la signature électronique simple.
-- A exécuter après supabase/migrations/009_v1_8.sql.
-- ============================================================================

alter table company_settings add column if not exists signature_image_path text;

alter table email_templates drop constraint email_templates_key_check;
alter table email_templates add constraint email_templates_key_check
  check (key in (
    'j-3', 'j0', 'j+7', 'j+15', 'invoice_ready',
    'contract_signature_request', 'contract_signature_reminder',
    'documents_signed_confirmation'
  ));

insert into email_templates (key, subject, body) values
('documents_signed_confirmation', 'Confirmation — vos documents ont été signés', 'Bonjour {{prenom}},

Nous vous confirmons la bonne réception de votre signature électronique.

Vous pouvez à tout moment retrouver vos documents signés et leur preuve de signature depuis votre espace client : {{lien_portail}}

Bien cordialement,
L''équipe LG BOX')
on conflict (key) do nothing;
