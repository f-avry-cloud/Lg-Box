import { describe, expect, it } from "vitest";

import {
  liberationsAVenir,
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

describe("liberationsAVenir", () => {
  const contrat = (
    locataire: string,
    dateFin: string | null,
    box: string | null,
    loyer = 120,
    tarifIndicatif: number | null = null
  ) => ({ locataire, dateFin, box, batiment: "Étage", loyer, tarifIndicatif });

  it("ne retient que les sorties des mois suivants", () => {
    const l = liberationsAVenir(
      [
        contrat("MESDACH", "2026-10-31", "9D"),
        contrat("PORÉE", "2026-09-30", "4C"),
        contrat("LOINTAIN", "2027-06-30", "1"),
        contrat("RESTE", null, "2"),
      ],
      "2026-10",
      3
    );
    // Octobre est exclu : son loyer est dû, le box ne se reloue qu'après.
    // Septembre est passé, juin 2027 est hors horizon.
    expect(l).toHaveLength(0);
  });

  it("retient la sortie du mois prochain", () => {
    const l = liberationsAVenir([contrat("MESDACH", "2026-11-30", "9D", 90)], "2026-10", 3);
    expect(l).toHaveLength(1);
    expect(l[0]).toMatchObject({ periode: "2026-11", box: "9D", tarif: 90, tarifHerite: true });
  });

  it("préfère le tarif de référence au loyer en cours", () => {
    const l = liberationsAVenir([contrat("X", "2026-11-30", "9D", 90, 110)], "2026-10", 3);
    expect(l[0]).toMatchObject({ tarif: 110, tarifHerite: false });
  });

  it("classe par mois puis par numéro de box", () => {
    const l = liberationsAVenir(
      [
        contrat("C", "2026-12-31", "2"),
        contrat("A", "2026-11-30", "10"),
        contrat("B", "2026-11-30", "9"),
      ],
      "2026-10",
      3
    );
    expect(l.map((x) => x.box)).toEqual(["9", "10", "2"]);
  });

  it("franchit le changement d'année", () => {
    const l = liberationsAVenir([contrat("X", "2027-01-31", "1")], "2026-11", 3);
    expect(l[0]?.periode).toBe("2027-01");
  });

  it("laisse le tarif inconnu plutôt que d'inventer un chiffre", () => {
    const l = liberationsAVenir([contrat("X", "2026-11-30", "9D", 0)], "2026-10", 3);
    expect(l[0]?.tarif).toBeNull();
  });
});

describe("manqueAGagner", () => {
  it("somme les tarifs, en ignorant les inconnus", () => {
    const l = liberationsAVenir(
      [
        { locataire: "A", dateFin: "2026-11-30", box: "1", batiment: null, loyer: 90, tarifIndicatif: null },
        { locataire: "B", dateFin: "2026-12-31", box: "2", batiment: null, loyer: 0, tarifIndicatif: null },
      ],
      "2026-10",
      3
    );
    expect(manqueAGagner(l)).toBe(90);
  });
});
