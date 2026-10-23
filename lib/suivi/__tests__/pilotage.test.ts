import { describe, expect, it } from "vitest";

import {
  aRelouer,
  couleurMarge,
  loyerMoyen,
  manqueAGagner,
  margeMensuelle,
} from "@/lib/suivi/pilotage";

describe("loyerMoyen", () => {
  it("fait la moyenne et arrondit à l'euro", () => {
    expect(loyerMoyen([120, 140, 90])).toBe(117);
  });

  it("rend zéro sans contrat plutôt qu'une division par zéro", () => {
    expect(loyerMoyen([])).toBe(0);
  });
});

describe("margeMensuelle", () => {
  // Le parc réel : 9 135 € de loyers dus sur 67 contrats, 6 696 € de charges.
  const loyers = Array.from({ length: 67 }, (_, i) => (i === 0 ? 9135 - 66 * 136 : 136));

  it("compte les box qu'on peut perdre en restant à l'équilibre", () => {
    const m = margeMensuelle([120, 140, 100], 200);
    // 360 − 200 = 160 de marge, loyer moyen 120 : un départ laisse 40, le
    // second fait basculer.
    expect(m).toMatchObject({ marge: 160, loyerMoyen: 120, boxAvantDeficit: 1 });
  });

  it("donne l'ordre de grandeur du centre", () => {
    const m = margeMensuelle(loyers, 6696);
    expect(m.marge).toBe(2439);
    expect(m.boxAvantDeficit).toBeGreaterThan(10);
    expect(m.deficitaire).toBe(false);
  });

  it("annonce zéro box de marge quand on est déjà déficitaire", () => {
    const m = margeMensuelle([120, 140], 500);
    expect(m.marge).toBe(-240);
    expect(m.boxAvantDeficit).toBe(0);
    expect(m.deficitaire).toBe(true);
  });

  it("se tait quand aucune charge n'est saisie", () => {
    // Sans charges, « combien de box avant le déficit » n'a pas de réponse :
    // annoncer le parc entier laisserait croire à une marge qu'on n'a pas
    // mesurée.
    expect(margeMensuelle([120, 140], 0).boxAvantDeficit).toBeNull();
  });

  it("se tait aussi sans aucun contrat", () => {
    expect(margeMensuelle([], 500).boxAvantDeficit).toBeNull();
  });
});

