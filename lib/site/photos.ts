// Photothèque du site public : les photos du site d'origine, reprises telles
// quelles.
//
// Chaque photo vit dans `public/photos/` (voir `npm run site:photos`, qui les
// télécharge une fois pour toutes depuis l'ancien site). Tant qu'un fichier n'y
// est pas, la photo est servie depuis son adresse d'origine : le site reste
// complet pendant la transition, mais il faut que les fichiers soient dans le
// dépôt AVANT de basculer le nom de domaine, sans quoi leur source disparaît.

import { existsSync } from "node:fs";
import { join } from "node:path";

import sources from "@/lib/site/photos.json";

export type CleDePhoto = keyof typeof sources;

export type Photo = {
  src: string;
  alt: string;
};

const ORIGINE = "https://lg-box.fr/";

const ALT: Record<CleDePhoto, string> = {
  album01: "Le bâtiment LG BOX à Guengat, avec son enseigne de self-stockage en façade",
  album02: "Le bâtiment LG BOX vu depuis la voie d'accès",
  album03: "Écrans de vidéosurveillance du centre LG BOX",
  album04: "Couloir desservant les box, aux portes rouges numérotées",
  album05: "Box vide avec un chariot de manutention prêté par le centre",
  album06: "Box avec étagères métalliques et porte fermant à clé",
  album07: "Box équipé d'étagères, fenêtre protégée par un volet roulant",
  album08: "Étagères de rangement dans un box LG BOX",
  album09: "Box avec étagères d'angle",
  album10: "Box en deux parties avec étagères",
  album11: "Box lumineux avec étagères et fenêtres à volets roulants",
  album12: "Entrée d'un box vide",
  album13: "Box vide, porte ouverte sur le couloir",
  album14: "Box rempli de meubles et de cartons",
  album15: "Box aménagé avec mobilier, électroménager et étagères",
  album16: "Sanitaires à la disposition des clients",
};

export function photo(cle: CleDePhoto): Photo {
  const { fichier, origine } = sources[cle];
  const local = existsSync(join(process.cwd(), "public", "photos", fichier));
  return {
    src: local ? `/photos/${fichier}` : ORIGINE + origine,
    alt: ALT[cle],
  };
}

export const ALBUM: CleDePhoto[] = [
  "album01", "album02", "album03", "album04", "album05", "album06", "album07", "album08",
  "album09", "album10", "album11", "album12", "album13", "album14", "album15", "album16",
];
