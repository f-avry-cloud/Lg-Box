/**
 * Régénère les icônes PWA de l'application « Suivi des règlements ».
 *
 *   npm run suivi:icones
 *
 * Les PNG produits sont versionnés dans public/suivi/ : ce script ne sert
 * qu'à les refaire si la charte change.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import sharp from "sharp";

/** Coche blanche sur le teal LG BOX, en carte à coins arrondis. */
function svg(taille: number, maskable: boolean): string {
  // Android recadre les icônes « maskable » en cercle : on garde 18 % de marge
  // de sécurité tout autour, et pas de coins arrondis (le masque s'en charge).
  const marge = maskable ? taille * 0.18 : 0;
  const rayon = maskable ? 0 : taille * 0.22;
  const interne = taille - marge * 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${taille}" height="${taille}" viewBox="0 0 ${taille} ${taille}">
  <rect width="${taille}" height="${taille}" rx="${rayon}" fill="#12909f"/>
  <g transform="translate(${marge} ${marge})">
    <path d="M ${interne * 0.24} ${interne * 0.52} L ${interne * 0.43} ${interne * 0.7} L ${interne * 0.77} ${interne * 0.31}"
      fill="none" stroke="#ffffff" stroke-width="${interne * 0.115}"
      stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
}

const CIBLES: Array<[string, number, boolean]> = [
  ["icone-192.png", 192, false],
  ["icone-512.png", 512, false],
  ["icone-512-maskable.png", 512, true],
  ["apple-touch-icon.png", 180, false],
];

const dossier = resolve(process.cwd(), "public/suivi");

async function main(): Promise<void> {
  for (const [nom, taille, maskable] of CIBLES) {
    const png = await sharp(Buffer.from(svg(taille, maskable))).png().toBuffer();
    writeFileSync(resolve(dossier, nom), png);
    console.log(`${nom} — ${png.length} octets`);
  }

  writeFileSync(resolve(dossier, "icone.svg"), svg(512, false), "utf-8");
  console.log("icone.svg — source vectorielle");
}

main().catch((erreur) => {
  console.error(erreur);
  process.exit(1);
});
