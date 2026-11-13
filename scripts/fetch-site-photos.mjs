// Télécharge une fois pour toutes les photos de l'ancien site lg-box.fr dans
// public/photos/, sous les noms attendus par lib/site/photos.ts.
//
//   npm run site:photos
//
// À lancer (et à committer) AVANT de basculer le nom de domaine vers le
// nouveau site : après la bascule, l'ancien hébergement ne répond plus.
// Un fichier déjà présent n'est pas retéléchargé.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const dossier = join(racine, "public", "photos");
const sources = JSON.parse(readFileSync(join(racine, "lib", "site", "photos.json"), "utf8"));
const ORIGINE = process.env.PHOTOS_ORIGINE ?? "https://lg-box.fr/";

mkdirSync(dossier, { recursive: true });

let echecs = 0;
for (const [cle, { fichier, origine }] of Object.entries(sources)) {
  const cible = join(dossier, fichier);
  if (existsSync(cible)) {
    console.log(`= ${fichier} (déjà là)`);
    continue;
  }
  try {
    const reponse = await fetch(ORIGINE + origine, {
      headers: { "User-Agent": "Mozilla/5.0 (migration LG BOX)" },
    });
    const type = reponse.headers.get("content-type") ?? "";
    if (!reponse.ok || !type.startsWith("image/")) {
      throw new Error(`HTTP ${reponse.status} (${type || "type inconnu"})`);
    }
    const octets = Buffer.from(await reponse.arrayBuffer());
    writeFileSync(cible, octets);
    console.log(`↓ ${fichier} — ${Math.round(octets.length / 1024)} Ko`);
  } catch (erreur) {
    echecs += 1;
    console.error(`✗ ${cle} (${origine}) : ${erreur.message}`);
  }
}

if (echecs > 0) {
  console.error(`\n${echecs} photo(s) non récupérée(s).`);
  process.exit(1);
}
console.log("\nToutes les photos sont dans public/photos/.");
