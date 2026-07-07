-- ============================================================================
-- LG BOX — migration v1.11
-- Statut actif/inactif client, code de porte générale du bâtiment
-- (désactivé par défaut), et modèles d'email pour l'envoi des codes d'accès.
-- A exécuter après supabase/migrations/011_v1_10.sql.
-- ============================================================================

alter table customers add column if not exists actif boolean not null default true;

alter table company_settings add column if not exists code_porte_generale_active boolean not null default false;
alter table company_settings add column if not exists code_porte_generale text;

alter table email_templates drop constraint email_templates_key_check;
alter table email_templates add constraint email_templates_key_check
  check (key in (
    'j-3', 'j0', 'j+7', 'j+15', 'invoice_ready',
    'contract_signature_request', 'contract_signature_reminder',
    'documents_signed_confirmation',
    'code_porte_generale', 'code_acces_box'
  ));

insert into email_templates (key, subject, body) values
('code_porte_generale', 'Code d''accès du bâtiment', 'Bonjour {{prenom}},

Voici le code d''accès de la porte principale du bâtiment : {{code_acces}}

Bien cordialement,
L''équipe LG BOX'),
('code_acces_box', 'Code d''accès de votre box {{box_numero}}', 'Bonjour {{prenom}},

Voici le code d''accès de votre box n° {{box_numero}} : {{code_acces}}

Bien cordialement,
L''équipe LG BOX')
on conflict (key) do nothing;
