-- ============================================================================
-- LG BOX — jeu de données de démonstration
-- A exécuter après schema.sql. Génère 1 site, 70 box, ~10 clients,
-- quelques contrats + factures + paiements + demandes de réservation.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Site
-- ----------------------------------------------------------------------------
insert into sites (id, nom, adresse, ville, code_postal, telephone, email_contact, horaires)
values (
  '00000000-0000-0000-0000-000000000001',
  'LG BOX — Site principal',
  '12 rue des Entrepôts',
  'Villeneuve-la-Garenne',
  '92390',
  '01 23 45 67 89',
  'contact@lgbox.fr',
  'Lun-Sam 8h-20h, accès badge 6h-22h'
);

-- ----------------------------------------------------------------------------
-- Barème de prix
-- ----------------------------------------------------------------------------
insert into pricing_grid (taille_libelle, prix_mensuel) values
  ('2m²', 39),
  ('5m²', 69),
  ('10m²', 119),
  ('15m²', 159),
  ('20m²', 199);

-- ----------------------------------------------------------------------------
-- 70 box répartis sur 3 zones, tailles et types variés
-- ----------------------------------------------------------------------------
insert into units (site_id, numero, taille_libelle, taille_m2, type, zone, prix_mensuel_standard, statut)
select
  '00000000-0000-0000-0000-000000000001',
  chr(65 + ((n - 1) / 24)) || lpad(((n - 1) % 24 + 1)::text, 2, '0'), -- A01..A24, B01..B24, C01..C22
  taille.libelle,
  taille.m2,
  (array['interieur', 'interieur', 'exterieur', 'climatise'])[1 + (n % 4)]::unit_type,
  (array['Rez-de-chaussée', 'Étage 1', 'Étage 2', 'Extérieur'])[1 + (n % 4)],
  taille.prix,
  'libre'
from generate_series(1, 70) as n
cross join lateral (
  select
    (array['2m²', '5m²', '10m²', '15m²', '20m²'])[1 + (n % 5)] as libelle,
    (array[2, 5, 10, 15, 20])[1 + (n % 5)] as m2,
    (array[39, 69, 119, 159, 199])[1 + (n % 5)] as prix
) as taille;

-- ----------------------------------------------------------------------------
-- 10 clients de démonstration
-- ----------------------------------------------------------------------------
insert into customers (id, prenom, nom, email, telephone, adresse, ville, code_postal, type, siret, notes) values
  ('10000000-0000-0000-0000-000000000001', 'Marie', 'Dubois', 'marie.dubois@example.com', '0601020304', '3 rue des Lilas', 'Paris', '75011', 'particulier', null, null),
  ('10000000-0000-0000-0000-000000000002', 'Jean', 'Martin', 'jean.martin@example.com', '0602030405', '8 avenue Foch', 'Colombes', '92700', 'particulier', null, null),
  ('10000000-0000-0000-0000-000000000003', 'Sophie', 'Bernard', 'sophie.bernard@example.com', '0603040506', '15 rue Victor Hugo', 'Nanterre', '92000', 'particulier', null, 'Client fidèle depuis 2022'),
  ('10000000-0000-0000-0000-000000000004', 'Pierre', 'Petit', 'pierre.petit@example.com', '0604050607', '2 place de la Mairie', 'Asnières-sur-Seine', '92600', 'particulier', null, null),
  ('10000000-0000-0000-0000-000000000005', 'Isabelle', 'Robert', 'isabelle.robert@example.com', '0605060708', '10 rue de la Paix', 'Gennevilliers', '92230', 'particulier', null, null),
  ('10000000-0000-0000-0000-000000000006', 'Nicolas', 'Richard', 'contact@richard-transport.fr', '0606070809', '22 zone industrielle', 'Villeneuve-la-Garenne', '92390', 'professionnel', '12345678900012', 'Stockage matériel professionnel'),
  ('10000000-0000-0000-0000-000000000007', 'Camille', 'Durand', 'camille.durand@example.com', '0607080910', '5 rue du Commerce', 'Courbevoie', '92400', 'particulier', null, null),
  ('10000000-0000-0000-0000-000000000008', 'Julien', 'Leroy', 'julien.leroy@example.com', '0608091011', '18 boulevard National', 'Clichy', '92110', 'particulier', null, null),
  ('10000000-0000-0000-0000-000000000009', 'Laura', 'Moreau', 'laura.moreau@example.com', '0609101112', '7 rue des Acacias', 'Levallois-Perret', '92300', 'particulier', null, null),
  ('10000000-0000-0000-0000-000000000010', 'Thomas', 'Simon', 'thomas.simon@example.com', '0610111213', '30 rue de Paris', 'Saint-Ouen', '93400', 'particulier', null, null);

