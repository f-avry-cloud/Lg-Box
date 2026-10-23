// Le premier mois d'un bail entamé en cours de mois.
//
// Règle d'exploitation : un locataire qui emménage le 13 ne paie pas le mois
// entier. On lui compte les jours qui restent, du jour d'entrée au dernier du
// mois inclus, puis le bail repart au loyer plein le 1er du mois suivant.
// C'est plus simple à tenir qu'une échéance glissante au 13 de chaque mois.
//
// Jusqu'ici le carnet ne savait pas dire cela : il réclamait le mois entier
// quelle que soit la date d'entrée. La seule façon de ne pas fausser les
// comptes était de ne pas saisir l'arrivant avant le 1er du mois suivant —
// c'est-à-dire de perdre à la fois son loyer partiel et sa trace.

import { dernierJour, premierJour } from "@/lib/suivi/period";

/** Nombre de jours de la période, février bissextile compris. */
export function joursDuMois(periode: string): number {
  return Number(dernierJour(periode).slice(-2));
}

/**
 * Ce qu'il faut savoir d'un mois proratisé pour l'expliquer à l'écran. Un
 * montant seul laisserait croire à une erreur de saisie.
 */
export type Prorata = {
  /** Jours comptés, du jour d'entrée au dernier du mois inclus. */
  jours: number;
  /** Jours du mois entier, dénominateur du calcul. */
  joursDuMois: number;
  /** Loyer plein du contrat, celui qui s'appliquera dès le mois suivant. */
  loyerPlein: number;
  /** Date d'entrée, pour la dire telle quelle. */
  dateDebut: string;
};

export type LoyerDu = {
  /** Montant réellement dû pour la période, en euros entiers. */
  montant: number;
  /** Renseigné seulement quand le mois est entamé. */
  prorata: Prorata | null;
};

/**
 * Le loyer dû pour une période, prorata du premier mois compris.
 *
 * Trois cas seulement donnent un prorata : la date d'entrée tombe dans la
 * période affichée, elle n'est pas le 1er, et elle est connue. Partout
 * ailleurs le loyer plein s'applique — y compris pour les contrats repris
 * sans date d'entrée, qui courent depuis toujours.
 *
 * La sortie ne se prorate pas, elle : tout mois commencé est dû, c'est la
 * règle que `contratDuPour` applique déjà. Un départ le 15 laisse donc le
 * mois entier réclamé, et le prorata ne joue qu'à l'arrivée.
 */
export function loyerDuPour(
  periode: string,
  loyerMensuel: number,
  dateDebut: string | null
): LoyerDu {
  if (dateDebut === null) return { montant: loyerMensuel, prorata: null };
  if (dateDebut < premierJour(periode) || dateDebut > dernierJour(periode)) {
    return { montant: loyerMensuel, prorata: null };
  }

  const jourEntree = Number(dateDebut.slice(-2));
  if (jourEntree <= 1) return { montant: loyerMensuel, prorata: null };

  const total = joursDuMois(periode);
  const jours = total - jourEntree + 1;

  // Arrondi à l'euro : les loyers du carnet sont des entiers, et une facture
  // au centime pour un mois partiel ne ferait que compliquer le pointage.
  const montant = Math.round((loyerMensuel * jours) / total);

  return {
    montant,
    prorata: { jours, joursDuMois: total, loyerPlein: loyerMensuel, dateDebut },
  };
}

/**
 * Phrase d'explication du prorata, à afficher sous le montant.
 *
 * Elle dit le compte de jours plutôt que la formule : c'est ce qu'on vérifie
 * quand on se demande si le montant est juste.
 */
export function libelleProrata(prorata: Prorata): string {
  const jour = Number(prorata.dateDebut.slice(-2));
  return `Entrée le ${jour} — ${prorata.jours} jours sur ${prorata.joursDuMois}, puis ${prorata.loyerPlein.toLocaleString("fr-FR")} €`;
}

/** Le mois d'entrée d'un contrat, s'il tombe dans la période affichée. */
export function moisDEntree(periode: string, dateDebut: string | null): boolean {
  if (dateDebut === null) return false;
  return dateDebut >= premierJour(periode) && dateDebut <= dernierJour(periode);
}
