// Ordre d'affichage des demandes de réservation.
//
// Isolé du dépôt parce que la règle n'est pas évidente : deux groupes de la
// liste se trient dans des sens opposés, et rien dans l'écran ne le rappelle.

import type { DemandeReservation, StatutDemande } from "@/lib/suivi/types";

/** Rang d'affichage d'un statut. Plus petit = plus haut dans la liste. */
function rang(statut: StatutDemande): number {
  if (statut === "nouvelle") return 0;
  if (statut === "liste_attente") return 1;
  return 2;
}

/**
 * Les nouvelles d'abord, puis la liste d'attente, puis le reste.
 *
 * **Le sens du tri change d'un groupe à l'autre**, et c'est voulu :
 *
 * - une demande à traiter se rappelle au plus vite, donc la plus récente
 *   passe devant ;
 * - une liste d'attente se sert dans l'ordre d'arrivée. Celui qui a appelé en
 *   janvier passe avant celui qui a appelé en juin, et l'afficher autrement
 *   ferait rappeler le mauvais le jour où un box se libère.
 */
export function trieDemandes(demandes: DemandeReservation[]): DemandeReservation[] {
  return [...demandes].sort((a, b) => {
    const ecart = rang(a.statut) - rang(b.statut);
    if (ecart !== 0) return ecart;

    if (a.statut === "liste_attente") return a.created_at.localeCompare(b.created_at);
    return b.created_at.localeCompare(a.created_at);
  });
}

/** Rang d'une personne dans la file d'attente, à partir de 1. */
export function rangDansFile(demandes: DemandeReservation[], id: string): number | null {
  const file = trieDemandes(demandes).filter((d) => d.statut === "liste_attente");
  const index = file.findIndex((d) => d.id === id);
  return index === -1 ? null : index + 1;
}

export function nombreEnAttente(demandes: DemandeReservation[]): number {
  return demandes.filter((d) => d.statut === "liste_attente").length;
}

/**
 * « 1re de la file », « 2e de la file ».
 *
 * Le premier rang ne se dit pas comme les autres en français : « 1e » est une
 * faute, et sur un écran qu'on relit tous les jours, elle se voit.
 */
export function libelleRang(rang: number): string {
  return rang === 1 ? "1re de la file" : `${rang}e de la file`;
}
