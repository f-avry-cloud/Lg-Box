// Manipulation des périodes « AAAA-MM » de l'application Suivi des règlements.
// Tout est fait en arithmétique de chaînes/entiers plutôt qu'avec des objets
// Date : une période est un mois calendaire, pas un instant, et passer par
// Date fait dériver le résultat d'un fuseau horaire à l'autre (un `new
// Date("2026-08-01")` lu en UTC-3 rend juillet).

const MOIS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

// Abréviations françaises d'usage, écrites en clair : une troncature
// mécanique du nom complet donnerait « Octo », « Nove », « Déce ».
const MOIS_FR_COURT = [
  "Janv",
  "Févr",
  "Mars",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sept",
  "Oct",
  "Nov",
  "Déc",
];

const PERIODE_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isPeriode(value: string): boolean {
  return PERIODE_RE.test(value);
}

export function parsePeriode(periode: string): { annee: number; mois: number } {
  const match = PERIODE_RE.exec(periode);
  if (!match) throw new Error(`Période invalide : ${periode}`);
  return { annee: Number(match[1]), mois: Number(match[2]) };
}

export function formatPeriode(annee: number, mois: number): string {
  return `${String(annee).padStart(4, "0")}-${String(mois).padStart(2, "0")}`;
}

/** Décale une période de `delta` mois (négatif pour reculer). */
export function shiftPeriode(periode: string, delta: number): string {
  const { annee, mois } = parsePeriode(periode);
  // On raisonne en nombre de mois depuis l'an 0 pour éviter les cas limites
  // de fin d'année dans les deux sens.
  const total = annee * 12 + (mois - 1) + delta;
  return formatPeriode(Math.floor(total / 12), (total % 12) + 1);
}

/** « 2026-08 » → « Août 2026 ». */
export function labelPeriode(periode: string): string {
  const { annee, mois } = parsePeriode(periode);
  return `${MOIS_FR[mois - 1]} ${annee}`;
}

/**
 * « d'août 2026 », « de septembre 2026 » : la période dans une phrase.
 *
 * Trois mois sur douze commencent par une voyelle (avril, août, octobre) et
 * imposent l'élision. Écrire « de Août 2026 » dans une demande de
 * confirmation fait mauvais effet là où l'on demande justement à l'exploitant
 * de faire confiance à ce qu'on s'apprête à modifier en base.
 */
export function dePeriode(periode: string): string {
  const label = labelPeriode(periode).toLocaleLowerCase("fr");
  return /^[aeiouy]/.test(label) ? `d'${label}` : `de ${label}`;
}

/** « 2026-08 » → « Août », « 2026-10 » → « Oct » (pastilles d'historique). */
export function labelMoisCourt(periode: string): string {
  const { mois } = parsePeriode(periode);
  return MOIS_FR_COURT[mois - 1];
}

/** Période du mois en cours, dans le fuseau du serveur. */
export function periodeCourante(now: Date = new Date()): string {
  return formatPeriode(now.getFullYear(), now.getMonth() + 1);
}

/**
 * Les douze périodes se terminant par `periode`, de la plus ancienne à la
 * plus récente — l'historique de la fiche locataire.
 */
export function douzeDernieresPeriodes(periode: string): string[] {
  return Array.from({ length: 12 }, (_, i) => shiftPeriode(periode, i - 11));
}

/** Liste d'années proposées dans le sélecteur mois/année. */
export function anneesDisponibles(periode: string, span = 3): number[] {
  const { annee } = parsePeriode(periode);
  return Array.from({ length: span * 2 + 1 }, (_, i) => annee - span + i);
}

export { MOIS_FR };

/** Premier jour d'une période, au format AAAA-MM-JJ. */
export function premierJour(periode: string): string {
  const { annee, mois } = parsePeriode(periode);
  return `${formatPeriode(annee, mois)}-01`;
}

/**
 * Dernier jour d'une période, au format AAAA-MM-JJ.
 *
 * Calculé sur le calendrier grégorien plutôt qu'avec une table de 12 valeurs :
 * février change de longueur une année sur quatre, et la règle séculaire
 * (2100 n'est pas bissextile) est déjà fausse dans la plupart des tables
 * écrites à la main.
 */
export function dernierJour(periode: string): string {
  const { annee, mois } = parsePeriode(periode);
  const jours = [31, bissextile(annee) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mois - 1];
  return `${formatPeriode(annee, mois)}-${jours}`;
}

export function bissextile(annee: number): boolean {
  return (annee % 4 === 0 && annee % 100 !== 0) || annee % 400 === 0;
}
