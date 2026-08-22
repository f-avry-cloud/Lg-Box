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

L'onglet Demandes se démontre aussi sans base, sur trois demandes fictives
(`demoDemandes`) : numéros de la plage `+33 6 39 98 xx xx` réservée aux
fictions par l'ARCEP, adresses en `example.org`. Les composer ou leur écrire
ne peut atteindre personne. L'envoi groupé des factures, lui, est masqué en
mode démo : sans base, il n'y a ni paramétrage à régler ni destinataire à
servir.

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
supabase/migrations/015_sr_periodicite.sql
supabase/migrations/016_sr_facturation.sql
supabase/migrations/017_sr_tarif_et_second_box.sql
supabase/migrations/018_sr_reprise.sql
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

### État du rapprochement

- **`sr_box.unit_id` : 36 des 39 box du carnet sont reliés.** Les deux
  référentiels n'écrivent pas les bâtiments pareil — `Bat I` / `Etage` / `RDJ`
  côté carnet (issu du CSV), `Bâtiment 1` / `Étage` / `Rez-de-jardin` côté
  back-office. La correspondance a été vérifiée sur les numéros (36 couples
  retrouvés à l'identique) puis **appliquée une fois comme donnée**, avec un
  garde-fou n'appariant que les couples strictement 1-à-1. Les 3 restants
  (`Bat I / 2A`, `Bat I / 2C`, `Bat IV / 4C`) sont des sous-numéros qui
  n'existent pas dans `units`.

  Le code ne contient donc **aucune table de correspondance de libellés** : il
  cherche sur `unit_id`. Comparer les libellés ne trouverait jamais rien et
  créerait un doublon à chaque rattachement.

- **`sr_locataires.customer_id` et `sr_contrats.contract_id` : non renseignés.**
  La correspondance nom-à-nom entre l'export CSV et les 68 clients du
  back-office demande une vérification humaine qu'aucune heuristique ne
  remplace sans risque de rattacher un règlement au mauvais client.

Les index uniques partiels sur ces trois colonnes garantissent qu'un client,
une unité ou un contrat du back-office ne peut être rattaché qu'à une seule
ligne du carnet.

### Rattacher un box depuis le téléphone

Les 24 contrats encore en « box à identifier » se résolvent depuis la fiche
locataire : un bouton **Rattacher un box** ouvre la liste des box du
back-office, groupée par bâtiment. Le box choisi crée (ou réutilise) la ligne
`sr_box` correspondante **avec son `unit_id`**, puis renseigne
`sr_contrats.box_id`. Les box déjà rattachés restent visibles, marqués
« pris » et non sélectionnables : les masquer ferait chercher en vain un box
qu'on croit libre.

Limite connue : la détection « déjà pris » repose sur `unit_id`. Les trois box
du carnet non reliés (voir plus haut) échappent donc à cette détection.

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
- **« Facturé » n'est pas « encaissé ».** Le statut marque un loyer réclamé,
  pas rentré : il ne compte pas dans l'encaissé et laisse le loyer entier dans
  le reste à encaisser. Il se distingue d'« attendu » par le seul fait qu'on a
  demandé son dû au locataire.

## Où vit le loyer, et pourquoi

**Sur le contrat, jamais sur le box.** `sr_contrats.loyer_mensuel_eur` porte le
montant, et un contrat pointe vers **un seul** box. Un locataire à deux box a
donc **deux contrats** — c'est la maille du back-office
(`contracts.prix_mensuel` + un seul `unit_id`), et la seule qui sache dire ce
que rapporte un box donné.

Le loyer n'est calculé nulle part : il vient de la colonne
`loyer_mensuel_eur` du CSV d'import, et se modifie ensuite à la main.

### Le défaut trouvé sur les données de départ

L'architecture était bonne, l'import ne l'a pas respectée. Le CSV comportait
des baux **sur deux box tenant sur une seule ligne**, avec le montant global :
ils sont entrés comme **un** contrat, rattaché à **un** box, au loyer des deux.

- **GAU Joël** : correct — deux lignes au CSV, donc deux contrats, box 9 à
  180 € et box 3 à 120 €.
- **CALONNE Eric** : replié — **un** contrat à **270 €** sur le box 11, avec
  la mention `second box à identifier (contrat portant sur 2 box)` déjà
  présente dans le fichier d'origine. La fiche du box 11 annonçait donc 270 €,
  qui est le loyer de deux box.

Le back-office ne fait pas mieux sur ce cas : il a deux contrats, 130 € sur le
box 11 et **0 €** sur une unité fictive `CTR-012`. Les deux systèmes se
contredisent (130 contre 270) et aucun ne connaît le loyer réel du second box.

L'arithmétique laisse penser qu'il y a d'autres cas : **27 box sans contrat**
pour seulement **23 contrats sans box**. Au moins quatre box ne trouveront
jamais preneur dans le carnet tel qu'il est.

Conséquences : le total mensuel (8 710 €) reste juste, mais le loyer **par
box** est faux, le second box est compté libre, et le chiffre d'affaires par
box aussi.

### Donner un second box à un locataire

Le vrai manque n'était pas dans le schéma, il était dans l'application : elle
savait rattacher un box à un contrat existant, pas **créer un second
contrat**. Le cas était donc incorrigible depuis le téléphone.

« Affecter un locataire » liste désormais **tous** les locataires, pas
seulement ceux qui attendent un box, et se dédouble selon celui qu'on choisit :

| Le locataire | Ce qui se passe |
|---|---|
| attend un box | son contrat est rattaché, avec sa date d'effet |
| est déjà logé | un **second contrat** est créé, avec son propre loyer |

Dans le second cas, l'écran demande d'où vient ce loyer :

- **loyer supplémentaire** — le locataire paiera davantage (cas d'une vraie
  location de plus) ;
- **réparti depuis un box existant** — le montant global couvrait déjà les
  deux, on abaisse d'autant le contrat d'origine (cas de correction).

Le champ « loyer restant » se déduit tout seul du loyer saisi, de sorte que le
total retombe sur ses pieds sans soustraction à faire ; il reste modifiable, et
la valeur saisie prime alors. Le **total du locataire avant → après** est
affiché en permanence, en orange dès qu'il bouge : les deux gestes se
ressemblent à l'écran et n'ont rien à voir dans les comptes.

Les calculs sont isolés dans `lib/suivi/affectation.ts` (11 tests, bâtis sur
les cas réels GAU et CALONNE).

### Créer un locataire, modifier un loyer

Deux chemins manquaient, et leur absence renvoyait au back-office pour des
gestes quotidiens.

**Modifier le loyer** — un lien « Modifier » à côté du montant, dans le bloc
locataire de la fiche du box. Le loyer n'entrait jusqu'ici qu'à l'import ou à
la création d'un second contrat : une révision de tarif était impossible
depuis le téléphone. Aucune historisation : le nouveau montant vaut pour les
mois à venir, et les mois déjà pointés gardent la somme réellement encaissée,
qui est stockée sur le règlement.

**Créer un locataire** — « Nouveau locataire » au bas de la liste
d'affectation, ou directement « Créer « X » » quand la recherche ne trouve
personne, le nom étant alors repris de ce qui a été tapé. Le formulaire
demande le nom (seul champ obligatoire), la société, le téléphone, l'e-mail,
le loyer — proposé d'après le tarif indicatif du box — et la date d'effet. Il
crée le locataire **et** son premier contrat, rattaché au box ouvert.

Si l'insertion du contrat échoue après celle du locataire, le message le dit
explicitement plutôt que d'annoncer un échec complet : le locataire existe, et
le faire ressaisir créerait un doublon.

### Le tarif indicatif du box

`sr_box.tarif_indicatif_eur`, facultatif, modifiable dans la fiche du box.

Il **propose** un loyer à l'affectation et donne un prix aux box libres. Il ne
le fixe pas : le loyer facturé reste celui du contrat, qui peut y déroger sans
justification. Aucun tarif n'a été rempli d'office — 26 des 67 box n'ont pas
même de surface connue, et un montant deviné qui s'installe dans les comptes
est pire qu'une case vide.

## L'annuaire des locataires

Onglet **Locataires**. Il n'apporte aucune donnée nouvelle — le nom, le box et
le loyer se lisaient déjà depuis la liste du mois, la fiche d'un box ou le
plan. Ce qui manquait, c'était le chemin : partir d'un **nom** quand c'est tout
ce qu'on a en tête, plutôt que de se rappeler dans quel box la personne se
trouve.

L'écran ne redouble donc pas la fiche existante : chaque ligne y mène. Il ne
garde en propre que ce qui doit se faire sans naviguer — chercher, appeler,
corriger un numéro, ajouter quelqu'un.

### L'état se lit sur les contrats, jamais sur les box

C'est le piège de cet écran, et il a bien failli passer. Un contrat peut courir
sans que son box soit rattaché : **21 des 62 locataires** du carnet sont dans
ce cas, hérités d'un import incomplet. Une première version jugeait l'état sur
la présence d'un numéro de box — elle envoyait ces 21 personnes aux archives
alors qu'elles paient tous les mois. `etatLocataire` compte donc les contrats
en cours (`lib/suivi/locataires.ts`).

Trois états pour deux onglets :

| État | Ce que c'est | Où il apparaît |
|---|---|---|
| `actif` | au moins un contrat en cours | Actifs |
| `sans_contrat` | noté à la volée, pas encore de contrat | Actifs, avec une pastille |
| `archive` | tous les contrats terminés | Archivés |

`sans_contrat` mérite d'exister à part : quelqu'un noté en attendant de lui
établir son contrat n'est pas un ancien locataire, et l'archiver le ferait
disparaître au moment précis où il faut penser à lui. Un contrat en cours sans
box affiche « Box à identifier » dans son sous-titre, mais **pas** de pastille
d'alerte — une alerte qui touche un tiers de la liste n'alerte plus personne.

### La recherche

Insensible aux accents et à la casse — on tape « eric » depuis un clavier de
téléphone, pas « ÉRIC » — et elle porte sur le nom, la société, le téléphone,
l'adresse **et le numéro de box**, qui est parfois tout ce dont on se souvient.
Quand elle ne trouve rien, le bouton de création reprend le terme tapé
(« Créer « ZORGLUB » ») : c'est exactement à ce moment-là qu'on s'aperçoit
qu'il manque.

### Deux actions déménagées

`modifieLocataire` et `creeLocataire` vivaient dans `suivi-reprise.ts`, fichier
destiné à disparaître avec la campagne de reprise. Elles n'ont rien de
temporaire : corriger un numéro faux et noter un arrivant sont des gestes du
quotidien. Elles sont désormais dans `lib/actions/suivi-locataires.ts`, et
l'écran Reprise les emprunte le temps qu'il dure.

### Un piège de barre d'onglets

`/suivi/locataires` (l'annuaire) commence par `/suivi/locataire` (la fiche).
L'onglet Règlements, qui s'allume sur la fiche, s'allumait donc aussi sur
l'annuaire — deux onglets éclairés en même temps. La barre oblique finale de
`/suivi/locataire/` n'est pas décorative.

## Le cycle du mois : réclamer, envoyer, encaisser

Trois gestes, dans cet ordre, tous depuis le tableau de bord.

### 1. Passer le mois en facturé

Un bouton, une confirmation. La confirmation annonce le nombre exact de
locataires et le montant réclamé — le geste touche une soixantaine de lignes
d'un coup, on ne demande pas « confirmez-vous ? » sans dire quoi.

Deux garde-fous portent tout le reste :

- **rien n'est écrasé.** Seuls les mois encore « attendu » (aucune ligne en
  base) passent à « facturé ». Un mois déjà réglé, partiel ou facturé garde son
  état, et le bouton est donc rejouable sans dégât ;
- **la liste facturée est exactement celle du mois** (`lignesDuMois`), qui
  applique déjà « tout mois commencé est dû » et les dates d'effet : un
  locataire qui n'entre qu'en M+1 n'est pas facturé en M.

Le geste se défait : « Annuler la facturation du mois » ne retire que les
lignes restées « facturé », jamais un loyer rentré entre-temps.

### 2. Envoyer les factures par mail

L'envoi groupé est **la seule action de l'app qui sorte du site**. Elle écrit à
de vraies personnes et rien ne se rattrape, d'où quatre garde-fous :

1. rien ne part sans paramétrage complet — expéditeur, objet, corps ;
2. rien ne part sans confirmation, avec sous les yeux le nombre de
   destinataires et le message **tel qu'il partira**, variables remplacées sur
   le premier destinataire réel ;
3. seuls les loyers passés en « facturé » sont concernés : envoyer la facture
   est le second temps du geste, après l'avoir réclamée ;
4. chaque envoi est journalisé (`sr_envois_facture`) et un contrat déjà servi
   pour la période est écarté — rejouer le bouton ne relance personne.

Le message se paramètre depuis le téléphone (« Paramétrer le mail ») :
expéditeur, adresse de réponse, copie cachée, objet, corps. Quatre variables
sont remplacées à l'envoi : `{nom}`, `{mois}`, `{box}`, `{loyer}`. Une variable
inconnue est laissée visible plutôt que remplacée par du vide — mieux vaut un
`{loyerr}` repéré dans l'aperçu qu'un trou silencieux dans un mail parti à
soixante personnes.

L'envoi passe par Resend, comme les autres mails du site, et exige donc
`RESEND_API_KEY` ainsi qu'un domaine d'expédition vérifié. Sans clé, l'action
refuse d'agir et le dit.

### 3. Encaisser

Le pointage habituel, dans l'onglet Règlements ou depuis la fiche d'un box.

### Le chiffre d'affaires depuis le 1er janvier

Le tableau de bord affiche le cumul encaissé de l'année, à côté du mois qui
seul ne dit pas où l'on en est de l'exercice. Il est calculé avec **la même
règle que le total mensuel** (`cumuleEncaisse`, `lib/suivi/totals.ts`) : un
mois pointé d'un tap, sans montant saisi, vaut le loyer plein. Compter
autrement afficherait un chiffre annuel proche de zéro sur un carnet pointé
au doigt.

## Les charges, et le cash-flow du mois

Le carnet savait ce qui rentre. Sans ce qui sort, il ne pouvait rien dire de
la trésorerie — le seul chiffre qui intéresse vraiment un exploitant. L'écran
**Charges** (`/suivi/charges`, atteint depuis le tableau de bord) le donne.

### Cash-flow, et non résultat

La nuance n'est pas pédante, et elle est écrite dans l'écran. Les entrées sont
les **encaissements pointés au carnet**, comptés le jour où l'argent arrive et
non le jour où le loyer est dû. Les sorties sont les charges qui pèsent sur le
mois. C'est de la trésorerie.

Un résultat comptable partirait du **facturé** — chaque loyer courant sur son
mois, payé ou non — et intégrerait des amortissements que ce carnet ne connaît
pas. `cashFlow()` porte donc ce nom, ses champs s'appellent `entrees` et
`sorties`, et l'écran écrit « Charges payées », pas « Charges ».

### Récurrente ou ponctuelle

L'essentiel des charges d'un centre est récurrent : loyer du terrain,
assurance, électricité, télésurveillance. Devoir les ressaisir chaque mois
serait le meilleur moyen qu'elles cessent d'être saisies. Une charge
récurrente se déclare **une fois**, avec un mois de début, et court jusqu'à ce
qu'on lui pose une fin.

Une charge ponctuelle — des travaux, un achat — ne pèse que sur son seul mois.
La base l'impose (`sr_charges_ponctuelle_check`) : sa fin est son début, ce qui
évite qu'une « ponctuelle » se mette à courir six mois par accident de saisie
sans que rien ne le signale.

### Arrêter n'est pas supprimer

Poser une fin à une charge la retire des mois suivants **et laisse intacts les
mois qu'elle a déjà pesés**. La supprimer efface aussi le passé, et donc les
résultats déjà consultés. La suppression est réservée aux saisies erronées ;
c'est pourquoi le bouton le dit (« efface aussi les mois passés ») et demande
confirmation.

### Le cumul s'arrête au mois affiché

Le point délicat, et celui qui aurait faussé tout le reste : le cumul des
recettes s'arrête au mois affiché — on ne peut pas encaisser l'avenir. Le cumul
des charges doit s'arrêter au même endroit. Comparer douze mois de charges à
huit mois de recettes donnerait un résultat faux, et faux dans le sens qui
inquiète. `chargesCumulees` (`lib/suivi/charges.ts`) additionne donc de janvier
au mois affiché, celui-ci compris, et pas au-delà.

### Le mois de début se choisit librement

Le sélecteur est un `input type="month"` — il rend exactement une chaîne
`AAAA-MM`, la forme même des périodes, et ouvre le sélecteur natif sur iPhone.
Trois raccourcis l'accompagnent (mois précédent, mois courant, janvier de
l'exercice) parce qu'une charge récurrente court le plus souvent depuis le
début de l'année : la borner au mois courant priverait de sens le cumul
« depuis janvier ».

### Table propre à l'app

`sr_charges`, et non la table `expenses` du back-office : la règle du projet
reste que l'app mobile n'écrit pas dans le back-office, et `expenses`
enregistre des dépenses **datées**, une ligne par sortie, sans notion de
récurrence — dont tout dépend ici. Les deux pourront être rapprochées plus
tard ; rien dans la migration ne l'empêche.

### Sur le tableau de bord

Une carte « Cash-flow du mois » affiche le solde et, en une ligne, les charges
du mois et le cumul depuis janvier. Elle mène à l'écran. Tant qu'aucune charge
n'est saisie, elle le dit plutôt que d'afficher un solde flatteur égal aux
recettes.

## Les demandes de réservation

Les demandes du formulaire public (`reservation_requests`, table du
back-office) ont leur onglet : les non traitées d'abord, puis les plus
récentes. Une demande s'ouvre sur sa taille souhaitée, sa date, son message —
et **exactement les mêmes gestes que pour un locataire en place** : appeler,
SMS, e-mail, copier le numéro. Le bloc de contact est partagé
(`components/suivi/bloc-contact.tsx`) plutôt que recopié : c'est le même
geste, il doit se comporter pareil aux deux endroits.

Le statut avance depuis la feuille — nouvelle, contactée, convertie, refusée.
C'est le seul point où l'app mobile écrit hors de ses tables `sr_*` : une
demande se traite le téléphone à la main, souvent debout dans l'allée, et la
marquer « contactée » ailleurs qu'à l'endroit où on vient d'appeler ne se fait
pas. L'écriture passe par l'action existante du back-office
(`updateReservationStatus`), à laquelle on n'ajoute que la revalidation des
écrans mobiles.

### La liste d'attente

Le centre est plein. La plupart des gens qui appellent ne peuvent pas être
servis, et ils ne sont pas refusés pour autant : ils attendent qu'un box se
libère. Les quatre statuts d'origine ne savaient pas dire cela — « contactée »
les faisait sortir de la liste à traiter, et ils étaient perdus le jour où un
box se libérait. D'où un cinquième statut, `liste_attente`.

**Une seule liste, pas deux.** Une demande venue du formulaire public et un
appel noté à la volée décrivent la même chose ; la personne qui consulte la
liste d'attente ne veut pas la consulter en deux endroits. L'inscription
manuelle alimente donc `reservation_requests`, la table du back-office, et
apparaît aussi dans `/admin/reservations`. Une colonne `origine` distingue
`formulaire` de `manuelle` — le back-office annonce « les demandes reçues
depuis la page publique », et une inscription prise au téléphone n'en est pas
une.

**L'e-mail devient facultatif** (migration 020). Le formulaire public l'exige,
et c'est tenable derrière un écran ; au téléphone, non. Obliger à saisir une
adresse reviendrait à en faire inventer, et une adresse inventée est pire
qu'une case vide le jour où l'on cherche à joindre quelqu'un. Le nom seul est
obligatoire, avec au moins un moyen de rappeler — numéro ou adresse.

**Le tri s'inverse selon le groupe**, et c'est le point à ne pas rater
(`lib/suivi/demandes.ts`) :

- une demande *à traiter* se rappelle au plus vite : la plus récente devant ;
- une *liste d'attente* se sert dans l'ordre d'arrivée. Celui qui a appelé en
  janvier passe avant celui qui a appelé en juin, et l'afficher autrement
  ferait rappeler le mauvais le jour venu.

Le rang s'affiche donc à la place des initiales, en bleu ardoise — l'attente
n'est ni une urgence (orange) ni un aboutissement (vert).

**Les policies ont été resserrées** au passage. L'insertion publique était
ouverte sans condition : n'importe qui pouvait poster une demande déjà
« convertie », ou se déclarer notée au téléphone. Elle est désormais bornée à
`statut = 'nouvelle' and origine = 'formulaire'`, et une policy distincte
autorise le personnel à inscrire en liste d'attente. Vérifié en base sous
`role anon`, dans une transaction annulée.

### Supprimer une demande

Une demande traitée ou devenue sans objet n'a pas à encombrer la liste. Deux
chemins :

- **une par une**, depuis sa fiche, en deux temps — la suppression est
  définitive ;
- **d'un coup**, sur le filtre « Toutes » : « Supprimer les N demandes
  traitées » retire les converties et les refusées. Ni les nouvelles ni la
  liste d'attente ne sont touchées, et le filtre est posé côté serveur, pas sur
  une liste d'identifiants venue du téléphone qui pourrait être périmée d'un
  rafraîchissement. Le bouton n'apparaît que sur « Toutes », le seul filtre où
  l'on voit ce qu'on s'apprête à supprimer.

**Le piège, qui valait qu'on s'y arrête** : la policy de suppression est
réservée aux administrateurs (`is_admin()`), et un `delete` refusé par RLS ne
remonte **aucune erreur** — la requête réussit, elle ne touche simplement
aucune ligne. L'écran aurait annoncé « supprimée » sur une demande toujours
là. D'où le `.select("id")` sur les deux actions : c'est le nombre de lignes
rendues qui fait foi. La purge compte d'abord les lignes concernées, ce qui
permet de distinguer deux zéros qui se ressemblent — rien à supprimer, et
suppression refusée.

## La fiche d'un box

Le parcours visé est court : **j'ouvre un box, je vois son statut, j'appelle le
locataire si besoin.** La fiche est donc organisée dans cet ordre, et non
autour de l'édition.

Sur un box occupé, en tête :

- nom du locataire et **statut du règlement du mois** en pastille colorée ;
- surface louée, loyer, date d'entrée (avec l'ancienneté), période en cours ;
- **périodicité** de règlement, mensuelle ou trimestrielle, modifiable d'un tap ;
- **Appeler / SMS / E-mail**, plus « Copier le numéro » ;
- « Marquer réglé » pour le mois courant ;
- « Détacher ce locataire du box », discret et confirmé — opération rare et
  structurante.

