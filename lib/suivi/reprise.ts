// Campagne de reprise du centre — **temporaire**.
//
// Prévenir chaque locataire du changement de propriétaire, un par un. Le suivi
// tient en trois faits : on l'a eu au téléphone, on lui a laissé un message,
// et ce qu'on note au passage.
//
// Les deux premiers sont indépendants et non exclusifs : on laisse un message,
// puis on finit par avoir la personne. Un statut unique obligerait à effacer
// le premier fait pour enregistrer le second, et on perdrait la trace des
// tentatives — précisément ce qu'on veut garder pendant une campagne d'appels.

export type EtatReprise = {
  contacte: boolean;
  message_laisse: boolean;
  note: string | null;
};

export type LocataireReprise = {
  locataire_id: string;
  nom: string;
  societe: string | null;
  telephone: string | null;
  email: string | null;
  /** Numéros des box occupés, pour se repérer sur le terrain. */
  box: string[];
  etat: EtatReprise;
};

/** L'avancement d'une ligne, pour la pastille et le tri. */
export type StatutReprise = "contacte" | "message" | "a_faire";

export function statutReprise(etat: EtatReprise): StatutReprise {
  // « Contacté » l'emporte : c'est l'aboutissement, même si un message avait
  // été laissé avant.
  if (etat.contacte) return "contacte";
  if (etat.message_laisse) return "message";
  return "a_faire";
}

export const LIBELLE_REPRISE: Record<StatutReprise, string> = {
  contacte: "Contacté",
  message: "Message laissé",
  a_faire: "À contacter",
};

export function couleurReprise(statut: StatutReprise): string {
  if (statut === "contacte") return "var(--suivi-vert)";
  if (statut === "message") return "var(--primary)";
  return "var(--suivi-gris)";
}

export type FiltreReprise = "a_faire" | "tous";

/**
 * Filtre et recherche. La recherche porte aussi sur le numéro de box et le
 * téléphone : pendant une campagne, on part souvent d'un box devant lequel on
 * se trouve, ou d'un numéro qui rappelle.
 */
export function filtreReprise(
  lignes: LocataireReprise[],
  filtre: FiltreReprise,
  recherche: string
): LocataireReprise[] {
  const terme = recherche.trim().toLocaleLowerCase("fr");

  return lignes.filter((l) => {
    if (filtre === "a_faire" && statutReprise(l.etat) === "contacte") return false;
    if (!terme) return true;

    const cible = [l.nom, l.societe ?? "", l.telephone ?? "", l.email ?? "", ...l.box]
      .join(" ")
      .toLocaleLowerCase("fr");

    return cible.includes(terme);
  });
}

/**
 * Tri : ce qui reste à faire d'abord, puis alphabétique. Une campagne se mène
 * en descendant une liste, pas en cherchant les trous dedans.
 */
export function trieReprise(lignes: LocataireReprise[]): LocataireReprise[] {
  const rang: Record<StatutReprise, number> = { a_faire: 0, message: 1, contacte: 2 };

  return [...lignes].sort((a, b) => {
    const parStatut = rang[statutReprise(a.etat)] - rang[statutReprise(b.etat)];
    if (parStatut !== 0) return parStatut;
    return a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" });
  });
}

export type AvancementReprise = {
  total: number;
  contactes: number;
  messages: number;
  restants: number;
  /** Part contactée, en pourcentage entier. */
  pourcentage: number;
};

export function avancementReprise(lignes: LocataireReprise[]): AvancementReprise {
  let contactes = 0;
  let messages = 0;

  for (const l of lignes) {
    const statut = statutReprise(l.etat);
    if (statut === "contacte") contactes += 1;
    else if (statut === "message") messages += 1;
  }

  const total = lignes.length;

  return {
    total,
    contactes,
    messages,
    restants: total - contactes,
    pourcentage: total === 0 ? 0 : Math.round((contactes / total) * 100),
  };
}

/**
 * Un locataire sans aucune coordonnée ne peut pas être appelé : la campagne
 * doit le signaler plutôt que de le laisser traîner en bas de liste sans
 * qu'on comprenne pourquoi il n'avance jamais.
 */
export function sansCoordonnees(l: LocataireReprise): boolean {
  return !l.telephone && !l.email;
}
