import { describe, expect, it } from "vitest";

import {
  borneTranslation,
  borneZoom,
  calculeCadre,
  estPlace,
  etiquette,
  statsBatiment,
  taillePolice,
  type BoxPlan,
} from "@/lib/suivi/plan";

function boxPlan(numero: string, geo: Partial<BoxPlan> = {}): BoxPlan {
  return {
    id: numero,
    numero,
    batiment: "Bât I",
    surface_m2: null,
    occupe: false,
    locataire: null,
    contrat_id: null,
    x: 0,
    y: 0,
    largeur: 300,
    profondeur: 300,
    rotation: 0,
    ...geo,
  };
}

describe("estPlace", () => {
  it("exige une géométrie complète", () => {
    expect(estPlace(boxPlan("1"))).toBe(true);
    expect(estPlace(boxPlan("1", { x: null }))).toBe(false);
    expect(estPlace(boxPlan("1", { largeur: null }))).toBe(false);
  });

  it("accepte une position à zéro, qui est une position valide", () => {
    expect(estPlace(boxPlan("1", { x: 0, y: 0 }))).toBe(true);
  });
});

describe("calculeCadre", () => {
  it("englobe tous les box avec une marge", () => {
    const cadre = calculeCadre(
      [
        boxPlan("1", { x: 100, y: 200, largeur: 300, profondeur: 400 }),
        boxPlan("2", { x: 500, y: 100, largeur: 200, profondeur: 200 }),
      ],
      50
    );

    expect(cadre).toEqual({ x: 50, y: 50, largeur: 700, hauteur: 600 });
  });

  it("ignore les box non placés", () => {
    const cadre = calculeCadre(
      [
        boxPlan("1", { x: 100, y: 100, largeur: 100, profondeur: 100 }),
        boxPlan("2", { x: null, y: null, largeur: null, profondeur: null }),
      ],
      0
    );

    expect(cadre).toEqual({ x: 100, y: 100, largeur: 100, hauteur: 100 });
  });

  it("rend un cadre non dégénéré quand rien n'est placé", () => {
    const cadre = calculeCadre([boxPlan("1", { x: null, largeur: null })]);
    expect(cadre.largeur).toBeGreaterThan(0);
    expect(cadre.hauteur).toBeGreaterThan(0);
  });

  it("gère des coordonnées négatives (l'Étage commence à x = -200)", () => {
    const cadre = calculeCadre(
      [boxPlan("1", { x: -200, y: 100, largeur: 400, profondeur: 300 })],
      0
    );
    expect(cadre.x).toBe(-200);
    expect(cadre.largeur).toBe(400);
  });
});

describe("taillePolice", () => {
  it("s'adapte au plus petit côté du box", () => {
    expect(taillePolice(500, 200)).toBe(56);
  });

  it("reste lisible sur un petit box et mesurée sur un grand", () => {
    expect(taillePolice(50, 50)).toBe(28);
    expect(taillePolice(5000, 5000)).toBe(70);
  });
});

describe("etiquette", () => {
  it("laisse un numéro court intact", () => {
    expect(etiquette("2A", 300)).toBe("2A");
  });

  it("tronque un numéro trop long pour la largeur", () => {
    expect(etiquette("10bis", 110)).toBe("1…");
  });

  it("garde au moins deux caractères même dans un box étroit", () => {
    expect(etiquette("12", 10)).toBe("12");
  });
});

describe("statsBatiment", () => {
  it("compte occupés, libres et non placés", () => {
    const stats = statsBatiment([
      boxPlan("1", { occupe: true, surface_m2: 12 }),
      boxPlan("2", { occupe: false, surface_m2: 8 }),
      boxPlan("3", { occupe: true, surface_m2: null, x: null, largeur: null }),
    ]);

    expect(stats).toEqual({
      total: 3,
      occupes: 2,
      libres: 1,
      places: 2,
      nonPlaces: 1,
      surfaceConnue: 20,
      tauxOccupation: 67,
    });
  });

  it("ne divise pas par zéro sur un bâtiment vide", () => {
    expect(statsBatiment([]).tauxOccupation).toBe(0);
  });
});

describe("borneZoom", () => {
  it("empêche de dézoomer sous le cadrage initial", () => {
    expect(borneZoom(0.2)).toBe(1);
  });

  it("plafonne le zoom", () => {
    expect(borneZoom(50)).toBe(6);
  });
});

describe("borneTranslation", () => {
  it("interdit tout déplacement au zoom 1 : le plan reste cadré", () => {
    expect(borneTranslation(120, 1, 400)).toBe(0);
    expect(borneTranslation(-120, 1, 400)).toBe(0);
  });

  it("autorise le débord exact permis par le zoom", () => {
    // Zoom 2 sur 400 px : 400 px de contenu dépassent, 200 de chaque côté.
    expect(borneTranslation(500, 2, 400)).toBe(200);
    expect(borneTranslation(-500, 2, 400)).toBe(-200);
    expect(borneTranslation(50, 2, 400)).toBe(50);
  });
});
