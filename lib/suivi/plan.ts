// Géométrie du plan interactif mobile. Fonctions pures, testables sans base
// ni navigateur.
//
// L'unité est le centimètre, comme dans le plan du back-office : 1 unité SVG
// = 1 cm. Aucune échelle codée en dur — c'est le viewBox qui cadre.

import type { UnitFloor } from "@/types/database";

export type BoxPlan = {
  id: string;
  numero: string;
  batiment: string;
  surface_m2: number | null;
  occupe: boolean;
  /** Confirmé disponible à la location — voir `lib/suivi/disponibilite.ts`. */
  libre: boolean;
  locataire: string | null;
  contrat_id: string | null;
  /** Niveau du box, qui détermine le fond de plan (murs relevés). */
  floor: UnitFloor | null;
  /** Géométrie, absente pour les box non placés sur le plan. */
  x: number | null;
  y: number | null;
  largeur: number | null;
  profondeur: number | null;
  rotation: number;
};

export type Cadre = { x: number; y: number; largeur: number; hauteur: number };

/** Un box est affichable sur le plan seulement s'il a une géométrie complète. */
export function estPlace(
  box: BoxPlan
): box is BoxPlan & { x: number; y: number; largeur: number; profondeur: number } {
  return (
    box.x !== null && box.y !== null && box.largeur !== null && box.profondeur !== null
  );
}

const MARGE_CM = 80;

/**
 * Cadre englobant les box placés, plus une marge.
 *
 * Sans box placé, on renvoie un cadre arbitraire mais non dégénéré : un SVG de
 * 0×0 n'affiche rien du tout, pas même le message expliquant qu'il est vide.
 */
export function calculeCadre(boxes: BoxPlan[], marge = MARGE_CM): Cadre {
  const places = boxes.filter(estPlace);
  if (places.length === 0) return { x: 0, y: 0, largeur: 1000, hauteur: 1000 };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const b of places) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.largeur);
    maxY = Math.max(maxY, b.y + b.profondeur);
  }

  return {
    x: minX - marge,
    y: minY - marge,
    largeur: maxX - minX + marge * 2,
    hauteur: maxY - minY + marge * 2,
  };
}

/**
 * Taille de police d'une étiquette, en centimètres SVG, pour qu'elle tienne
 * dans le box quel que soit le zoom.
 *
 * Sur un plan de 60 m de large affiché sur un téléphone, une taille fixe rend
 * les numéros soit illisibles, soit débordants. On la dérive donc de la plus
 * petite dimension du box, bornée pour rester lisible sans écraser le dessin.
 */
export function taillePolice(largeur: number, profondeur: number): number {
  const cote = Math.min(largeur, profondeur);
  // Arrondi : le produit flottant sort des valeurs comme 56.00000000000001,
  // qui finiraient telles quelles dans l'attribut SVG.
  return Math.round(Math.max(28, Math.min(70, cote * 0.28)));
}

/**
 * Formes courtes des locaux dont le nom ne tient pas dans la case.
 *
 * La troncature générique donne « Ate… », qui n'apprend rien ; une abréviation
 * choisie se lit du premier coup d'œil. Le nom entier reste celui de la base,
 * et c'est lui qu'on voit partout ailleurs — listes, fiche, facture.
 */
const ABREGES: Record<string, string> = {
  Atelier: "Ate.",
  Vestibule: "Ves.",
};

/**
 * Largeur d'un caractère, en part de la taille de police. Mesurée sur les
 * chiffres gras de system-ui, qui sont les plus larges de l'étiquette.
 */
const LARGEUR_CARACTERE = 0.62;

/** Étiquette affichée dans le box : le numéro, abrégé s'il est très long. */
export function etiquette(numero: string, largeur: number, profondeur = largeur): string {
  // Le budget de caractères se déduit de la police réellement employée, et non
  // d'une largeur forfaitaire : une case étroite mais profonde garde une grosse
  // police, et tronquer d'après ses seuls centimètres la couperait à tort.
  const police = taillePolice(largeur, profondeur);
  const maxCaracteres = Math.max(2, Math.floor(largeur / (police * LARGEUR_CARACTERE)));
  if (numero.length <= maxCaracteres) return numero;

  // L'abréviation ne sert que si elle tient : dans une case minuscule, la
  // troncature reprend la main plutôt que de déborder.
  const abrege = ABREGES[numero];
  if (abrege && abrege.length <= maxCaracteres) return abrege;

  return `${numero.slice(0, maxCaracteres - 1)}…`;
}

export type StatsBatiment = {
  total: number;
  occupes: number;
  libres: number;
  places: number;
  nonPlaces: number;
  surfaceConnue: number;
  tauxOccupation: number;
};

export function statsBatiment(boxes: BoxPlan[]): StatsBatiment {
  const total = boxes.length;
  const occupes = boxes.filter((b) => b.occupe).length;
  const places = boxes.filter(estPlace).length;

  return {
    total,
    occupes,
    libres: total - occupes,
    places,
    nonPlaces: total - places,
    // Les surfaces inconnues comptent pour 0 : c'est bien la « surface connue »
    // qu'on annonce, pas une estimation.
    surfaceConnue: boxes.reduce((s, b) => s + (b.surface_m2 ?? 0), 0),
    tauxOccupation: total === 0 ? 0 : Math.round((occupes / total) * 100),
  };
}

/**
 * Ramène un facteur de zoom dans des bornes utilisables : en deçà on ne voit
 * plus rien, au-delà on perd le contexte et le plan devient impilotable.
 */
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 6;

export function borneZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

/**
 * Empêche le plan de sortir de l'écran quand on le fait glisser : la
 * translation est bornée par ce que le zoom laisse dépasser de chaque côté.
 * Au zoom 1, le déplacement est nul — le plan reste cadré.
 */
export function borneTranslation(translation: number, zoom: number, taille: number): number {
  const debord = (taille * (zoom - 1)) / 2;
  const borne = Math.min(debord, Math.max(-debord, translation));
  // `|| 0` neutralise le -0 que produit Math.max(-0, …) : sans lui, la
  // transformation CSS contiendrait « translate(-0px) ».
  return borne || 0;
}


/**
 * Niveau d'un groupe de box, pour choisir le fond de plan.
 *
 * Un bâtiment tient sur un seul niveau, mais on prend le plus représenté
 * plutôt que le premier venu : une donnée aberrante isolée ne doit pas faire
 * afficher les murs du mauvais étage.
 */
export function niveauDominant(boxes: BoxPlan[]): UnitFloor | null {
  const comptes = new Map<UnitFloor, number>();
  for (const b of boxes) {
    if (b.floor && estPlace(b)) comptes.set(b.floor, (comptes.get(b.floor) ?? 0) + 1);
  }

  let meilleur: UnitFloor | null = null;
  let max = 0;
  for (const [floor, n] of comptes) {
    if (n > max) {
      max = n;
      meilleur = floor;
    }
  }
  return meilleur;
}