Les champs du box (numéro, surface, bâtiment) restent modifiables mais sont
**repliés** derrière « Modifier le box » : on ouvre rarement un box pour
corriger sa surface. Sur un box libre, ils sont dépliés d'emblée, puisqu'il n'y
a pas de locataire à consulter.

### Faire sortir un locataire

**Tout mois commencé est dû.** Couper le lien sur-le-champ ferait donc
disparaître du carnet un loyer encore exigible. La fiche propose à la place
**« Programmer la sortie du locataire »**, avec trois échéances :

| Choix | Lecture |
|---|---|
| Fin du mois courant | préavis échu |
| Fin de M+1 | préavis en cours |
| Fin de M+2 | préavis non respecté |

L'échéance est écrite dans `sr_contrats.date_fin` (dernier jour du mois
choisi). Jusque-là, le contrat continue d'apparaître dans le carnet et le box
reste occupé ; ensuite, le box se libère de lui-même et redevient
attribuable. Un bandeau rappelle la sortie prévue, avec un bouton pour
l'annuler.

### La date d'effet, à l'entrée comme à la sortie

Affecter un locataire à un box demande, en second temps, **à partir de quel
mois le loyer est dû** : mois en cours, M+1 ou M+2. Sans ce choix, un locataire
rattaché aujourd'hui pour une entrée au 1er du mois prochain se retrouverait
facturé ce mois-ci par le bouton du tableau de bord.

