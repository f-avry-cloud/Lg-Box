/**
 * Génère les déclinaisons du logo LG BOX à partir du fichier d'origine.
 *
 *   node scripts/generate-icones.mjs chemin/vers/logo.jpeg
 *
 * À relancer seulement si le logo change. Les fichiers produits sont
 * versionnés dans public/ : le build ne dépend pas de ce script.
 *
 * `sharp` n'est pas une dépendance déclarée du projet — il arrive avec Next.js
 * et sert ici à un usage ponctuel, hors build. Si l'installation ne le fournit
 * plus, il faut l'installer le temps de régénérer, puis le retirer : un
 * postinstall qui télécharge des binaires n'a rien à faire dans les
 * dépendances d'une application déployée sur Vercel.
 *
 * Choix de cadrage, et pourquoi :
 *
 *  - le logo d'origine touche presque le bord haut de son image (8 px sur
 *    391). Recadré sur son contenu réel, il se centre proprement ;
 *  - iOS masque l'icône d'accueil par un carré à coins très arrondis. Le logo
 *    occupe donc 76 % du carré : au-delà, les angles du cube se font rogner ;
 *  - la variante « maskable » d'Android tolère une découpe circulaire encore
 *    plus agressive. Le logo y descend à 58 %, pour tenir dans la zone sûre ;
 *  - fond blanc opaque partout. iOS ne gère pas la transparence sur l'icône
 *    d'accueil : un fond transparent y devient noir.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

const SOURCE = process.argv[2];
if (!SOURCE) {
  console.error("Usage : node scripts/generate-icones.mjs <chemin du logo>");
  process.exit(1);
}

const SORTIE = join(process.cwd(), "public", "suivi");
const BLANC = { r: 255, g: 255, b: 255, alpha: 1 };

/** Recadre sur le contenu réel : tout ce qui n'est pas quasi-blanc. */
async function recadreSurLeLogo(chemin) {
  const { data, info } = await sharp(chemin).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * channels;
      if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  return sharp(chemin)
    .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    .png()
    .toBuffer();
}

/** Pose le logo, centré, sur un carré blanc de `taille` px. */
async function carre(logo, taille, occupation) {
  const interieur = Math.round(taille * occupation);
  const marque = await sharp(logo)
    .resize(interieur, interieur, { fit: "contain", background: BLANC, kernel: "lanczos3" })
    .toBuffer();

  return sharp({
    create: { width: taille, height: taille, channels: 4, background: BLANC },
  })
    .composite([{ input: marque, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

await mkdir(SORTIE, { recursive: true });
const logo = await recadreSurLeLogo(SOURCE);

// Les noms sont ceux déjà servis par le manifeste : les remplacer sur place
// évite de casser une icône déjà posée sur un écran d'accueil.
const fichiers = [
  // Icône d'accueil iOS. 180 px est la taille attendue par les iPhone récents.
  ["apple-touch-icon.png", await carre(logo, 180, 0.76)],
  // Manifeste PWA.
  ["icone-192.png", await carre(logo, 192, 0.76)],
  ["icone-512.png", await carre(logo, 512, 0.76)],
  // Android : zone sûre circulaire, donc logo plus petit.
  ["icone-512-maskable.png", await carre(logo, 512, 0.58)],
  // Onglet de navigateur.
  ["favicon-32.png", await carre(logo, 32, 0.92)],
  // Marque affichée dans l'interface. Plus d'air que sur l'icône d'accueil :
  // elle est posée dans une tuile arrondie, et un cube qui touche les angles
  // se fait mordre par l'arrondi.
  ["logo-256.png", await carre(logo, 256, 0.80)],
];

for (const [nom, contenu] of fichiers) {
  await writeFile(join(SORTIE, nom), contenu);
  console.log(`${nom} — ${(contenu.length / 1024).toFixed(1)} ko`);
}
