import { describe, expect, it } from "vitest";

import { haversineDistanceKm } from "@/lib/business/distance";

describe("haversineDistanceKm", () => {
  it("returns 0 for the same point", () => {
    expect(haversineDistanceKm(48.8566, 2.3522, 48.8566, 2.3522)).toBeCloseTo(0, 5);
  });

  it("matches the known Paris–Marseille distance within a few km", () => {
    // Paris (48.8566, 2.3522) -> Marseille (43.2965, 5.3698), ~660 km à vol d'oiseau.
    const distance = haversineDistanceKm(48.8566, 2.3522, 43.2965, 5.3698);
    expect(distance).toBeGreaterThan(650);
    expect(distance).toBeLessThan(670);
  });

  it("is symmetric", () => {
    const a = haversineDistanceKm(48.8566, 2.3522, 45.764, 4.8357);
    const b = haversineDistanceKm(45.764, 4.8357, 48.8566, 2.3522);
    expect(a).toBeCloseTo(b, 5);
  });
});
