# Application « Suivi des règlements »

Application compagnon de LG BOX, accessible sur `/suivi`. Un seul geste :
**pointer les loyers encaissés, mois par mois, depuis un téléphone**. Elle vient
en parallèle du back-office, pas à sa place — pas de facturation, pas de gestion
de contrats, pas de plan des box.

## Démarrer en trente secondes (mode démo)

```bash
npm install
SUIVI_DEMO=1 npm run dev
# puis http://localhost:3000/suivi
```

En mode démo, l'app tourne **sans Supabase** : les locataires, box et contrats
viennent du CSV, les règlements pointés vivent en mémoire dans le processus du
serveur. Ils survivent à la navigation entre les mois, pas à un redémarrage.
Un bandeau orange le rappelle en permanence.

Le mode démo s'active de deux façons :

- `SUIVI_DEMO=1` — forcé, même si Supabase est configuré ;
- automatiquement, si `NEXT_PUBLIC_SUPABASE_URL` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  sont absents.

### Quelles données en mode démo ?

| Fichier | Versionné | Contenu |
|---|---|---|
| `data/locataires_seed.csv` | **non** (`.gitignore`) | Le vrai export : noms, téléphones, e-mails réels. |
| `data/locataires_demo.csv` | oui | Même structure, noms pseudonymisés, coordonnées de test. |
| `lib/suivi/demo-data.ts` | oui | Le CSV de démo embarqué dans le bundle (généré). |

Le dépôt GitHub est **public** : le fichier réel n'y est pas versionné. Déposez-le
en local dans `data/locataires_seed.csv` — le mode démo l'utilise en priorité s'il
le trouve, sinon il se rabat sur le jeu pseudonymisé. Les deux produisent
exactement les mêmes totaux (63 contrats, 8 710 €, 39 box identifiés,
24 contrats sans box, un locataire à deux box).

Après modification de `data/locataires_demo.csv` :

```bash
npm run suivi:demo-data   # régénère lib/suivi/demo-data.ts
```

## Brancher la vraie base

