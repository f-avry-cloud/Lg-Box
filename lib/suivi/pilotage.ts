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

/** Un box qui ne rapporte pas, ou cessera de rapporter. */
export type ABrelouer = {
  /**
   * Mois à partir duquel le box ne rapporte plus. `null` quand il est déjà
   * vide — le manque à gagner a commencé, il n'est pas à venir.
   */
  disponibleLe: string | null;
  /** Identifiant du box. C'est lui qui identifie, jamais le numéro. */
  boxId: string;
  /** Numéro affiché, qui n'est unique qu'au sein d'un bâtiment. */
  box: string;
  batiment: string | null;
  /** Le partant. Null pour un box déjà vide, que personne n'occupe. */
  locataire: string | null;
  /**
   * Ce qu'on peut en réclamer à la relocation : le tarif de référence du box
   * s'il est renseigné, sinon le loyer que paie l'occupant sortant. Faute des
   * deux, `null` — et il faudra le fixer à la main.
   */
  tarif: number | null;
  /** Vrai quand le tarif vient du loyer en cours, faute de tarif de référence. */
  tarifHerite: boolean;
  /**
   * Un bail est déjà signé pour la suite. La ligne reste affichée — le box ne
   * rapporte rien aujourd'hui — mais son tarif sort du manque à gagner : il
   * est déjà regagné.
   */
  reserve: boolean;
};

export type EntreeDepart = {
  /** Dernier jour du bail. */
  dateFin: string;
  /** Un départ sans box ne dit rien d'une vacance : il sera écarté. */
  boxId: string | null;
  box: string | null;
  batiment: string | null;
  locataire: string;
  loyer: number;
  tarifIndicatif: number | null;
};

export type EntreeVide = {
  boxId: string;
  box: string;
  batiment: string | null;
  tarifIndicatif: number | null;
  /** Un bail commence plus tard sur ce box. */
  reserve?: boolean;
};

/** Un bail quelconque, pour savoir si un box est repris après un départ. */
export type Couverture = {
  boxId: string;
  /** Mois de début, « AAAA-MM ». Null = depuis toujours. */
  debut: string | null;
  /** Mois de fin, « AAAA-MM ». Null = sans échéance. */
  fin: string | null;
};

/**
 * Ce box est-il couvert par un bail au mois donné ?
 *
 * Le rapprochement se fait sur l'identifiant, **jamais sur le numéro** : cinq
 * box du site portent le n° 7, un par bâtiment. Comparer les numéros faisait
 * couvrir le 7 du Bâtiment IV par le bail du 7 du Bâtiment I, et disparaître
 * un départ bien réel.
 */
function couvert(couvertures: Couverture[], boxId: string, mois: string): boolean {
  return couvertures.some(
    (c) =>
      c.boxId === boxId &&
      (c.debut === null || c.debut <= mois) &&
      (c.fin === null || c.fin >= mois)
  );
}

/**
 * Tout ce qui ne rapporte pas, dans les `nbMois` mois qui viennent.
 *
 * Deux natures réunies dans une seule liste, parce qu'elles coûtent la même
 * chose : un box déjà vide, et un box dont le locataire part. Les séparer
 * obligeait à additionner de tête deux chiffres qui répondent à la même
 * question — combien me manque-t-il par mois.
 *
 * **Un bail qui s'achève le 31 octobre libère le box en novembre.** La version
 * précédente classait ce départ en octobre puis l'écartait comme « déjà dû »,
 * si bien qu'une sortie de fin de mois n'apparaissait nulle part. C'est le
 * mois *suivant* la fin qui compte : c'est à partir de lui que le loyer cesse
 * de rentrer.
 *
 * Deux écueils que l'historique rend tout sauf théoriques :
 *
 * Un départ **sans box** ne dit rien d'une vacance — on ignore quelle case se
 * libère, et trois contrats clos du carnet sont dans ce cas. Ils sont écartés.
 *
 * Un départ dont le box a été **repris** depuis n'en est plus un : le box 7 a
 * changé de locataire au 1er septembre, et compter la sortie de l'ancienne
 * reviendrait à annoncer vide une case occupée et payée.
 */
