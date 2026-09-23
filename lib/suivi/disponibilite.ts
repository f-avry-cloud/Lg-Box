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
 * Le rouge et le vert servent déjà au règlement ; on prend donc un bleu pour
 * l'état courant, l'orange pour ce qui réclame un geste, et le vert franc
 * pour la seule bonne nouvelle commerciale — un box à louer.
 */
export const COULEUR_ETAT_BOX: Record<EtatBox, string> = {
  loue: "var(--suivi-bleu)",
  occupant_inconnu: "var(--suivi-orange)",
  libre: "var(--suivi-vert)",
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