Quand le contrat porte déjà une date d'entrée, une quatrième option —
**« Date d'entrée inchangée »** — est proposée et sélectionnée d'office :
rattacher tardivement le box d'un locataire en place depuis trois ans ne doit
pas réécrire son ancienneté.

À côté, **« Mauvaise affectation — retirer sans échéance »** coupe le lien
immédiatement. Sémantique différente : ce n'est pas un départ, c'est une
correction, et rien n'est dû.

Conséquence sur les requêtes : un contrat n'est plus filtré sur
`date_fin is null` mais sur `contratDuPour(periode, date_debut, date_fin)`
(`lib/suivi/contrat.ts`, 12 tests). La règle « tout mois commencé est dû »
vaut aussi à l'entrée : entrer le 31 août rend août dû. Les sept contrats
sans date d'entrée connue ne sont pas exclus — les écarter reviendrait à
cesser de réclamer leur loyer.

### La périodicité ne change pas encore les totaux

`sr_contrats.periodicite` est aujourd'hui **descriptive**. Le carnet reste
mensuel : un contrat trimestriel apparaît « attendu » chaque mois et pèse
chaque mois dans le « reste à encaisser ».

Le rendre réellement trimestriel — ne réclamer le loyer qu'un mois sur trois,
et sans doute pour un montant triple — modifierait les totaux mensuels sur
lesquels vous vous appuyez. C'est une décision d'exploitation, pas une
conséquence à tirer en silence de l'ajout d'un champ.