export function aRelouer(
  departs: EntreeDepart[],
  vides: EntreeVide[],
  couvertures: Couverture[],
  periode: string,
  nbMois = 3
): ABrelouer[] {
  const horizon = decale(periode, nbMois);

  const sorties: ABrelouer[] = departs
    .filter((d): d is EntreeDepart & { boxId: string; box: string } => d.boxId !== null)
    .map((d) => ({ depart: d, disponibleLe: decale(d.dateFin.slice(0, 7), 1) }))
    // Le mois affiché compte : un bail clos le mois dernier laisse déjà le box
    // vide ce mois-ci, et c'est un manque à gagner en cours.
    .filter(({ disponibleLe }) => disponibleLe <= horizon)
    .filter(({ depart, disponibleLe }) => !couvert(couvertures, depart.boxId, disponibleLe))
    .map(({ depart, disponibleLe }) => ({
      disponibleLe,
      boxId: depart.boxId,
      box: depart.box ?? "",
      batiment: depart.batiment,
      locataire: depart.locataire,
      tarif: depart.tarifIndicatif ?? (depart.loyer > 0 ? depart.loyer : null),
      tarifHerite: depart.tarifIndicatif === null && depart.loyer > 0,
      reserve: false,
    }));

  const deja: ABrelouer[] = vides.map((v) => ({
    disponibleLe: null,
    boxId: v.boxId,
    box: v.box,
    batiment: v.batiment,
    locataire: null,
    tarif: v.tarifIndicatif,
    tarifHerite: false,
    reserve: v.reserve ?? false,
  }));

  // Un box déjà rendu par son locataire figure dans les deux listes : il est
  // marqué libre, et son bail porte une date de fin. On ne le compte qu'une
  // fois, et c'est la ligne « déjà vide » qui l'emporte — elle dit le manque
  // à gagner en cours, pas un départ à anticiper.
  const videsParBox = new Set(deja.map((v) => v.boxId));

  return [...deja, ...sorties.filter((s) => !videsParBox.has(s.boxId))].sort(
    (a, b) =>
      (a.disponibleLe ?? "").localeCompare(b.disponibleLe ?? "") ||
      a.box.localeCompare(b.box, "fr", { numeric: true })
  );
}

/**
 * Le manque à gagner mensuel : la somme des tarifs, **réservations exclues**.
 *
 * Un box vide mais déjà reloué pour le mois prochain n'est pas une perte à
 * combler : elle l'est déjà. Le compter gonflerait le chiffre au moment même
 * où la relocation vient d'aboutir.
 */
export function manqueAGagner(lignes: ABrelouer[]): number {
  return lignes.reduce((somme, l) => somme + (l.reserve ? 0 : l.tarif ?? 0), 0);
}

/**
 * Couleur de la marge de manœuvre, du rouge au vert.
 *
 * Les bornes viennent de l'exploitation : en dessous de six box de marge on
 * est en zone de vigilance, au-dessus de treize on respire. Entre les deux la
 * teinte glisse continûment, pour qu'un box perdu se voie sans avoir à lire
 * le chiffre.
 */
export const MARGE_ROUGE = 6;
export const MARGE_VERTE = 13;

export function couleurMarge(boxAvantDeficit: number): string {
  if (boxAvantDeficit <= MARGE_ROUGE) return "hsl(2 72% 44%)";
  if (boxAvantDeficit >= MARGE_VERTE) return "hsl(146 62% 32%)";

  // Interpolation de la teinte seule : la saturation et la clarté restent
  // tenues, sinon le milieu de l'échelle vire au jaune illisible.
  const part = (boxAvantDeficit - MARGE_ROUGE) / (MARGE_VERTE - MARGE_ROUGE);
  const teinte = Math.round(2 + part * 144);
  const saturation = Math.round(72 - part * 10);
  const clarte = Math.round(44 - part * 12);
  return `hsl(${teinte} ${saturation}% ${clarte}%)`;
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
