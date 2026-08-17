# Calage des plans relevés

Chaîne de traitement qui transpose les plans du bâtiment (relevés MagicPlan,
exportés en SVG) vers le repère en centimètres utilisé par les box.

Le relevé sert **uniquement** au positionnement, à la forme et à la
numérotation des box. Il ne détermine ni les surfaces ni les prix : l'éditeur
du relevé indique lui-même ne garantir aucune précision dimensionnelle, et la
surface reste une donnée commerciale saisie à la main (voir
`supabase/migrations/014_v1_13.sql`).

## Étapes

1. `extract-rooms.mjs` — déduit l'emprise de chaque pièce : les tracés de murs
   sont convertis en segments, puis pour chaque étiquette on lance des rayons
   jusqu'au premier mur. Plusieurs rayons parallèles votent, pour ne pas fuir
   par les ouvertures de porte.
2. `map-boxes.mjs` — rattache chaque pièce au box correspondant en base. Le
   rez-de-chaussée numérote de 1 à 15 dans chacun des quatre bâtiments : le
   découpage est trouvé par recherche exhaustive, en ne retenant que celui qui
   reproduit exactement les listes de numéros enregistrées.
3. `gen-walls.mjs` — génère `lib/units/floor-plan-walls.ts`, le fond de plan
   (murs, sols, portes) transposé dans le même repère que les box.

Les chemins des fichiers sources sont en dur en tête de chaque script : ils
pointent vers les exports fournis par l'exploitant, à réajuster si les plans
sont relevés à nouveau.
