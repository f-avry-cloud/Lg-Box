// Rapprochement de la grille tarifaire et des box à louer. Fonctions pures,
// séparées de l'accès à la base pour être testées sans elle.

import type { Niveau } from "@/lib/site/config";

export type Tarif = {
  libelle: string;
  surface: number;
  niveau: Niveau;
  prix: number;
};

export type GroupeLibre = {
  surface_m2: number | null;
  niveau: Niveau;
  nombre: number;
  tarif_eur: number | null;
};

export type Disponibilites = {
  total_box: number;
  total_libres: number;
  libres: GroupeLibre[];
};

/**
 * - `libre` : au moins un box de cette taille est à louer aujourd'hui.
 * - `complet` : la base répond, et il n'y en a aucun.
 * - `inconnu` : la base n'a pas répondu. On n'affiche alors ni « libre » ni
 *   « complet » : annoncer un box qu'on n'a pas, ou refuser un client pour
 *   rien, coûte plus cher que de dire « appelez-nous ».
 */
export type Etat = "libre" | "complet" | "inconnu";

export type LigneOffre = Tarif & {
  etat: Etat;
  /** Nombre de box à louer ; 0 quand complet ou inconnu. */
  nombre: number;
  /** false pour un box libre dont la surface n'est pas dans la grille. */
  dansLaGrille: boolean;
};

export type Offre = {
  lignes: LigneOffre[];
  etatGlobal: Etat;
  totalLibres: number;
  totalBox: number | null;
  prixMin: number | null;
  prixMax: number | null;
};

/**
 * Lit la surface dans un libellé saisi à la main (« 12 m² », « 7.5m2 »,
 * « 5 m² à l'étage »). Sert aux lignes créées avant l'ajout de la colonne
 * `surface_m2`.
 */
export function surfaceDepuisLibelle(libelle: string): number | null {
  const m = libelle.replace(",", ".").match(/(\d+(?:\.\d+)?)\s*m/i);
  return m ? Number(m[1]) : null;
}

export function libelleTarif(surface: number, niveau: Niveau): string {
  const s = String(surface).replace(".", ",");
  return niveau === "etage" ? `${s} m² à l'étage` : `${s} m²`;
}

export function construireOffre(tarifs: Tarif[], dispo: Disponibilites | null): Offre {
  const tries = [...tarifs].sort(
    (a, b) => (a.niveau === b.niveau ? a.surface - b.surface : a.niveau === "rdc" ? -1 : 1)
  );

  const restants = new Map<string, GroupeLibre>();
  for (const g of dispo?.libres ?? []) {
    if (g.surface_m2 === null) continue;
    restants.set(`${g.niveau}:${Number(g.surface_m2)}`, g);
  }

  const lignes: LigneOffre[] = tries.map((t) => {
    const cle = `${t.niveau}:${t.surface}`;
    const groupe = restants.get(cle);
    restants.delete(cle);
    const nombre = groupe?.nombre ?? 0;
    return {
      ...t,
      nombre,
      etat: dispo === null ? "inconnu" : nombre > 0 ? "libre" : "complet",
      dansLaGrille: true,
    };
  });

  // Un box libre dont la surface n'a pas de ligne dans la grille (un 6 m², un
  // 17 m²) reste un box à louer : on l'ajoute, au tarif indicatif du box s'il
  // en a un, sinon au prix de la surface inférieure la plus proche.
  for (const g of restants.values()) {
    const surface = Number(g.surface_m2);
    const voisin = [...tries]
      .filter((t) => t.niveau === g.niveau && t.surface <= surface)
      .pop();
    const prix = g.tarif_eur ?? voisin?.prix;
    if (prix === undefined || prix === null) continue;
    lignes.push({
      libelle: libelleTarif(surface, g.niveau),
      surface,
      niveau: g.niveau,
      prix,
      nombre: g.nombre,
      etat: "libre",
      dansLaGrille: false,
    });
  }

  lignes.sort((a, b) =>
    a.niveau === b.niveau ? a.surface - b.surface : a.niveau === "rdc" ? -1 : 1
  );

  const prix = lignes.map((l) => l.prix);
  // Les box libres sans surface connue comptent dans le total, pas dans les lignes.
  const totalLibres = dispo?.total_libres ?? 0;

  return {
    lignes,
    etatGlobal: dispo === null ? "inconnu" : totalLibres > 0 ? "libre" : "complet",
    totalLibres,
    totalBox: dispo?.total_box ?? null,
    prixMin: prix.length ? Math.min(...prix) : null,
    prixMax: prix.length ? Math.max(...prix) : null,
  };
}

/** « 140 € » — sans décimales quand le prix est rond. */
export function formatPrix(prix: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(prix) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(prix);
}

export function formatSurface(surface: number): string {
  return `${String(surface).replace(".", ",")} m²`;
}