describe("aRelouer", () => {
  const depart = (
    locataire: string,
    dateFin: string,
    box: string | null,
    loyer = 120,
    tarifIndicatif: number | null = null
  ) => ({ locataire, dateFin, box, batiment: "Étage", loyer, tarifIndicatif });

  it("compte un bail clos le 31 octobre comme libérant novembre", () => {
    // Le cas qui manquait : MESDACH sort le 31/10. Le box ne rapporte plus
    // à partir de novembre, et la version précédente ne l'affichait nulle
    // part — ni en octobre, « déjà dû », ni après.
    const l = aRelouer([depart("MESDACH", "2026-10-31", "9D", 90)], [], [], "2026-10", 3);
    expect(l).toHaveLength(1);
    expect(l[0]).toMatchObject({ disponibleLe: "2026-11", box: "9D", tarif: 90 });
  });

  it("écarte un départ dont le box a été repris depuis", () => {
    // Le box 7 : CHEVALIER sort le 31/08, ELIAS entre le 01/09. La case est
    // occupée et payée — l'annoncer à relouer serait faux.
    const l = aRelouer(
      [depart("CHEVALIER", "2026-08-31", "7", 170)],
      [],
      [{ box: "7", debut: "2026-09", fin: null }],
      "2026-10",
      3
    );
    expect(l).toHaveLength(0);
  });

  it("écarte un départ sans box, qui ne dit rien d'une vacance", () => {
    // Trois contrats clos du carnet n'ont jamais eu de box rattaché : on
    // ignore quelle case ils libèrent, donc ils ne libèrent rien.
    const l = aRelouer([depart("MARHIC", "2026-07-31", null, 150)], [], [], "2026-10", 3);
    expect(l).toHaveLength(0);
  });

  it("met les box déjà vides en tête, sans mois", () => {
    const l = aRelouer(
      [depart("MESDACH", "2026-10-31", "9D", 90)],
      [{ box: "6", batiment: "RDJ", tarifIndicatif: 120 }],
      [],
      "2026-10",
      3
    );
    expect(l.map((x) => x.box)).toEqual(["6", "9D"]);
    expect(l[0]).toMatchObject({ disponibleLe: null, locataire: null, tarif: 120 });
  });

  it("ne compte pas deux fois un box déjà rendu dont le bail porte une fin", () => {
    const l = aRelouer(
      [depart("PORÉE", "2026-09-30", "4C", 120)],
      [{ box: "4C", batiment: "Bât IV", tarifIndicatif: null }],
      [],
      "2026-10",
      3
    );
    expect(l).toHaveLength(1);
    expect(l[0]).toMatchObject({ box: "4C", disponibleLe: null });
  });

  it("sort un box vide mais déjà reloué du manque à gagner", () => {
    // Le 4C : vide en octobre, repris au 1er novembre. Il ne rapporte rien ce
    // mois-ci, et la ligne le dit — mais la perte est déjà comblée.
    const l = aRelouer(
      [],
      [
        { box: "4C", batiment: "Bât IV", tarifIndicatif: 120, reserve: true },
        { box: "6", batiment: "RDJ", tarifIndicatif: 120 },
      ],
      [],
      "2026-10",
      3
    );
    expect(l).toHaveLength(2);
    expect(manqueAGagner(l)).toBe(120);
  });

  it("écarte ce qui dépasse l'horizon", () => {
    const l = aRelouer([depart("LOINTAIN", "2027-06-30", "1")], [], [], "2026-10", 3);
    expect(l).toHaveLength(0);
  });

  it("garde une sortie déjà passée, dont le box est vide depuis", () => {
    const l = aRelouer([depart("PARTI", "2026-09-30", "7", 100)], [], [], "2026-10", 3);
    expect(l[0]).toMatchObject({ disponibleLe: "2026-10", box: "7" });
  });

  it("préfère le tarif de référence au loyer en cours", () => {
    const l = aRelouer([depart("X", "2026-10-31", "9D", 90, 110)], [], [], "2026-10", 3);
    expect(l[0]).toMatchObject({ tarif: 110, tarifHerite: false });
  });

  it("franchit le changement d'année", () => {
    const l = aRelouer([depart("X", "2026-12-31", "1")], [], [], "2026-11", 3);
    expect(l[0]?.disponibleLe).toBe("2027-01");
  });

  it("laisse le tarif inconnu plutôt que d'inventer un chiffre", () => {
    const l = aRelouer([depart("X", "2026-10-31", "9D", 0)], [], [], "2026-10", 3);
    expect(l[0]?.tarif).toBeNull();
  });
});

describe("manqueAGagner", () => {
  it("somme les tarifs, en ignorant les inconnus", () => {
    const l = aRelouer(
      [
        { locataire: "A", dateFin: "2026-10-31", box: "1", batiment: null, loyer: 90, tarifIndicatif: null },
        { locataire: "B", dateFin: "2026-11-30", box: "2", batiment: null, loyer: 0, tarifIndicatif: null },
      ],
      [],
      [],
      "2026-10",
      3
    );
    expect(manqueAGagner(l)).toBe(90);
  });
});

describe("couleurMarge", () => {
  it("rougit à six box et en dessous", () => {
    expect(couleurMarge(6)).toBe(couleurMarge(0));
    expect(couleurMarge(6)).toContain("hsl(2");
  });

  it("verdit à treize box et au-dessus", () => {
    expect(couleurMarge(13)).toBe(couleurMarge(40));
    expect(couleurMarge(13)).toContain("hsl(146");
  });

  it("glisse continûment entre les deux bornes", () => {
    const teinte = (n: number) => Number(couleurMarge(n).match(/hsl\((\d+)/)![1]);
    expect(teinte(7)).toBeGreaterThan(teinte(6));
    expect(teinte(12)).toBeLessThan(teinte(13));
    expect(teinte(9)).toBeGreaterThan(teinte(8));
  });
});
