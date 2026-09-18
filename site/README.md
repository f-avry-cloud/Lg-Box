# Site public LG BOX — version légère

Un site vitrine statique, alternatif à l'actuel `lg-box.fr` : mêmes contenus,
mêmes URLs, mêmes mots-clés — mais 11 pages HTML pures, sans framework, sans
cookie et sans base de données.

| | |
|---|---|
| Pages | 11, aux **URLs identiques** à celles du site actuel |
| Poids d'une page | 12 à 28 ko de HTML + 28 ko de CSS + 7 ko de JS, mutualisés |
| Dépendances | aucune (le générateur n'utilise que Node) |
| Cookies / traceurs | aucun |
| Carte | OpenStreetMap en `iframe` paresseuse, sans bandeau de consentement |

## Utilisation

```bash
node site/build.mjs          # écrit site/dist/
python3 -m http.server -d site/dist 8080   # prévisualisation locale
```

`site/dist/` est versionné : il se dépose tel quel sur n'importe quel
hébergement (FTP, Netlify, Vercel, GitHub Pages…), sans étape de build côté
serveur.

## Organisation

```
site/
├── build.mjs              générateur (Node, sans dépendance)
├── src/content.mjs        TOUS les textes, tarifs, avis, FAQ, photos
├── src/layout.mjs         gabarits : en-tête, pied de page, composants
├── static/assets/         style.css et app.js, copiés tels quels
├── static/images/         les photos du centre (voir plus bas)
└── dist/                  sortie générée — c'est ce qui se met en ligne
```

Pour changer un prix, un avis ou une question de la FAQ : **un seul fichier**,
`src/content.mjs`, puis `node site/build.mjs`.

## Les photos

Le générateur attend huit fichiers dans `site/static/images/`. Tant qu'un
fichier manque, le bloc affiche un dégradé travaillé — jamais une image
cassée.

| Fichier attendu | Sujet |
|---|---|
| `batiment-lg-box-guengat.jpg` | le bâtiment vu de l'extérieur |
| `couloir-box-stockage.jpg` | un couloir intérieur |
| `box-interieur-etageres.jpg` | l'intérieur d'un box avec ses étagères |
| `volet-roulant-aluminium-box.jpg` | un volet roulant / une porte numérotée |
| `parking-acces-camion.jpg` | le parking et l'accès camion |
| `videosurveillance-securite.jpg` | une caméra, l'alarme |
| `materiel-manutention-diable.jpg` | diables et chariots |
| `box-2m2-stockage-cartons.jpg` | un box rempli de cartons |

Les noms sont volontairement descriptifs : c'est du référencement gratuit sur
Google Images. Les textes alternatifs correspondants sont dans
`src/content.mjs`, section `photos`.

`./fetch-images.sh` récupère les images du site actuel dans
`static/images/_telechargees/` : il ne reste qu'à choisir les huit meilleures
et à les renommer. (Ce script a besoin d'un accès réseau vers `lg-box.fr`.)

Pensez à redimensionner les photos autour de 1600 px de large et à les
compresser (~150 ko) avant de les déposer.

## Référencement

Ce qui est conservé du site actuel :

- **les URLs** (`faq.html`, `location-box-quimper-finistere.html`, etc.) : les
  positions acquises et les liens entrants restent valides ;
- **les balises `<title>`** existantes, au mot près ;
- les contenus : histoire de l'ancienne base de la Marine, surfaces,
  équipements, sécurité, avis clients, questions fréquentes.

Ce qui est ajouté :

- des `<meta name="description">` rédigées page par page ;
- des données structurées JSON-LD `SelfStorage` (adresse, horaires 24/7,
  fourchette de prix, zone desservie), `FAQPage` sur la FAQ et un fil
  d'Ariane sur les pages internes ;
- `sitemap.xml`, `robots.txt`, balises Open Graph, `canonical` ;
- des images avec `alt` descriptifs, `loading="lazy"` et dimensions déclarées.

## Accessibilité et performances

- Contrastes conformes AA, navigation au clavier, lien d'évitement, `:focus-visible` visible.
- Toutes les animations sont désactivées sous `prefers-reduced-motion`.
- Aucune police bloquante : le texte s'affiche immédiatement dans la police
  système, puis bascule sur Bricolage Grotesque / Inter (`display=swap`).
- Le site fonctionne intégralement sans JavaScript ; le script n'ajoute que
  les apparitions au défilement, le curseur de surface et le menu mobile.

## Mise en ligne

1. `node site/build.mjs`
2. Déposer le **contenu** de `site/dist/` à la racine de l'hébergement
   (et non le dossier `dist` lui-même), en conservant les noms de fichiers.
3. Vérifier `https://www.lg-box.fr/sitemap.xml` puis le soumettre dans la
   Search Console.

Aucune redirection n'est nécessaire : les URLs ne changent pas.