## Le plan interactif

Bascule **Liste ⇄ Plan** en haut de l'onglet Box.

**Navigation par bâtiment, pas par niveau.** C'est le choix structurant. Le
rez-de-chaussée du site fait près de 60 m de large pour 12 m de profondeur :
cadré en entier sur un téléphone, chaque box tombe sous la vingtaine de pixels
et le plan devient un ruban illisible. Bâtiment par bâtiment, les proportions
reviennent entre 1:1 et 1,5:1 et remplissent l'écran — le plan est lisible
sans zoomer, et le zoom sert au détail.

- Pincer pour zoomer (×1 à ×6), glisser pour déplacer, bouton de recadrage
  dès qu'on a zoomé. La translation est bornée par ce que le zoom laisse
  dépasser : au zoom ×1 le plan reste cadré, on ne peut pas le perdre.
- Un glissement de plus de 6 px annule l'ouverture du box effleuré.
- Vert plein = occupé, contour = libre. Tap = fiche du box.
- Les compteurs par bâtiment sont sur les pastilles de sélection.

**D'où vient la géométrie.** Elle est **lue** dans `units` — c'est le plan
dessiné dans le back-office — via `sr_box.unit_id`, et jamais écrite : déplacer
un box reste une opération du back-office. **Les 67 box sont reliés.**

