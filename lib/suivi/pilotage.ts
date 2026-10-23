// Les chiffres de pilotage du centre : ceux qu'on regarde pour décider, et
// non pour pointer.
//
// Le tableau de bord disait déjà où en est le mois. Il ne disait pas de quelle
// marge on dispose, ni ce qui va se libérer. Fonctions pures, testables sans
// base : elles ne font qu'arithmétique sur des nombres déjà rassemblés.

/**
 * Loyer mensuel moyen des contrats en cours.
 *
 * C'est la perte qu'entraîne, en moyenne, un box qui se vide — donc l'unité
 * dans laquelle se compte la marge. Arrondi à l'euro : la précision au
 * centime donnerait une fausse idée d'exactitude sur une moyenne.
 */
export function loyerMoyen(loyers: number[]): number {
  if (loyers.length === 0) return 0;
  return Math.round(loyers.reduce((somme, l) => somme + l, 0) / loyers.length);
}

export type MargeMensuelle = {
  /** Loyers dus au mois, charges déduites. Peut être négatif. */
  marge: number;
  /** Loyer moyen d'un box occupé, l'unité de la bascule. */
  loyerMoyen: number;
  /**
   * Nombre de box qui peuvent se vider avant que la marge passe sous zéro.
   * `null` quand la question n'a pas de sens : aucune charge saisie, ou
   * aucun contrat pour calculer une moyenne.
   */
  boxAvantDeficit: number | null;
  /** Déjà sous l'eau : la question n'est plus combien, mais de combien. */
  deficitaire: boolean;
};

/**
 * De combien de box peut-on se passer avant de perdre de l'argent ?
 *
 * La base est le **loyer dû**, non l'encaissé : un mois à moitié pointé
 * donnerait une marge famélique et un seuil alarmiste, alors que rien n'a
 * changé dans la structure. C'est un indicateur de structure, pas de
 * trésorerie — le cash-flow du mois, lui, répond à l'autre question.
 *
 * Le compte est celui des box qu'on peut perdre **en restant à l'équilibre** :
 * à 2 439 € de marge et 136 € de loyer moyen, dix-sept départs laissent
 * encore 127 €, le dix-huitième fait basculer.
 */
export function margeMensuelle(
  loyersDus: number[],
  chargesDuMois: number
): MargeMensuelle {
  const moyen = loyerMoyen(loyersDus);
  const marge = loyersDus.reduce((somme, l) => somme + l, 0) - chargesDuMois;

  if (chargesDuMois <= 0 || moyen <= 0) {
    return { marge, loyerMoyen: moyen, boxAvantDeficit: null, deficitaire: marge < 0 };
  }

  if (marge < 0) {
    return { marge, loyerMoyen: moyen, boxAvantDeficit: 0, deficitaire: true };
  }

  return {
    marge,
    loyerMoyen: moyen,
    boxAvantDeficit: Math.floor(marge / moyen),
    deficitaire: false,
  };
}

/** Un box qui se libère à une échéance connue. */
export type Liberation = {
  /** Mois de la libération, « AAAA-MM » — le bail court jusqu'à sa fin. */
  periode: string;
  box: string | null;
  batiment: string | null;
  locataire: string;
  /**
   * Ce qu'on peut en réclamer à la relocation : le tarif de référence du box
   * s'il est renseigné, sinon le loyer que paie l'occupant actuel. Faute des
   * deux, `null` — et il faudra le fixer à la main.
   */
  tarif: number | null;
  /** Vrai quand le tarif vient du loyer en cours, faute de tarif de référence. */
  tarifHerite: boolean;
};

/**
 * Les libérations des `nbMois` prochains mois, la plus proche d'abord.
 *
 * Le mois affiché est exclu : son loyer est déjà dû, le box n'est pas encore
 * à relouer. On regarde devant, pas sous ses pieds.
 */
export function liberationsAVenir(
  contrats: Array<{
    dateFin: string | null;
    box: string | null;
    batiment: string | null;
    locataire: string;
    loyer: number;
    tarifIndicatif: number | null;
  }>,
  periode: string,
  nbMois = 3
): Liberation[] {
  const horizon = decale(periode, nbMois);

  return contrats
    .filter((c) => c.dateFin !== null)
    .map((c) => ({ ...c, periodeFin: c.dateFin!.slice(0, 7) }))
    // Strictement après le mois affiché : une sortie ce mois-ci laisse le
    // loyer dû, et le box ne se reloue qu'au mois suivant.
    .filter((c) => c.periodeFin > periode && c.periodeFin <= horizon)
    .map((c) => ({
      periode: c.periodeFin,
      box: c.box,
      batiment: c.batiment,
      locataire: c.locataire,
      tarif: c.tarifIndicatif ?? (c.loyer > 0 ? c.loyer : null),
      tarifHerite: c.tarifIndicatif === null && c.loyer > 0,
    }))
    .sort(
      (a, b) =>
        a.periode.localeCompare(b.periode) ||
        (a.box ?? "").localeCompare(b.box ?? "", "fr", { numeric: true })
    );
}

/** Somme des tarifs d'une série de libérations — le manque à gagner mensuel. */
export function manqueAGagner(liberations: Liberation[]): number {
  return liberations.reduce((somme, l) => somme + (l.tarif ?? 0), 0);
}

/**
 * Décalage de `n` mois sur une période `AAAA-MM`.
 *
 * Dupliqué ici plutôt qu'importé de `period.ts` pour garder ce module sans
 * dépendance : il ne manipule que des nombres et des périodes.
 */
function decale(periode: string, n: number): string {
  const annee = Number(periode.slice(0, 4));
  const mois = Number(periode.slice(5, 7));
  const total = annee * 12 + (mois - 1) + n;
  return `${String(Math.floor(total / 12)).padStart(4, "0")}-${String((total % 12) + 1).padStart(2, "0")}`;
}
