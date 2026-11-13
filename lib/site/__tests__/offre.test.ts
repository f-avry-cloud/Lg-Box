import { describe, expect, it } from "vitest";

import {
  construireOffre,
  formatPrix,
  libelleTarif,
  surfaceDepuisLibelle,
  type Disponibilites,
  type Tarif,
} from "@/lib/site/offre";

const grille: Tarif[] = [
  { libelle: "12 m²", surface: 12, niveau: "rdc", prix: 140 },
  { libelle: "2 m²", surface: 2, niveau: "rdc", prix: 45 },
  { libelle: "12 m² à l'étage", surface: 12, niveau: "etage", prix: 130 },
];

function dispo(libres: Disponibilites["libres"]): Disponibilites {
  return { total_box: 70, total_libres: libres.reduce((n, g) => n + g.nombre, 0), libres };
}

describe("construireOffre", () => {
  it("trie le rez-de-chaussée avant l'étage, puis par surface", () => {
    const offre = construireOffre(grille, dispo([]));
    expect(offre.lignes.map((l) => l.libelle)).toEqual(["2 m²", "12 m²", "12 m² à l'étage"]);
  });

  it("marque libre la seule ligne qui a un box, au bon niveau", () => {
    const offre = construireOffre(
      grille,
      dispo([{ surface_m2: 12, niveau: "rdc", nombre: 1, tarif_eur: 140 }])
    );
    expect(offre.lignes.map((l) => l.etat)).toEqual(["complet", "libre", "complet"]);
    expect(offre.etatGlobal).toBe("libre");
    expect(offre.totalLibres).toBe(1);
  });

  it("n'annonce ni libre ni complet quand la base ne répond pas", () => {
    const offre = construireOffre(grille, null);
    expect(offre.lignes.every((l) => l.etat === "inconnu")).toBe(true);
    expect(offre.etatGlobal).toBe("inconnu");
    expect(offre.totalBox).toBeNull();
  });

  it("ajoute un box libre hors grille, au tarif indicatif du box", () => {
    const offre = construireOffre(
      grille,
      dispo([{ surface_m2: 17, niveau: "rdc", nombre: 2, tarif_eur: 170 }])
    );
    const ligne = offre.lignes.find((l) => l.surface === 17);
    expect(ligne).toMatchObject({ prix: 170, nombre: 2, etat: "libre", dansLaGrille: false });
    expect(offre.prixMax).toBe(170);
  });

  it("à défaut de tarif indicatif, prend le prix de la surface inférieure", () => {
    const offre = construireOffre(
      grille,
      dispo([{ surface_m2: 14, niveau: "rdc", nombre: 1, tarif_eur: null }])
    );
    expect(offre.lignes.find((l) => l.surface === 14)?.prix).toBe(140);
  });

  it("compte un box libre sans surface connue sans lui inventer une ligne", () => {
    const offre = construireOffre(
      grille,
      dispo([{ surface_m2: null, niveau: "rdc", nombre: 1, tarif_eur: null }])
    );
    expect(offre.lignes).toHaveLength(3);
    expect(offre.totalLibres).toBe(1);
    expect(offre.etatGlobal).toBe("libre");
  });
});

describe("libellés et formats", () => {
  it("lit la surface dans un libellé saisi à la main", () => {
    expect(surfaceDepuisLibelle("12 m²")).toBe(12);
    expect(surfaceDepuisLibelle("7,5m2")).toBe(7.5);
    expect(surfaceDepuisLibelle("5 m² à l'étage")).toBe(5);
    expect(surfaceDepuisLibelle("Atelier")).toBeNull();
  });

  it("compose le libellé d'une ligne de grille", () => {
    expect(libelleTarif(5, "rdc")).toBe("5 m²");
    expect(libelleTarif(7.5, "etage")).toBe("7,5 m² à l'étage");
  });

  it("n'affiche pas de décimales pour un prix rond", () => {
    expect(formatPrix(140).replace(/\s/g, " ")).toBe("140 €");
    expect(formatPrix(99.5).replace(/\s/g, " ")).toBe("99,50 €");
  });
});
