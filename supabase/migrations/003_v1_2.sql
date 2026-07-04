-- ============================================================================
-- LG BOX — migration v1.2
-- Modèles d'email éditables, lien facture <-> dépense pour le rapprochement
-- bancaire.
-- A exécuter après supabase/migrations/002_v1_1.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Modèles d'email éditables (relances + facture disponible)
-- ----------------------------------------------------------------------------
create table email_templates (
  key text primary key check (key in ('j-3', 'j0', 'j+7', 'j+15', 'invoice_ready')),
  subject text not null,
  body text not null,
  updated_at timestamptz not null default now()
);

alter table email_templates enable row level security;

create policy "email_templates_staff_select" on email_templates for select using (is_staff());
create policy "email_templates_admin_update" on email_templates for update using (is_admin());

insert into email_templates (key, subject, body) values
('j-3', 'Rappel — votre facture {{numero_facture}} arrive à échéance', 'Bonjour {{prenom}},

Petit rappel amical : votre facture {{numero_facture}} d''un montant de {{montant}} arrive à échéance le {{date_echeance}}.

Vous pouvez la consulter et la régler depuis votre espace client : {{lien_portail}}

Bien cordialement,
L''équipe LG BOX'),
('j0', 'Votre facture {{numero_facture}} est due aujourd''hui', 'Bonjour {{prenom}},

Votre facture {{numero_facture}} d''un montant de {{montant}} est due aujourd''hui ({{date_echeance}}).

Vous pouvez la consulter et la régler depuis votre espace client : {{lien_portail}}

Bien cordialement,
L''équipe LG BOX'),
('j+7', '[Relance] Facture {{numero_facture}} impayée — 7 jours de retard', 'Bonjour {{prenom}},

Ceci est une relance : votre facture {{numero_facture}} d''un montant de {{montant}}, échue le {{date_echeance}}, est toujours impayée à ce jour.

Vous pouvez la consulter et la régler depuis votre espace client : {{lien_portail}}

Merci de régulariser votre situation rapidement. Sans nouvelle de votre part, nous serons contraints d''appliquer les pénalités de retard prévues au contrat.

Bien cordialement,
L''équipe LG BOX'),
('j+15', '[Relance] Mise en demeure — facture {{numero_facture}} impayée depuis 15 jours', 'Bonjour {{prenom}},

Ceci est une relance : malgré nos précédentes relances, votre facture {{numero_facture}} d''un montant de {{montant}}, échue le {{date_echeance}}, demeure impayée.

Vous pouvez la consulter et la régler depuis votre espace client : {{lien_portail}}

Nous vous demandons de régulariser cette situation sous 48h. À défaut, nous nous réservons le droit d''engager une procédure de recouvrement et de suspendre l''accès à votre box.

Bien cordialement,
L''équipe LG BOX'),
('invoice_ready', 'Votre facture {{numero_facture}} est disponible', 'Bonjour {{prenom}},

Votre facture {{numero_facture}} d''un montant de {{montant}} est disponible dans votre espace client, échéance le {{date_echeance}}.

Vous pouvez la consulter et la télécharger à tout moment depuis votre espace client : {{lien_portail}}

Bien cordialement,
L''équipe LG BOX');

-- ----------------------------------------------------------------------------
-- Rapprochement bancaire <-> dépenses
-- ----------------------------------------------------------------------------
alter table bank_transactions
  add column expense_id uuid references expenses (id) on delete set null;
