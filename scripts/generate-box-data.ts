/**
 * Régénère lib/suivi/box-reference.ts depuis data/box_reference.csv.
 *
 *   npm run suivi:box-data
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SOURCE = resolve(process.cwd(), "data/box_reference.csv");
const CIBLE = resolve(process.cwd(), "lib/suivi/box-reference.ts");

const ENTETE = `// Référentiel des box du site, fourni par l'exploitant.
//
// GÉNÉRÉ depuis data/box_reference.csv : npm run suivi:box-data
//
// Sert au mode démo, pour qu'il présente la même structure que la production
// (67 box, dont une partie libre) plutôt que les seuls box déduits du carnet
// d'encaissement — sans quoi aucun box libre n'existerait et l'affectation
// d'un locataire serait intestable hors base.
// Ces données ne sont pas personnelles : numéros et surfaces uniquement.

export const BOX_REFERENCE_CSV = \``;

const csv = readFileSync(SOURCE, "utf-8").trimEnd();
const echappe = csv.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

writeFileSync(CIBLE, `${ENTETE}${echappe}\`;\n`, "utf-8");
console.log(`lib/suivi/box-reference.ts régénéré (${csv.split("\n").length - 1} box).`);