Le raccord s'est fait en deux temps, et le second mérite d'être noté :
l'appariement initial comparait les numéros caractère pour caractère, ce qui
laissait sept box de côté — `2A`, `2B`, `2C`, `4A`, `4B`, `4C`, `10bis`. Ils
existaient pourtant bel et bien dans le plan, positionnés et dans les bons
bâtiments : le back-office les écrit `2a`, `4a`, `10 bis` (minuscules, et une
espace pour le « bis »). Même box, deux conventions de saisie. La comparaison
ignore désormais la casse et les espaces.

Un box ajouté plus tard des deux côtés avec des orthographes différentes
retomberait dans le même piège. Il apparaîtrait alors sous le plan dans un
encart « non placés », tapable comme les autres — les escamoter donnerait un
plan faussement complet. C'est le signal qu'il faut renseigner son `unit_id`.

En mode démo, faute de géométrie, une grille régulière est fabriquée pour
éprouver le rendu et les gestes. Elle ne décrit pas le site.

## Reprise du centre — écran temporaire

Une campagne d'appels, pas une fonction du carnet : prévenir chaque locataire,
un par un, du changement de propriétaire. Onglet **Reprise**.

On descend une liste, on appelle, on coche. L'écran est fait pour cela :

- **ce qui reste à faire remonte en tête**, puis l'alphabétique — une campagne
  se mène en descendant une liste, pas en cherchant les trous dedans ;