> **État au 15 août 2026 — déjà fait sur le projet `hesuunwaputjlvyensfx`.**
> Les tables `sr_*` sont créées (migration `suivi_reglements_tables`) et le CSV
> est importé : 62 locataires, 39 box, 63 contrats, 8 710 € de loyers mensuels,
> 0 règlement (le carnet démarre vide, ce qui est l'état attendu).
> Le back-office est inchangé — 68 clients, 137 box, 71 contrats avant comme
> après. Les sections ci-dessous restent la marche à suivre pour une autre
> base, ou pour rejouer l'import après mise à jour du CSV.

### 1. Créer les tables

Dans le SQL Editor Supabase, exécuter **une fois** :

```
supabase/migrations/014_suivi_reglements.sql
```

(Sur une base neuve, `supabase/schema.sql` contient déjà ces tables : rien de
plus à faire.)

### 2. Importer le CSV

```bash
npm run suivi:import -- --dry-run          # vérifie le fichier, n'écrit rien
npm run suivi:import                        # data/locataires_seed.csv
npm run suivi:import -- --file autre.csv
```

Le script exige `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` (les
tables `sr_*` sont sous RLS, réservées au personnel).

Il est **idempotent** : relancé deux fois, il ne crée aucun doublon. Chaque
entité est retrouvée sur sa clé naturelle — locataire par `(nom, téléphone,
e-mail)`, box par `(bâtiment, numéro)`, contrat par `(locataire, box)`. Il crée
les locataires, les box et les contrats, et **rien d'autre** : jamais de
règlement, jamais une ligne dans les tables du back-office.

### 3. Ouvrir l'app

`/suivi` est protégée comme `/admin` : il faut une session `admin` ou `employee`.
Depuis le back-office, le lien se trouve en bas de la barre latérale.

## Le modèle de données, et sa connexion au back-office

L'app a ses propres tables, préfixées `sr_` (suivi des règlements) :

```
sr_locataires   id, nom, societe, telephone, email, date_entree, actif,
                observations, observations_updated_at, customer_id →
sr_box          id, numero, batiment, surface_m2, unit_id →
sr_contrats     id, locataire_id, box_id, loyer_mensuel_eur, date_debut,
                date_fin, remarque, contract_id →
sr_reglements   id, contrat_id, periode (AAAA-MM), statut, montant_encaisse_eur,
                date_encaissement, moyen, note, updated_at
                UNIQUE (contrat_id, periode)
```

### Pourquoi des tables séparées plutôt que `customers` / `units` / `contracts` ?

Deux raisons, et elles sont structurelles :

1. **Le back-office ne doit rien subir.** Ses 68 clients, 137 box et 71 contrats
   sont la réalité contractuelle de l'entreprise. Y déverser un export CSV de
   63 lignes créerait des doublons impossibles à démêler, et l'import est
   destiné à être rejoué.
2. **Les référentiels ne coïncident pas.** Le carnet d'encaissement doit pouvoir
   pointer un règlement dont le box n'est pas encore identifié — 24 des
   63 contrats sont dans ce cas, et l'un d'eux n'a même pas de nom de locataire.
   Côté back-office, `contracts.unit_id` est obligatoire : ces lignes-là ne
   pourraient tout simplement pas y entrer.

### Comment les deux bases se rejoignent

Trois colonnes de liaison, nullables, portées par les tables `sr_*` :

| Colonne | Pointe vers | Sens |
|---|---|---|
| `sr_locataires.customer_id` | `customers.id` | ce locataire est ce client |
| `sr_box.unit_id` | `units.id` | ce box est cette unité |
| `sr_contrats.contract_id` | `contracts.id` | ce contrat est ce contrat |

Tant qu'elles sont nulles, les deux mondes vivent côte à côte sans se gêner.
Une fois renseignées, chaque ligne du carnet pointe vers son équivalent
back-office, et la synchronisation devient possible **dans les deux sens** :

- **Descendante** (back-office → carnet) : créer un contrat dans `/admin` et
  ouvrir la ligne correspondante dans le carnet du mois suivant.
- **Montante** (carnet → back-office) : un `sr_reglements` soldé sur un contrat
  relié peut alimenter un `payments` et solder la facture correspondante — la
  logique existe déjà dans `markInvoicePaid()` (`lib/actions/invoices.tsx`).

À ce jour aucune liaison n'est renseignée (les trois colonnes sont à `null`
sur les 63 contrats importés) : les deux référentiels cohabitent sans se
gêner, exactement comme prévu.

Le rapprochement lui-même n'est pas automatisé : les colonnes sont posées, la
correspondance nom-à-nom entre l'export CSV et les 68 clients du back-office
demande une passe de vérification humaine qu'aucune heuristique ne remplace
sans risque de rattacher un règlement au mauvais client. Les index uniques
partiels sur ces trois colonnes garantissent qu'un client, une unité ou un
contrat du back-office ne peut être rattaché qu'à une seule ligne du carnet.

## Règles métier

- **Pas de ligne créée à l'avance.** Un mois sans ligne dans `sr_reglements`
  signifie « attendu ». La ligne naît à la première interaction, et « annuler le
  règlement » la supprime au lieu de la repasser à « attendu » — sinon la table
  accumulerait 63 lignes vides par mois.
- **Un tap = loyer plein.** `statut = paye` sans montant saisi vaut le loyer du
  contrat (`encaisseLigne`, `lib/suivi/totals.ts`).
- **Le statut se déduit du montant**, jamais l'inverse : 0 € remet en attente,
  un montant inférieur au loyer donne « partiel », un montant supérieur ou égal
  solde le mois.
- **Une ligne par contrat**, pas par locataire : un locataire à deux box compte
  deux fois dans le total mensuel, mais n'a qu'une seule fiche.
- **Montants entiers en euros.** Pas de centimes dans l'interface.
- **Un « reste à encaisser » n'est jamais négatif** : une régularisation
  supérieure au loyer gonfle l'encaissé, pas le reste.

## Choix d'interface

- L'ordre de la liste est **figé au chargement du mois**. Si elle se retriait à
  chaque tap, la ligne suivante remonterait sous le pouce et l'exploitant
  pointerait la mauvaise personne. Les filtres masquent des lignes, ils n'en
  déplacent aucune.
