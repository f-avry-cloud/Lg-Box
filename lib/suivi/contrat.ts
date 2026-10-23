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

/**
 * Le contrat commence-t-il **après** la période affichée ?
 *
 * Un bail signé pour le mois prochain n'est pas encore dû — `contratDuPour` a
 * raison de l'écarter du pointage. Mais il n'est pas pour autant terminé, et
 * l'écarter partout l'a rendu invisible : son locataire passait aux archives,
 * il ne figurait pas parmi les contrats à rattacher à un box, et son box
 * paraissait libre à quiconque voulait le relouer.
 *
 * Une date de début absente n'est jamais « à venir » : le contrat court déjà.
 */
export function contratAVenir(
  periode: string,
  dateDebut: string | null,
  dateFin: string | null
): boolean {
  if (dateDebut === null) return false;
  if (dateDebut <= dernierJour(periode)) return false;
  // Un bail déjà clos ne s'annonce pas, même si ses deux dates sont futures.
  return dateFin === null || dateFin >= dateDebut;
}

/**
 * Le contrat occupe-t-il le box à la période affichée **ou plus tard** ?
 *
 * C'est la question à poser avant de proposer un box à la location : un box
 * promis à partir du 1er novembre n'est pas disponible, même en octobre.
 */
export function contratOccupeOuReserve(
  periode: string,
  dateDebut: string | null,
  dateFin: string | null
): boolean {
  return (
    contratDuPour(periode, dateDebut, dateFin) || contratAVenir(periode, dateDebut, dateFin)
  );
}
