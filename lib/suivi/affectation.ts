// Affecter un box à un locataire, et répartir le loyer quand il en loue deux.
//
// Le carnet porte le loyer sur le **contrat**, et un contrat sur **un** box.
// C'est la bonne maille : c'est celle du back-office (`contracts.prix_mensuel`
// + un seul `unit_id`), et c'est la seule qui sache dire ce que rapporte un
// box. Un locataire à deux box a donc deux contrats — GAU Joël en est
// l'exemple correct : box 9 à 180 €, box 3 à 120 €.
//
// Ce qui manquait, c'est le moyen de le faire depuis le téléphone. Une
// location à deux box importée sur une seule ligne du CSV entrait comme UN
// contrat au loyer global (CALONNE Eric, 270 €, avec la mention « second box à
// identifier » dans le fichier d'origine), et rien ne permettait de la
// scinder. La fiche du box affichait alors le loyer des deux.
//
// Ces fonctions calculent ce que la scission change, pour l'afficher avant de
// l'appliquer : on ne modifie pas le loyer d'un contrat existant sans montrer
// le total qui en résulte.

/** Un contrat du locataire, réduit à ce que la répartition doit connaître. */
export type ContratDuLocataire = {
  contrat_id: string;
  box_numero: string | null;
  loyer_mensuel_eur: number;
};

export type Repartition = {
  /** Loyer du nouveau contrat, pour le box qu'on ajoute. */
  loyerNouveau: number;
  /**
   * Contrat dont on retire ce loyer, quand le montant global couvrait déjà les
   * deux box. Null = loyer supplémentaire, le locataire paiera davantage.
   */
  source: { contrat_id: string; loyerNouveau: number } | null;
};

export function totalActuel(contrats: ContratDuLocataire[]): number {
  return contrats.reduce((somme, c) => somme + c.loyer_mensuel_eur, 0);
}

/** Ce que le locataire paiera une fois le second box créé. */
export function totalApres(contrats: ContratDuLocataire[], repartition: Repartition): number {
  const { source } = repartition;
  const base = contrats.reduce(
    (somme, c) =>
      somme + (source && c.contrat_id === source.contrat_id ? source.loyerNouveau : c.loyer_mensuel_eur),
    0
  );
  return base + repartition.loyerNouveau;
}

/**
 * Écart entre l'avant et l'après. Zéro = le loyer global a simplement été
 * réparti entre deux box, ce qui est le cas de correction courant.
 *
 * L'écart n'est pas une erreur : ajouter un second box à un locataire qui
 * paiera davantage est une opération parfaitement légitime. Il doit juste
 * être visible, parce que les deux gestes se ressemblent à l'écran et n'ont
 * rien à voir dans les comptes.
 */
export function ecartRepartition(
  contrats: ContratDuLocataire[],
  repartition: Repartition
): number {
  return totalApres(contrats, repartition) - totalActuel(contrats);
}

/** Phrase affichée sous la saisie, pour rendre l'écart lisible sans calcul. */
export function libelleEcart(ecart: number): string {
  if (ecart === 0) return "Total inchangé — le loyer global est réparti entre les deux box.";
  if (ecart > 0) return `Le locataire paiera ${ecart} € de plus par mois.`;
  return `Le locataire paiera ${Math.abs(ecart)} € de moins par mois.`;
}

/**
 * Loyer proposé d'office pour le nouveau box : son tarif indicatif s'il en a
 * un, sinon rien. On ne devine pas à partir de la surface — 26 des 67 box
 * n'ont même pas de surface connue, et un chiffre inventé qui s'installe dans
 * les comptes est pire qu'une case vide.
 */
export function loyerPropose(tarifIndicatif: number | null): string {
  return tarifIndicatif != null && tarifIndicatif > 0 ? String(tarifIndicatif) : "";
}