- **deux marques indépendantes** : « prévenu du changement » et « message
  laissé ». Elles ne s'excluent pas — on laisse un message, puis on finit par
  avoir la personne, et les deux faits comptent. Un statut unique aurait
  obligé à effacer le premier pour enregistrer le second ;
- **un encart d'observations**, enregistré à la perte du focus ;
- **les coordonnées se corrigent sur place** : c'est en appelant qu'on
  découvre les numéros faux, et devoir changer d'écran pour les réparer, c'est
  ne pas les réparer ;
- **« Ajouter un locataire non renseigné »** crée un locataire sans contrat ni
  box — le cas est fréquent en reprise, et exiger le contrat à cet instant
  ferait perdre l'information. Le box et le loyer se rattachent ensuite depuis
  l'écran Box.
- L'avancement reste en tête d'écran, et la recherche porte aussi sur le
  **numéro de box** et le **téléphone** : on part souvent d'un box devant
  lequel on se trouve, ou d'un numéro qui rappelle.

Un locataire **sans aucune coordonnée** est signalé comme tel dans sa fiche,
plutôt que de traîner en bas de liste sans qu'on comprenne pourquoi il n'avance
jamais.

### Ce qu'il faudra supprimer, le jour venu

Tout est isolé pour partir d'un bloc :

