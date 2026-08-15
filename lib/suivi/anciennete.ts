// Ancienneté d'un locataire, affichée sur sa fiche (« locataire depuis 4 ans »).

/**
 * Nombre d'années révolues entre `dateEntree` (AAAA-MM-JJ) et `reference`.
 * Renvoie null si la date est absente ou illisible — la fiche n'affiche alors
 * simplement pas l'ancienneté.
 */
export function anneesDepuis(dateEntree: string | null, reference: Date = new Date()): number | null {
  if (!dateEntree) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateEntree.trim());
  if (!match) return null;

  const [, a, m, j] = match;
  const annee = Number(a);
  const mois = Number(m);
  const jour = Number(j);
  if (mois < 1 || mois > 12 || jour < 1 || jour > 31) return null;

  let annees = reference.getFullYear() - annee;
  // L'anniversaire de l'entrée n'est pas encore passé cette année.
  const moisReference = reference.getMonth() + 1;
  if (moisReference < mois || (moisReference === mois && reference.getDate() < jour)) {
    annees -= 1;
  }

  return annees < 0 ? null : annees;
}

/** Formule affichée sous la date d'entrée. */
export function libelleAnciennete(dateEntree: string | null, reference: Date = new Date()): string | null {
  const annees = anneesDepuis(dateEntree, reference);
  if (annees === null) return null;
  if (annees === 0) return "locataire depuis moins d'un an";
  if (annees === 1) return "locataire depuis 1 an";
  return `locataire depuis ${annees} ans`;
}
