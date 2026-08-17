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