| À supprimer | |
|---|---|
| `app/suivi/reprise/` | l'écran |
| `components/suivi/liste-reprise.tsx` | la liste et la fiche d'appel |
| `lib/suivi/reprise.ts` + son test | statuts, tri, avancement |
| `lib/actions/suivi-reprise.ts` | **sauf `modifieLocataire`** |
| `listeReprise()` dans `lib/suivi/repository.ts` | la lecture |
| l'entrée « Reprise » de `barre-onglets.tsx` | l'onglet |
| `drop table sr_reprise_contacts` | l'avancement de campagne |

`modifieLocataire` est la seule pièce à conserver : corriger un nom, un numéro
ou un e-mail n'a rien de temporaire, et il serait absurde de perdre ce chemin
avec la campagne. Le reste ne laisse aucune trace — la note de campagne vit
dans `sr_reprise_contacts`, pas dans `sr_locataires.observations`, précisément
pour que « rappeler samedi » ne survive pas à la reprise.

## Typographie et échelle

L'app avait vingt tailles de texte pour six rôles : chaque écran puisait
librement dans les classes de Tailwind, et deux chiffres de même nature se
retrouvaient à des tailles différentes d'un bloc à l'autre. La lecture en
souffrait plus que d'un manque de style.

**Six tailles, pas une de plus**, définies dans `app/suivi/suivi.css` :

| Classe | Rôle |
|---|---|
| `t-hero` | le chiffre unique d'une carte — un seul par carte |
| `t-chiffre` | chiffre secondaire : tuiles, barre de totaux |
| `t-titre` | titre d'écran, nom propre mis en avant |
| `t-corps` | texte courant |
| `t-meta` | mention discrète : contexte, aide de saisie |
| `t-etiquette` | étiquette de section, en capitales espacées |

Deux règles tiennent le reste : **la hiérarchie se fait par la taille et la
couleur, jamais par le gras** — les anciennes étiquettes en gras faisaient
crier l'écran — et **les chiffres sont tabulaires**, donc alignés d'une ligne à
l'autre.

La police est **Instrument Sans**, appliquée sur `.suivi-app` et là seulement :
le back-office garde Geist. Un léger resserrement des lettres
(`letter-spacing: -0.011em`) fait la différence entre un écran propre et un
écran fin.

### Pourquoi les classes sont dans `@layer components`

Sans cela, `.t-etiquette { color: … }` et l'utilitaire `text-white` ont la même
spécificité, et c'est l'ordre des feuilles qui tranche — au détriment de
l'utilitaire. Le défaut s'est vu tout de suite en vérifiant le rendu : la
pastille de statut affichait du gris sur gris, et le bandeau du mode démo
avait perdu son orange. Placées dans la couche `components`, les classes de
l'échelle se laissent surcharger par les utilitaires, comme il se doit.

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

## Appels et SMS

Les boutons **Appeler** et **SMS** posent des liens `tel:` et `sms:`
ordinaires : ils ouvrent l'app Téléphone et l'app Messages, partout, sans
condition.

### Le détour par Onoff, tenté puis retiré

L'exploitant passe ses appels professionnels depuis un second numéro (Onoff).
Or **iOS réserve `tel:` et `sms:` à l'app d'appel par défaut du système** :
aucune page web ne peut router un appel vers une app tierce.

Deux chemins ont été essayés, aucun ne tient :

