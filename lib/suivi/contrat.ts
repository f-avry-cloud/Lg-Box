// Règles d'activité d'un contrat du carnet, période par période.

import { dernierJour, premierJour } from "@/lib/suivi/period";

/**
 * Le loyer d'un contrat est-il dû pour la période donnée ?
 *
 * Règle d'exploitation : **tout mois commencé est dû**. Une sortie au 15
 * septembre laisse donc septembre entièrement dû, et arrête au 30. C'est
 * pourquoi la comparaison porte sur le premier jour de la période et non sur
 * la date de fin exacte.
 *
 * Une date manquante ne bloque rien : sept contrats importés n'ont pas de date
 * d'entrée connue, et les exclure du carnet reviendrait à cesser de réclamer
 * leur loyer.
 */
export function contratDuPour(
  periode: string,
  dateDebut: string | null,
  dateFin: string | null
): boolean {
  if (dateDebut !== null && dateDebut > dernierJour(periode)) return false;
  if (dateFin !== null && dateFin < premierJour(periode)) return false;
  return true;
}

/** Une sortie est programmée mais pas encore effective à la période affichée. */
export function sortieAVenir(periode: string, dateFin: string | null): boolean {
  return dateFin !== null && dateFin >= premierJour(periode);
}
