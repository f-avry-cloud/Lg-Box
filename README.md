# LG BOX — Gestion de self-stockage

MVP de gestion interne (box, clients, contrats, factures, relances) et petit
portail client pour une entreprise de self-stockage d'environ 70 box sur un
site.

## Stack technique et justification des choix

| Choix | Pourquoi |
|---|---|
| **Next.js (App Router, TypeScript)** | Un seul repo full-stack (UI + API + jobs serveur), déploiement direct sur Vercel, écosystème mature. |
| **Supabase (PostgreSQL + Auth + Storage)** | Base relationnelle robuste, authentification prête à l'emploi (admin + client), stockage de fichiers privé (contrats/factures/pièces d'identité), offre gratuite généreuse pour démarrer. |
| **Tailwind CSS** | Style utilitaire rapide à écrire et à maintenir, sans surcouche CSS séparée. |
| **Composants UI façon shadcn/ui (écrits à la main)** | Le CLI `shadcn` télécharge son registre depuis `ui.shadcn.com`, inaccessible depuis cet environnement de développement sandboxé (pas de sortie réseau générale). Les composants (`components/ui/*`) suivent exactement les mêmes conventions (Radix UI + `class-variance-authority` + `cn()`) : ils peuvent être remplacés ou complétés avec le CLI officiel dès que vous travaillez dans un environnement avec accès internet complet. |
| **Vercel** | Hébergement Next.js natif, Cron Jobs intégrés (facturation mensuelle, relances) sans infrastructure supplémentaire. |
| **Resend** | Emails transactionnels simples (confirmations, relances) avec une offre gratuite suffisante pour ce volume. |
| **@react-pdf/renderer** | Génère les PDF de contrats et factures directement en React côté serveur, sans dépendance à un service externe. |
| **Vitest** | Tests unitaires rapides pour la logique métier sensible (préavis, numérotation, transitions de statut), sans configuration lourde. |

## Installation locale

### 1. Prérequis

