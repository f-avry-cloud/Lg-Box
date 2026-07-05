import { describe, expect, it } from "vitest";

import { generateRum, isValidIban } from "@/lib/business/iban";

describe("isValidIban", () => {
  it("accepts a valid French IBAN (with letters in the BBAN, spaces, lowercase)", () => {
    expect(isValidIban("FR14 2004 1010 0505 0001 3M02 606")).toBe(true);
    expect(isValidIban("fr1420041010050500013m02606")).toBe(true);
  });

  it("rejects an IBAN with an altered digit (bad checksum)", () => {
    expect(isValidIban("FR14 2004 1010 0505 0001 3M02 607")).toBe(false);
  });

  it("rejects a string that isn't shaped like an IBAN", () => {
    expect(isValidIban("not an iban")).toBe(false);
    expect(isValidIban("1234567890")).toBe(false);
  });

  it("rejects an IBAN that is too short", () => {
    expect(isValidIban("FR1420041010")).toBe(false);
  });
});

describe("generateRum", () => {
  it("derives a stable reference from the contract id, prefixed and without dashes", () => {
    const rum = generateRum("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    expect(rum.startsWith("LGBOX")).toBe(true);
    expect(rum).not.toContain("-");
    expect(rum.length).toBeLessThanOrEqual(35);
  });

  it("is deterministic for the same contract id", () => {
    const id = "11111111-2222-3333-4444-555555555555";
    expect(generateRum(id)).toBe(generateRum(id));
  });
});
