// Calculs de la barre de totaux et du tri de la liste du mois.
// Fonctions pures : elles tournent à l'identique sur le serveur (rendu
// initial) et dans le navigateur (recalcul optimiste à chaque tap).

import { BOX_A_IDENTIFIER, type LigneMois, type ReglementStatut } from "@/lib/suivi/types";

export type TotauxMois = {
  /** Somme encaissée sur le mois, en euros entiers. */
  encaisse: number;
  /** Somme restant à encaisser (loyer attendu moins ce qui est déjà rentré). */
  reste: number;
  /** Nombre de lignes soldées (statut « payé »). */
  regles: number;
  /** Nombre total de lignes du mois. */
  total: number;
};

/**
 * Le statut effectif d'une ligne : sans ligne de règlement en base, un mois
 * vaut « attendu ». C'est le seul endroit qui connaît cette règle.
 */
export function statutLigne(ligne: LigneMois): ReglementStatut {
  return ligne.reglement?.statut ?? "attendu";
}

/** Montant réellement encaissé sur une ligne. */
export function encaisseLigne(ligne: LigneMois): number {
  const reglement = ligne.reglement;
  if (!reglement) return 0;
  // Un « payé » sans montant saisi vaut le loyer plein : le geste courant est
  // un tap unique, sans passer par la feuille de saisie.
  if (reglement.statut === "paye") {
    return reglement.montant_encaisse_eur || ligne.loyer_mensuel_eur;
  }
  if (reglement.statut === "partiel") return reglement.montant_encaisse_eur;
  return 0;
}

export function calculeTotaux(lignes: LigneMois[]): TotauxMois {
  let encaisse = 0;
  let reste = 0;
  let regles = 0;

  for (const ligne of lignes) {
    const montant = encaisseLigne(ligne);
    encaisse += montant;
    // Un encaissement supérieur au loyer (régularisation, arriéré payé avec
    // le mois courant) ne doit pas produire un « reste » négatif.
    reste += Math.max(0, ligne.loyer_mensuel_eur - montant);
    if (statutLigne(ligne) === "paye") regles += 1;
  }

  return { encaisse, reste, regles, total: lignes.length };
}

export type FiltreMois = "tous" | "regles" | "attente";

export function filtreLignes(
  lignes: LigneMois[],
  filtre: FiltreMois,
  recherche: string
): LigneMois[] {
  const terme = recherche.trim().toLocaleLowerCase("fr");

  return lignes.filter((ligne) => {
    const statut = statutLigne(ligne);
    if (filtre === "regles" && statut !== "paye") return false;
    if (filtre === "attente" && statut === "paye") return false;
    if (!terme) return true;

    const cible = [
      ligne.nom,
      ligne.societe ?? "",
      ligne.box_numero ?? BOX_A_IDENTIFIER,
      ligne.batiment ?? "",
    ]
      .join(" ")
      .toLocaleLowerCase("fr");

    return cible.includes(terme);
  });
}

/**
 * Tri par défaut : les non-réglés d'abord (c'est sur eux qu'on tape), puis
 * alphabétique. `localeCompare` en français pour que les accents se rangent
 * correctement (É avec E, et non après Z).
 */
export function trieLignes(lignes: LigneMois[]): LigneMois[] {
  return [...lignes].sort((a, b) => {
    const aPaye = statutLigne(a) === "paye";
    const bPaye = statutLigne(b) === "paye";
    if (aPaye !== bPaye) return aPaye ? 1 : -1;
    const parNom = a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" });
    if (parNom !== 0) return parNom;
    // Un locataire à deux box : ses lignes restent groupées, ordonnées par box.
    return (a.box_numero ?? "").localeCompare(b.box_numero ?? "", "fr", { numeric: true });
  });
}

/** Initiales affichées dans la pastille (« LE HÉNAFF Julie » → « LJ »). */
export function initiales(nom: string): string {
  const mots = nom.trim().split(/[\s-]+/).filter(Boolean);
  if (mots.length === 0) return "?";
  if (mots.length === 1) return mots[0].slice(0, 2).toLocaleUpperCase("fr");
  return (mots[0][0] + mots[mots.length - 1][0]).toLocaleUpperCase("fr");
}

// Palette des pastilles d'initiales : teintes franches, lisibles en plein
// soleil, dérivées du nom pour qu'un locataire garde toujours sa couleur.
const COULEURS_PASTILLE = [
  "#0f7a87",
  "#2f6f4e",
  "#8a5a1f",
  "#7a3f6d",
  "#3c5a94",
  "#96502f",
  "#4a6b23",
  "#7b3b3b",
];

export function couleurPastille(nom: string): string {
  let hash = 0;
  for (let i = 0; i < nom.length; i += 1) {
    hash = (hash * 31 + nom.charCodeAt(i)) >>> 0;
  }
  return COULEURS_PASTILLE[hash % COULEURS_PASTILLE.length];
}
