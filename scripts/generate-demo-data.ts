/**
 * Régénère lib/suivi/demo-data.ts depuis data/locataires_demo.csv.
 *
 *   npm run suivi:demo-data
 *
 * Le jeu de démonstration est embarqué dans un module TypeScript plutôt que lu
 * sur le disque à l'exécution : il reste ainsi disponible dans le bundle
 * serveur, y compris sur Vercel où data/ n'est pas déployé.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SOURCE = resolve(process.cwd(), "data/locataires_demo.csv");
const CIBLE = resolve(process.cwd(), "lib/suivi/demo-data.ts");

const ENTETE = `// Jeu de données de démonstration de l'application « Suivi des règlements ».
//
// Ce fichier est GÉNÉRÉ à partir de data/locataires_demo.csv :
//   npm run suivi:demo-data
//
// Il reprend la structure exacte du fichier réel locataires_seed.csv — mêmes
// box, mêmes bâtiments, mêmes surfaces, mêmes loyers, mêmes dates d'entrée,
// même locataire à deux box, mêmes 23 « box à identifier » — mais les noms
// sont des pseudonymes et les coordonnées sont des valeurs réservées à la
// fiction (plage ARCEP +33 6 39 98 xx xx, domaine example.org). Le dépôt
// étant public, aucune donnée personnelle réelle n'y est versionnée : le
// vrai CSV se dépose en local dans data/locataires_seed.csv, que le mode
// démo utilise en priorité s'il le trouve.

export const DEMO_CSV = \``;

const csv = readFileSync(SOURCE, "utf-8");
const echappe = csv.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

writeFileSync(CIBLE, `${ENTETE}${echappe}\`;\n`, "utf-8");
console.log(`lib/suivi/demo-data.ts régénéré (${csv.split("\n").length - 2} lignes de données).`);
