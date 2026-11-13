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
  logo: "LG BOX",
  accueil: "Le centre de stockage LG BOX à Guengat, près de Quimper",
  centre: "Les box de garde-meubles LG BOX dans le Finistère sud",
  tarifs: "Box de stockage à louer chez LG BOX, près de Quimper",
  faq1: "LG BOX, garde-meubles à dix minutes de Quimper",
  faq2: "LG BOX, garde-meubles dans le Finistère sud",
  album01: "Garde-meubles LG BOX dans le Finistère sud",
  album02: "Garde-meubles LG BOX près de Quimper",
  album03: "Box à louer dans le Finistère sud",
  album04: "Garde-meuble LG BOX à Guengat",
  album05: "Box de stockage à louer dans le Finistère sud",
  album06: "Le centre de garde-meubles LG BOX",
  album07: "Garde-meubles LG BOX, Finistère sud",
  album08: "Garde-meuble LG BOX dans le Finistère (29)",
  album09: "Garde-meubles LG BOX dans le Finistère",
  album10: "Location de box près de Quimper",
  album11: "Location de box de stockage à Quimper",
  album12: "Box en location près de Quimper",
  album13: "Location de box LG BOX, secteur de Quimper",
  album14: "Box à louer à Guengat, Finistère sud",
  album15: "Box de rangement à louer dans le Finistère sud",
  album16: "Garde-meuble LG BOX, Finistère",
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
