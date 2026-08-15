import { describe, expect, it } from "vitest";

import { anneesDepuis, libelleAnciennete } from "@/lib/suivi/anciennete";

const REFERENCE = new Date(2026, 7, 15); // 15 août 2026

describe("anneesDepuis", () => {
  it("compte les années révolues", () => {
    expect(anneesDepuis("2023-03-01", REFERENCE)).toBe(3);
    expect(anneesDepuis("2016-02-15", REFERENCE)).toBe(10);
  });

  it("n'arrondit pas au-dessus avant l'anniversaire d'entrée", () => {
    // Entré le 1er septembre : au 15 août, la 3e année n'est pas achevée.
    expect(anneesDepuis("2023-09-01", REFERENCE)).toBe(2);
    // Entré le 16 août : il manque un jour.
    expect(anneesDepuis("2023-08-16", REFERENCE)).toBe(2);
    // Entré le 15 août : l'anniversaire tombe aujourd'hui.
    expect(anneesDepuis("2023-08-15", REFERENCE)).toBe(3);
  });

  it("rend null sur une date absente ou illisible", () => {
    expect(anneesDepuis(null, REFERENCE)).toBeNull();
    expect(anneesDepuis("", REFERENCE)).toBeNull();
    expect(anneesDepuis("01/03/2023", REFERENCE)).toBeNull();
    expect(anneesDepuis("2023-13-01", REFERENCE)).toBeNull();
  });

  it("rend null pour une entrée future plutôt qu'une ancienneté négative", () => {
    expect(anneesDepuis("2027-01-01", REFERENCE)).toBeNull();
  });
});

describe("libelleAnciennete", () => {
  it("accorde le singulier et le pluriel", () => {
    expect(libelleAnciennete("2026-07-01", REFERENCE)).toBe("locataire depuis moins d'un an");
    expect(libelleAnciennete("2025-01-01", REFERENCE)).toBe("locataire depuis 1 an");
    expect(libelleAnciennete("2022-09-19", REFERENCE)).toBe("locataire depuis 3 ans");
  });
});
