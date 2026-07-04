import { describe, expect, it } from "vitest";

import { canTransitionContract, unitStatusForContractStatus } from "@/lib/business/contract-status";
import type { ContractStatus } from "@/types/database";

describe("canTransitionContract", () => {
  it("allows a draft contract to be activated or cancelled", () => {
    expect(canTransitionContract("brouillon", "actif")).toBe(true);
    expect(canTransitionContract("brouillon", "resilie")).toBe(true);
  });

  it("allows an active contract to move to notice or be terminated", () => {
    expect(canTransitionContract("actif", "en_preavis")).toBe(true);
    expect(canTransitionContract("actif", "resilie")).toBe(true);
  });

  it("allows a notice-period contract to be reactivated or terminated", () => {
    expect(canTransitionContract("en_preavis", "actif")).toBe(true);
    expect(canTransitionContract("en_preavis", "resilie")).toBe(true);
  });

  it("rejects terminating a terminated contract further", () => {
    const anyStatus: ContractStatus[] = ["brouillon", "actif", "en_preavis"];
    anyStatus.forEach((status) => {
      expect(canTransitionContract("resilie", status)).toBe(false);
    });
  });

  it("rejects skipping straight from draft back to itself being treated as no-op", () => {
    expect(canTransitionContract("brouillon", "brouillon")).toBe(true);
  });

  it("rejects an invalid jump from draft to notice period", () => {
    expect(canTransitionContract("brouillon", "en_preavis")).toBe(false);
  });
});

describe("unitStatusForContractStatus", () => {
  it("maps each contract status to the expected unit status", () => {
    expect(unitStatusForContractStatus("brouillon")).toBe("reserve");
    expect(unitStatusForContractStatus("actif")).toBe("loue");
    expect(unitStatusForContractStatus("en_preavis")).toBe("loue");
    expect(unitStatusForContractStatus("resilie")).toBe("libre");
  });
});