- **Un raccourci iOS** déclenché par `shortcuts://`, chargé d'ouvrir Onoff avec
  le numéro. Le raccourci s'ouvre bien, mais **Onoff ne se laisse pas piloter
  par Raccourcis** : l'action réclame un destinataire qu'aucune forme d'URL ne
  parvient à lui fournir. Deux formes ont été essayées (`input=text&text=…`
  puis le numéro dans `input`), ainsi qu'une recette sans champ typé passant
  par le presse-papiers. Rien n'a abouti.
- **Régler Onoff comme app d'appel par défaut** (Réglages → Apps → Apps par
  défaut, possible dans l'UE depuis iOS 18.2). Ce réglage est **global** : les
  appels personnels partiraient aussi de la ligne professionnelle. Écarté par
  l'exploitant, à juste titre.

Il n'y a pas de troisième voie tant qu'Onoff ne publie pas de schéma d'URL.
Le chemin vers la ligne du centre reste donc le bouton **« Copier le
numéro »** : un tap pour copier, puis un collage dans Onoff.

### Ce qui reste du détour

Le nettoyage du numéro, qui valait la peine indépendamment :
`nettoieNumero` (`lib/suivi/telephone.ts`) réduit le numéro aux chiffres, plus
le `+` s'il précède le premier chiffre.

| Saisie | Lien posé |
|---|---|
| `06 12 34 56 78` | `tel:0612345678` |
| `+33 6 12 34 56 78` | `tel:+33612345678` |
| `(+33) 6 12 34 56 78` | `tel:+33612345678` |

Un `tel:` contenant des espaces n'est pas toujours composé correctement. La
forme n'est jamais convertie : deviner l'indicatif d'un numéro qu'on n'a pas
saisi soi-même, c'est se tromper un jour sur un numéro étranger.

Et l'unification du bloc de contact : `components/suivi/bloc-contact.tsx` sert
partout — locataires, demandes de réservation, campagne de reprise, et la
fiche du locataire, qui avait sa propre série de boutons divergente.

## La marque

Le logo fourni est un JPEG de 392 × 391 sur fond blanc. Les déclinaisons sont
produites par `scripts/generate-icones.mjs`, à relancer seulement si le logo
change — les fichiers sont versionnés dans `public/suivi/`, le build n'en
dépend pas.

| Fichier | Usage | Occupation |
|---|---|---|
| `apple-touch-icon.png` (180) | écran d'accueil iOS | 76 % |
| `icone-192.png`, `icone-512.png` | manifeste PWA | 76 % |
| `icone-512-maskable.png` | Android, découpe circulaire | 58 % |
| `favicon-32.png` | onglet de navigateur | 92 % |
| `logo-256.png` | la marque dans l'interface | 80 % |

Trois contraintes expliquent ces proportions :

- **iOS masque l'icône** par un carré à coins très arrondis. Au-delà de ~76 %,
  les angles du cube se font rogner.
- **Android va plus loin** sur les icônes « maskable » : la zone sûre est un
  cercle, d'où les 58 %.
- **Fond blanc opaque partout.** iOS ne gère pas la transparence sur l'icône
  d'accueil — un fond transparent y devient noir.

Dans l'interface, la marque garde son fond blanc dans une tuile arrondie. La
rendre transparente ferait passer le sable du fond dans les séparations
blanches à l'intérieur du cube, et changerait le dessin.

Elle n'apparaît que sur l'écran d'accueil de l'app et sur la page de
connexion : répétée en tête de chaque écran, elle deviendrait du papier peint.

### Le défaut qui empêchait l'icône d'apparaître

Les fichiers d'icônes existaient déjà, mais **`apple-touch-icon` n'était
déclarée nulle part** — ni dans le layout, ni ailleurs. Safari ne lit que
cette balise pour l'écran d'accueil ; le manifeste ne lui suffit pas. Un
raccourci posé avant cette correction affichait donc une capture de la page au
lieu d'une icône. La déclaration est désormais dans les `metadata` de
`app/suivi/layout.tsx`.

### Qualité de la source

Le logo d'origine fait 392 px de côté. Les icônes de 512 px sont donc
légèrement agrandies (facteur 1,5, rééchantillonnage Lanczos). C'est
acceptable à l'œil, mais si vous disposez du fichier vectoriel — un SVG, un
PDF ou un AI —, le repasser dans le script donnerait des bords parfaitement
nets à toutes les tailles.

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
- Une exception assumée : `sr_envois_facture` conserve l'adresse servie et la
  date de chaque facture envoyée. C'est le prix du garde-fou anti-relance —
  sans cette trace, rejouer le bouton écrirait deux fois à tout le monde.

## Hors périmètre

Pas de quittances, pas de relances **automatiques** (l'envoi groupé des
factures est déclenché à la main, et seulement à la main), pas d'export
comptable, pas de pièce jointe PDF : le mail de facture est un texte, pas un
document. Ces fonctions restent dans le back-office.

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