- **Tap** = bascule payé/non payé, enregistré immédiatement, affichage mis à
  jour avant la réponse du serveur, retour arrière et message d'erreur si
  l'enregistrement échoue. **Appui long** = feuille de saisie détaillée.
- Le bouton d'encaissement est posé **à côté** du lien vers la fiche, pas
  dedans : un bouton imbriqué dans un lien fait quitter la liste au moindre
  relâchement décalé.
- Pas de `<select>` natif : le sélecteur roulant iOS demande trois gestes là où
  une grille de boutons en demande un.
- Balayage horizontal sur la liste = mois précédent / suivant, avec un seuil de
  70 px et un rejet des gestes majoritairement verticaux.

## Installation sur l'écran d'accueil (iOS)

Ouvrir `https://<votre-domaine>/suivi` dans Safari → **Partager** → **Sur
l'écran d'accueil**. L'app s'ouvre alors en plein écran, sans barre d'adresse
(`display: standalone`, `scope: /suivi`).

Manifeste : `app/suivi/manifest.webmanifest/route.ts` — servi par une route
dédiée plutôt que par `app/manifest.ts`, pour que `start_url` pointe sur
`/suivi` et non sur la vitrine du site.

Icônes : `public/suivi/`. La source vectorielle est `icone.svg` (coche
blanche sur le teal LG BOX) ; les PNG en sont dérivés et versionnés. Aucune
dépendance de génération d'image n'est installée dans le projet — refaire les
PNG depuis le SVG avec l'outil de votre choix si la charte change.

## Contrôles effectués sur la base de production

Après application de la migration et de l'import :

| Contrôle | Résultat |
|---|---|
| Totaux importés | 62 locataires, 39 box, 63 contrats, 8 710 €, 24 sans box |
| Idempotence | 63 contrats pour 63 clés `(locataire, box)` distinctes → un ré-import n'insère rien |
| Back-office intact | 68 / 137 / 71 / 0 / 0 / 61 avant **et** après |
| RLS `anon` | 0 ligne visible sur `sr_locataires` |
| RLS `authenticated` sans profil staff | 0 ligne visible |
| RLS `postgres` | 62 lignes — les policies filtrent bien, elles ne bloquent pas tout |
| Unicité `(contrat_id, periode)` | doublon rejeté |
| Contrainte de période | `2026-13` rejeté |
| Jointures PostgREST | un seul chemin de clé étrangère par relation, aucun embed ambigu |
| Advisors Supabase | aucun nouvel avertissement lié aux tables `sr_*` |

Reste à valider par vous, faute d'accès réseau à `supabase.co` depuis
l'environnement de développement : le rendu des écrans branchés sur la vraie
base, avec une session `admin` ou `employee`.

## Vie privée

- Aucune donnée personnelle n'est journalisée côté serveur : les Server Actions
  de `lib/actions/suivi.ts` ne manipulent que des identifiants et des montants,
  et n'écrivent rien dans `activity_log`.
- Les pages `/suivi` sont marquées `noindex, nofollow`.
- Le CSV réel n'est pas versionné (voir plus haut).

## Hors périmètre

Pas de quittances, pas de relances automatiques, pas d'export comptable, pas de
gestion des entrées et sorties, pas de plan des box. Ces fonctions restent dans
le back-office.

## Écart connu sur les données de départ

Le brief annonce « 63 contrats, 8 580 € de loyers mensuels ». Le fichier
`locataires_seed.csv` fourni contient bien **63 contrats**, mais leurs loyers
totalisent **8 710 €** — soit 130 € de plus. Aucune ligne du fichier n'explique
l'écart (aucun loyer de 130 € en double, aucune ligne manifestement en trop).
L'import et les tests s'alignent donc sur le fichier, qui est la source de
vérité vérifiable ; si les 8 580 € sont le bon chiffre, c'est une ligne du CSV
qu'il faut corriger, et le total se réajustera tout seul.

Le fichier contient par ailleurs deux cas limites, tous deux volontairement
conservés :

- 24 contrats sans numéro de box (« box à identifier »), affichés comme tels et
  comptés dans les totaux ;
- une ligne **sans nom de locataire** (140 €, ligne 62), affichée
  « Locataire à identifier » — le loyer est bien encaissé, la ligne doit rester
  pointable.