-- ----------------------------------------------------------------------------
-- Contrats : on loue les 8 premiers box à nos 10 clients (certains multi-box)
-- ----------------------------------------------------------------------------
insert into contracts (id, customer_id, unit_id, date_debut, date_fin, statut, prix_mensuel, depot_garantie, jour_prelevement_mensuel, preavis_jours, date_signature)
select
  ('20000000-0000-0000-0000-00000000000' || n)::uuid,
  cust.id,
  u.id,
  (current_date - ((11 - n) * interval '1 month'))::date,
  null,
  'actif',
  u.prix_mensuel_standard,
  u.prix_mensuel_standard,
  5,
  30,
  (current_date - ((11 - n) * interval '1 month'))::date
from generate_series(1, 8) as n
join customers cust on cust.id = (
  select id from customers order by id offset (n - 1) limit 1
)
join units u on u.numero = 'A' || lpad(n::text, 2, '0') and u.site_id = '00000000-0000-0000-0000-000000000001';

-- un contrat en préavis (le client a donné congé)
insert into contracts (id, customer_id, unit_id, date_debut, date_fin, statut, prix_mensuel, depot_garantie, jour_prelevement_mensuel, preavis_jours, date_signature, date_demande_resiliation, motif_resiliation)
select
  '20000000-0000-0000-0000-000000000009',
  (select id from customers order by id offset 8 limit 1),
  u.id,
  (current_date - interval '6 month')::date,
  (current_date + interval '10 day')::date,
  'en_preavis',
  u.prix_mensuel_standard,
  u.prix_mensuel_standard,
  5,
  30,
  (current_date - interval '6 month')::date,
  (current_date - interval '20 day')::date,
  'Déménagement'
from units u where u.numero = 'A09' and u.site_id = '00000000-0000-0000-0000-000000000001';

-- synchronise le statut des box loués/réservés selon les contrats actifs
update units set statut = 'loue'
where id in (select unit_id from contracts where statut in ('actif', 'en_preavis'));

update units set statut = 'hors_service'
where numero in ('C10', 'C11') and site_id = '00000000-0000-0000-0000-000000000001';

-- ----------------------------------------------------------------------------
-- Factures : 3 derniers mois pour chaque contrat actif, quelques impayées
-- ----------------------------------------------------------------------------
insert into invoices (contract_id, customer_id, numero_facture, periode_debut, periode_fin, montant_ht, tva, montant_ttc, statut, date_emission, date_echeance)
select
  c.id,
  c.customer_id,
  'FA-' || to_char(mois, 'YYYY-MM') || '-' || lpad(row_number() over (partition by mois order by c.id)::text, 3, '0'),
  date_trunc('month', mois)::date,
  (date_trunc('month', mois) + interval '1 month - 1 day')::date,
  round(c.prix_mensuel / 1.20, 2),
  round(c.prix_mensuel - round(c.prix_mensuel / 1.20, 2), 2),
  c.prix_mensuel,
  case
    when mois = date_trunc('month', current_date) then 'emise'
    when mois < date_trunc('month', current_date) - interval '1 month' then 'en_retard'
    else 'payee'
  end,
  (date_trunc('month', mois) + interval '4 day')::date,
  (date_trunc('month', mois) + interval '19 day')::date
from contracts c
cross join generate_series(
  date_trunc('month', current_date) - interval '2 month',
  date_trunc('month', current_date),
  interval '1 month'
) as mois
where c.statut in ('actif', 'en_preavis');

-- paiements pour les factures marquées "payee"
insert into payments (invoice_id, customer_id, montant, methode, date_paiement, reference, statut)
select i.id, i.customer_id, i.montant_ttc, 'virement', (i.date_echeance - interval '2 day')::date, 'VIR-' || i.numero_facture, 'valide'
from invoices i
where i.statut = 'payee';

-- ----------------------------------------------------------------------------
-- Demandes de réservation en attente (portail public)
-- ----------------------------------------------------------------------------
insert into reservation_requests (nom, email, telephone, taille_souhaitee, date_souhaitee, message, statut) values
  ('Amandine Fontaine', 'amandine.fontaine@example.com', '0611121314', '10m²', current_date + interval '15 day', 'Besoin de stocker des meubles suite à un déménagement.', 'nouvelle'),
  ('Karim Benali', 'karim.benali@example.com', '0612131415', '5m²', current_date + interval '7 day', 'Recherche un box pour du matériel professionnel.', 'nouvelle'),
  ('Chloé Girard', 'chloe.girard@example.com', '0613141516', '20m²', current_date + interval '30 day', null, 'contactee');
