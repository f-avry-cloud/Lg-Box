import { describe, expect, it } from "vitest";

import { computeScale, computeViewBox, snapToGrid, type FloorPlanUnit } from "@/lib/units/floor-plan";

function unit(overrides: Partial<FloorPlanUnit>): FloorPlanUnit {
  return {
    id: "id",
    numero: "1",
    zone: "Batiment 1",
    floor: "rez_de_chaussee",
    statut: "libre",
    pos_x: 0,
    pos_y: 0,
    largeur_cm: 250,
    profondeur_cm: 300,
    rotation_deg: 0,
    taille_m2: 7.5,
    ...overrides,
  };
}

describe("computeViewBox", () => {
  it("wraps a single unit with the requested margin", () => {
    const box = computeViewBox([unit({ pos_x: 100, pos_y: 200, largeur_cm: 250, profondeur_cm: 300 })], 50);
    expect(box).toEqual({ minX: 50, minY: 150, width: 350, height: 400 });
  });

  it("wraps multiple units spread across the level", () => {
    const units = [
      unit({ id: "a", pos_x: 0, pos_y: 0, largeur_cm: 250, profondeur_cm: 300 }),
      unit({ id: "b", pos_x: 1000, pos_y: 500, largeur_cm: 250, profondeur_cm: 300 }),
    ];
    const box = computeViewBox(units, 100);
    expect(box).toEqual({ minX: -100, minY: -100, width: 1450, height: 1000 });
  });

  it("ignores units without a position and falls back when none are placed", () => {
    const box = computeViewBox([unit({ pos_x: null, pos_y: null })], 100);
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });
});

describe("snapToGrid", () => {
  it("rounds to the nearest step", () => {
    expect(snapToGrid(104, 10)).toBe(100);
    expect(snapToGrid(105, 10)).toBe(110);
    expect(snapToGrid(-15, 10)).toBe(-10);
  });
});

describe("computeScale", () => {
  it("derives the cm-per-pixel ratio from the current rendered size", () => {
    const viewBox = { minX: 0, minY: 0, width: 2000, height: 1000 };
    expect(computeScale(viewBox, 800, 400)).toEqual({ x: 2.5, y: 2.5 });
  });

  it("falls back to a 1:1 ratio when the element isn't rendered yet", () => {
    const viewBox = { minX: 0, minY: 0, width: 2000, height: 1000 };
    expect(computeScale(viewBox, 0, 0)).toEqual({ x: 1, y: 1 });
  });
});
