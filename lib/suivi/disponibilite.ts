// Disponibilité d'un box : trois états, et non deux.
//
// Le carnet n'en connaissait que deux — un box avait un contrat, ou n'en avait
// pas, et on appelait « libre » le second cas. C'est faux, et massivement :
// 25 box du site n'ont aucun contrat rattaché pendant que 25 contrats n'ont
// aucun box. Ce sont les mêmes locataires, pas encore rapprochés. L'exploitant
// sait, lui, que deux box seulement sont réellement vides.
//
// L'absence de contrat ne prouve donc rien. Il faut un troisième état, et
// quelqu'un pour affirmer la disponibilité.

export type EtatBox =
  /** Un contrat court, et on sait qui l'occupe. */
  | "loue"
  /** Aucun contrat rattaché, mais rien ne dit que le box soit vide. */
  | "occupant_inconnu"
  /** Confirmé disponible à la location. */
  | "libre";

export const LIBELLE_ETAT_BOX: Record<EtatBox, string> = {
  loue: "Loué",
  occupant_inconnu: "Locataire à identifier",
  libre: "Libre",
};

/**
 * Le vert reste au loué : c'est le repère du plan depuis le début, et le
 * changer ferait relire un dessin qu'on connaît par cœur. Le bleu marque ce
 * qui est loué sans qu'on sache à qui, le rouge ce qui est vide — la seule
 * chose qu'on cherche des yeux quand on veut savoir ce qui reste à louer.
 */
export const COULEUR_ETAT_BOX: Record<EtatBox, string> = {
  loue: "var(--suivi-vert)",
  occupant_inconnu: "var(--suivi-bleu)",
  libre: "var(--suivi-rouge)",
};

/**
 * Remplissage de la case sur le plan, qui n'est pas toujours la couleur
 * d'identité : un box vide se remplit de rouge **clair**, pour se voir de loin
 * sans que son numéro devienne illisible.
 */
export const FOND_ETAT_BOX: Record<EtatBox, string> = {
  loue: "var(--suivi-vert)",
  occupant_inconnu: "var(--suivi-bleu)",
  libre: "var(--suivi-rouge-clair)",
};

/**
 * L'ordre compte : **le contrat l'emporte sur le drapeau**.
 *
 * Un box marqué disponible mais dont le contrat court encore — une sortie
 * programmée à la fin du mois, par exemple — reste loué jusqu'à l'échéance.
 * Sans cette priorité, un préavis posé d'avance ferait disparaître le loyer
 * du mois en cours.
 */
export function etatBox(box: { occupe: boolean; libre: boolean }): EtatBox {
  if (box.occupe) return "loue";
  return box.libre ? "libre" : "occupant_inconnu";
}

/**
 * Ce qui est réellement proposable à la location. Sert au taux d'occupation :
 * compter les « occupant inconnu » parmi les disponibles donnerait un centre
 * à moitié vide alors qu'il est plein.
 */
export function estALouer(box: { occupe: boolean; libre: boolean }): boolean {
  return etatBox(box) === "libre";
}

export type ComptesDisponibilite = {
  loues: number;
  occupantInconnu: number;
  libres: number;
  total: number;
  /** Part réellement occupée, « occupant inconnu » compris. */
  tauxOccupation: number;
};

export function compteDisponibilite(
  boxes: Array<{ occupe: boolean; libre: boolean }>
): ComptesDisponibilite {
  let loues = 0;
  let occupantInconnu = 0;
  let libres = 0;

  for (const box of boxes) {
    const etat = etatBox(box);
    if (etat === "loue") loues += 1;
    else if (etat === "libre") libres += 1;
    else occupantInconnu += 1;
  }

  const total = boxes.length;
  return {
    loues,
    occupantInconnu,
    libres,
    total,
    tauxOccupation: total === 0 ? 0 : Math.round(((total - libres) / total) * 100),
  };
}

/**
 * Un contrat rattaché à un box, réduit à ce qui décide de l'occupation.
 * `valeur` porte ce que l'appelant veut retrouver : un nom, un identifiant.
 */
export type ContratRattache<T> = {
  box_id: string | null;
  date_debut: string | null;
  date_fin: string | null;
  valeur: T;
};

/**
 * Qui occupe chaque box **aujourd'hui**.
 *
 * Le plan retenait jusqu'ici le premier contrat venu, sans regarder ses dates.
 * Un bail résilié gardait donc sa case en vert : le 6 RDJ, rendu fin août,
 * s'affichait encore loué à son ancienne locataire pendant que la barre des
 * totaux le comptait, elle, parmi les box vides. Deux écrans, deux réponses.
 *
 * Les dates sont des `AAAA-MM-JJ` de largeur fixe : la comparaison de chaînes
 * suffit, et une borne absente n'exclut jamais — un contrat sans date de début
 * court depuis toujours, sans date de fin il court encore.
 *
 * Quand plusieurs contrats se disputent un box — le partant et l'arrivant du
 * même mois — c'est le plus récemment commencé qui l'emporte.
 */
export function occupantsParBox<T>(
  contrats: ContratRattache<T>[],
  aujourdHui: string
): Map<string, T> {
  const retenu = new Map<string, { debut: string; valeur: T }>();

  for (const c of contrats) {
    if (!c.box_id) continue;
    if (c.date_debut && c.date_debut > aujourdHui) continue;
    if (c.date_fin && c.date_fin < aujourdHui) continue;

    // Une date de début absente se classe avant toutes les autres, sans jamais
    // écarter le contrat : elle le rend seulement moins prioritaire qu'un bail
    // dont on connaît le commencement.
    const debut = c.date_debut ?? "";
    const precedent = retenu.get(c.box_id);
    if (!precedent || debut >= precedent.debut) {
      retenu.set(c.box_id, { debut, valeur: c.valeur });
    }
  }

  return new Map([...retenu].map(([boxId, { valeur }]) => [boxId, valeur]));
}