- Node.js 20+
- Un projet [Supabase](https://supabase.com) (gratuit)
- Un compte [Resend](https://resend.com) (gratuit) — optionnel pour tester sans envoi d'email réel

### 2. Configuration Supabase

Dans le SQL Editor de votre projet Supabase, exécutez dans l'ordre :

```sql
-- 1. Tables, index, RLS, trigger de création de profil
supabase/schema.sql

-- 2. Buckets de stockage (contrats, factures, documents) + policies
supabase/storage.sql

-- 3. (Optionnel) Jeu de données de démonstration : 70 box, 10 clients,
--    contrats, factures, paiements, demandes de réservation
supabase/seed.sql
```

> Si votre projet Supabase a été initialisé **avant** l'ajout du plan visuel par
> étage, du suivi des frais et du rapprochement bancaire, `schema.sql` contient
> déjà tout pour une base neuve — mais sur une base existante, exécutez en plus
> `supabase/migrations/002_v1_1.sql` une seule fois pour rattraper ces tables.

Récupérez ensuite dans **Project Settings → API** :
- `Project URL`
- `anon public` key
- `service_role` key (⚠️ secrète, jamais exposée au navigateur)

### 3. Variables d'environnement

Copiez `.env.example` vers `.env.local` et complétez les valeurs :

```bash
cp .env.example .env.local
```

### 4. Installation et lancement

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

- Page publique : `/`
- Connexion back-office (admin/employé) : `/connexion`
- Connexion espace client : `/portail/connexion`

### 5. Créer votre premier compte admin

1. Dans Supabase → **Authentication → Users**, créez un utilisateur avec votre email et un mot de passe (ou laissez un client s'inscrire, un profil `tenant` sera créé automatiquement par le trigger `on_auth_user_created`).
2. Dans **Table Editor → profiles**, repérez la ligne créée automatiquement et passez son `role` à `admin`.
3. Connectez-vous sur `/connexion` avec cet email/mot de passe.

Pour donner à un client l'accès à son espace (`/portail`), créez son compte Supabase Auth puis renseignez `customers.user_id` avec l'`id` de cet utilisateur (colonne `id` de `auth.users`).

### 6. Lancer les tests

```bash
npm test
```

## Déploiement sur Vercel

1. Poussez le repo sur GitHub et importez-le dans [Vercel](https://vercel.com/new).
2. Renseignez les mêmes variables d'environnement que dans `.env.local` (Project Settings → Environment Variables), y compris `CRON_SECRET` (une valeur secrète de votre choix).
3. Le fichier `vercel.json` déclare deux Cron Jobs :
   - `/api/cron/generate-invoices` — le 1er de chaque mois, génère les factures des contrats actifs.
   - `/api/cron/send-reminders` — chaque jour, envoie les relances (J-3/J0/J+7/J+15) et bascule les factures échues en retard.

   Vercel ajoute automatiquement l'en-tête `Authorization: Bearer <CRON_SECRET>` à ces appels dès que la variable d'environnement `CRON_SECRET` est définie sur le projet — aucune configuration supplémentaire n'est nécessaire.
4. Déployez. Les Server Actions et Route Handlers tournent sur l'environnement Node de Vercel (nécessaire pour la génération de PDF).

Pour tester manuellement un cron en local ou en préproduction :

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://votre-site.vercel.app/api/cron/send-reminders
```

## Structure du projet

```
app/
  admin/          # Back-office (protégé, rôle admin/employee)
  portail/        # Espace client (protégé, rôle tenant)
  api/cron/       # Jobs planifiés (facturation, relances)
  api/export/     # Export CSV (staff uniquement)
  page.tsx        # Page publique + formulaire de réservation
components/
  ui/             # Primitives façon shadcn/ui
  admin/ units/ customers/ contracts/ invoices/ ...
lib/
  supabase/       # Clients Supabase (navigateur, serveur, service role)
  actions/        # Server Actions (mutations)
  business/       # Logique métier pure (préavis, numérotation, statuts...)
  pdf/            # Génération de PDF (contrats, factures)
  email/          # Templates et envoi Resend
supabase/
  schema.sql      # Schéma complet + RLS
  storage.sql     # Buckets + policies de stockage
  seed.sql        # Jeu de données de démonstration
docs/legacy-mockup/  # Ancienne maquette HTML statique, conservée pour référence de style
```

## RGPD — droit à l'effacement

Le MVP ne propose pas de suppression en libre-service. Procédure manuelle en cas de demande :

1. Dans **Supabase → Table Editor**, exporter si besoin les données du client concerné (`customers`, `contracts`, `invoices`, `payments`, `documents`) pour vos obligations comptables (conservation légale des factures : 10 ans en France, indépendamment de la demande de suppression).
2. Supprimer ou anonymiser la ligne `customers` correspondante (nom, email, téléphone, adresse) une fois les obligations légales de conservation expirées.
3. Supprimer les fichiers associés dans les buckets Supabase Storage (`documents`, `contracts`, `invoices`).
4. Supprimer le compte `auth.users` associé si le client avait un accès au portail.

## Points d'extension identifiés pour la V2

Volontairement non développés dans ce MVP — l'architecture laisse la place pour les ajouter sans réécriture :

- **Paiement en ligne** : `components/portal/payment-button.tsx` est un bouton désactivé prêt à être branché sur Stripe (Payment Links pour un paiement ponctuel, ou Stripe Billing pour un prélèvement récurrent automatique). Le webhook Stripe viendrait appeler la même logique que `markInvoicePaid()` dans `lib/actions/invoices.tsx`.
- **SMS** : les relances passent aujourd'hui uniquement par Resend (`lib/email/`) ; un canal SMS (Twilio, Brevo) pourrait être ajouté en parallèle dans `app/api/cron/send-reminders/route.ts`.
- **Signature électronique légale** : les contrats sont aujourd'hui générés en PDF et uploadés manuellement/automatiquement, sans signature électronique qualifiée. À intégrer via un prestataire (Yousign, DocuSign...) qui renverrait un webhook mettant à jour `contracts.contrat_pdf_url` et `date_signature`.
- **Contrôle d'accès physique** : pas d'intégration avec des gâches/badges/codes. Le statut du contrat (`actif`/`en_preavis`/`resilie`) est déjà la source de vérité qu'un système d'accès pourrait consommer via une future route API.
- **Application mobile native** : le back-office et le portail sont responsive (mobile-first pour le portail), mais une app native n'est pas prévue au MVP.
- **Multi-site avancé** : la table `sites` existe déjà et `units.site_id` y fait référence, mais l'UI ne gère qu'un site unique (pas de sélecteur de site, pas de permissions par site).
- **Facturation multi-devise / multi-langue** : montants et textes sont actuellement en euros et en français uniquement.
- **Demande de résiliation en self-service** (portail client) : le back-office permet déjà de donner congé et de calculer automatiquement la date de fin ; un formulaire client (`(Optionnel V1.1)` dans le brief) qui déclencherait la même Server Action `changeContractStatus` reste à ajouter si le flux téléphone/email actuel ne suffit plus.
- **Agrégation bancaire automatique** : le rapprochement (`/admin/bank`) fonctionne aujourd'hui par import CSV manuel (`lib/actions/bank.ts`, table `bank_transactions`). Pour brancher une vraie API d'agrégation (Bridge, Powens/Budget Insight, GoCardless Bank Account Data...), il suffit d'ajouter une route qui appelle `importBankStatement()` avec les lignes récupérées depuis l'API au lieu du CSV — toute la logique de suggestion de rapprochement (`lib/business/reconciliation.ts`) et de validation reste identique.

## Limites connues de cette itération

- Les composants `components/ui/*` ont été écrits à la main dans le style shadcn/ui plutôt que générés par le CLI officiel, faute d'accès réseau sortant vers `ui.shadcn.com` dans cet environnement de développement. Le résultat suit les mêmes conventions et reste compatible avec le CLI si vous voulez ajouter d'autres composants plus tard (`npx shadcn@latest add ...`).
- Le rendu de l'application n'a pu être vérifié qu'hors connexion à une vraie base Supabase (pas d'accès réseau sortant vers supabase.com depuis cet environnement) : le build de production et les tests unitaires passent, les pages qui ne dépendent pas de la base (page publique sans site configuré, pages de connexion) ont été vérifiées manuellement, mais le parcours complet bout-en-bout (création de compte, remplissage des données, navigation dans le back-office et le portail avec de vraies données) reste à valider par vous une fois votre projet Supabase connecté.
