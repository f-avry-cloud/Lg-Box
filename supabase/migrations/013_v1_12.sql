-- ============================================================================
-- LG BOX — migration v1.12
-- Modèle d'email pour l'activation de l'espace client (identifiants de
-- première connexion, envoyés à la signature du contrat ou depuis la fiche
-- client) — voir lib/actions/portal-access.ts.
-- A exécuter après supabase/migrations/012_v1_11.sql.
-- ============================================================================

alter table email_templates drop constraint email_templates_key_check;
alter table email_templates add constraint email_templates_key_check
  check (key in (
    'j-3', 'j0', 'j+7', 'j+15', 'invoice_ready',
    'contract_signature_request', 'contract_signature_reminder',
    'documents_signed_confirmation',
    'code_porte_generale', 'code_acces_box',
    'portal_access'
  ));

insert into email_templates (key, subject, body) values
('portal_access', 'Bienvenue chez LG BOX — votre espace client', 'Bonjour {{prenom}},

Votre espace client est prêt. Vous pouvez y consulter vos factures et documents à tout moment.

Identifiants de connexion :
Email : {{email}}
Mot de passe temporaire : {{mot_de_passe}}

Connectez-vous ici : {{lien_connexion}}

Bien cordialement,
L''équipe LG BOX')
on conflict (key) do nothing;
