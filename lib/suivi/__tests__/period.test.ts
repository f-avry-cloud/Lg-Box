import { describe, expect, it } from "vitest";

import {
  anneesDisponibles,
  douzeDernieresPeriodes,
  isPeriode,
  labelMoisCourt,
  labelPeriode,
  periodeCourante,
  shiftPeriode,
} from "@/lib/suivi/period";

describe("isPeriode", () => {
  it("accepte une période bien formée", () => {
    expect(isPeriode("2026-08")).toBe(true);
    expect(isPeriode("2026-01")).toBe(true);
    expect(isPeriode("2026-12")).toBe(true);
  });

  it("rejette les mois hors bornes et les formats approximatifs", () => {
    expect(isPeriode("2026-00")).toBe(false);
    expect(isPeriode("2026-13")).toBe(false);
    expect(isPeriode("2026-8")).toBe(false);
    expect(isPeriode("août 2026")).toBe(false);
    expect(isPeriode("2026-08-01")).toBe(false);
  });
});

describe("shiftPeriode", () => {
  it("avance et recule d'un mois", () => {
    expect(shiftPeriode("2026-08", 1)).toBe("2026-09");
    expect(shiftPeriode("2026-08", -1)).toBe("2026-07");
  });

  it("franchit correctement les changements d'année dans les deux sens", () => {
    expect(shiftPeriode("2026-12", 1)).toBe("2027-01");
    expect(shiftPeriode("2026-01", -1)).toBe("2025-12");
    expect(shiftPeriode("2026-01", -13)).toBe("2024-12");
    expect(shiftPeriode("2026-12", 13)).toBe("2028-01");
  });

  it("ne bouge pas pour un décalage nul", () => {
    expect(shiftPeriode("2026-08", 0)).toBe("2026-08");
  });
});

describe("labelPeriode", () => {
  it("rend le libellé français attendu dans l'en-tête", () => {
    expect(labelPeriode("2026-08")).toBe("Août 2026");
    expect(labelPeriode("2026-01")).toBe("Janvier 2026");
    expect(labelPeriode("2026-12")).toBe("Décembre 2026");
  });
});

describe("periodeCourante", () => {
  it("dérive la période du mois calendaire, sans décalage de fuseau", () => {
    // Le 1er du mois à minuit est le cas qui casse dès qu'on passe par une
    // conversion UTC : la date locale doit rester août.
    expect(periodeCourante(new Date(2026, 7, 1, 0, 0, 0))).toBe("2026-08");
    expect(periodeCourante(new Date(2026, 11, 31, 23, 59, 59))).toBe("2026-12");
  });
});

describe("douzeDernieresPeriodes", () => {
  it("rend douze mois consécutifs terminés par la période demandée", () => {
    const periodes = douzeDernieresPeriodes("2026-08");
    expect(periodes).toHaveLength(12);
    expect(periodes[0]).toBe("2025-09");
    expect(periodes[11]).toBe("2026-08");
  });
});

describe("anneesDisponibles", () => {
  it("centre la liste sur l'année affichée", () => {
    expect(anneesDisponibles("2026-08", 2)).toEqual([2024, 2025, 2026, 2027, 2028]);
  });
});

describe("labelMoisCourt", () => {
  it("utilise les abréviations françaises d'usage", () => {
    expect(labelMoisCourt("2026-01")).toBe("Janv");
    expect(labelMoisCourt("2026-08")).toBe("Août");
    expect(labelMoisCourt("2026-10")).toBe("Oct");
    expect(labelMoisCourt("2026-12")).toBe("Déc");
  });
});
