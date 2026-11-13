// Identité publique du centre : ce que le site vitrine affiche partout, et ce
// que les moteurs de recherche et les assistants IA doivent lire à l'identique
// d'une page à l'autre (nom, adresse, téléphone).
//
// Les tarifs et les disponibilités ne sont PAS ici : ils viennent de la base
// (voir lib/site/data.ts). Ce fichier ne porte que ce qui ne bouge pas.

export const SITE = {
  nom: "LG BOX",
  raisonSociale: "LG BOX SAS",
  siret: "107 692 733 00010",
  /** Adresse canonique du site, sans barre finale. */
  url: (process.env.NEXT_PUBLIC_VITRINE_URL ?? "https://lg-box.fr").replace(/\/$/, ""),
  telephone: "06 38 64 97 35",
  telephoneE164: "+33638649735",
  email: "info@lg-box.fr",
  adresse: {
    rue: "ZA de Kergueff",
    codePostal: "29180",
    ville: "Guengat",
    departement: "Finistère",
    region: "Bretagne",
  },
  itineraire:
    "https://www.google.com/maps/dir/?api=1&destination=LG+BOX+ZA+de+Kergueff+29180+Guengat",
  hauteurSousPlafond: "3,20 m",
  cameras: 35,
  preavisJours: 8,
  anneeCreation: 2015,
  villesDesservies: [
    { nom: "Quimper", trajet: "10 min" },
    { nom: "Douarnenez", trajet: "15 min" },
    { nom: "Châteaulin", trajet: "25 min" },
    { nom: "Pont-l'Abbé", trajet: "30 min" },
    { nom: "Audierne", trajet: "35 min" },
    { nom: "Crozon", trajet: "50 min" },
  ],
} as const;

export const ADRESSE_LIGNE = `${SITE.adresse.rue}, ${SITE.adresse.codePostal} ${SITE.adresse.ville}`;

export type Niveau = "rdc" | "etage";

export const LIBELLE_NIVEAU: Record<Niveau, string> = {
  rdc: "Rez-de-chaussée",
  etage: "Étage",
};

export const ACCES_NIVEAU: Record<Niveau, string> = {
  rdc: "accès de plain-pied",
  etage: "accès par escalier",
};

/** Ce qui tient dans chaque surface — un repère, pas une promesse. */
export const CONTENANCE: Array<{ jusqua: number; texte: string }> = [
  { jusqua: 2, texte: "Cartons, vélos, pneus, archives" },
  { jusqua: 5, texte: "Le contenu d'un studio" },
  { jusqua: 8, texte: "Le contenu d'un T2" },
  { jusqua: 12, texte: "Le contenu d'un T3" },
  { jusqua: 15, texte: "Le contenu d'un T4" },
  { jusqua: 18, texte: "Le contenu d'une maison" },
  { jusqua: Infinity, texte: "Une grande maison ou un stock professionnel" },
];

export function contenance(surface: number): string {
  return CONTENANCE.find((c) => surface <= c.jusqua)!.texte;
}

/** Volume utile, sur la base des 3,20 m sous plafond. */
export function volumeM3(surface: number): number {
  return Math.round(surface * 3.2);
}
