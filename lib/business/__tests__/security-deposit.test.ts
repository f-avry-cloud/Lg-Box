import { describe, expect, it } from "vitest";

import { computeDepositStatusAfterRefund, validateRefund } from "@/lib/business/security-deposit";

describe("computeDepositStatusAfterRefund", () => {
  it("marks a full refund as rembourse", () => {
    expect(computeDepositStatusAfterRefund(300, 300)).toBe("rembourse");
  });

  it("marks a partial refund as partiellement_rembourse", () => {
    expect(computeDepositStatusAfterRefund(300, 120)).toBe("partiellement_rembourse");
  });

  it("marks a zero refund as retenu", () => {
    expect(computeDepositStatusAfterRefund(300, 0)).toBe("retenu");
  });

  it("treats a refund exceeding the amount received the same as a full refund", () => {
    expect(computeDepositStatusAfterRefund(300, 350)).toBe("rembourse");
  });
});

describe("validateRefund", () => {
  it("accepts a full refund without a reason", () => {
    const result = validateRefund({ amountReceived: 300, amountRefunded: 300, reason: "" });
    expect(result.valid).toBe(true);
  });

  it("rejects a negative refund amount", () => {
    const result = validateRefund({ amountReceived: 300, amountRefunded: -10, reason: "" });
    expect(result).toEqual({ valid: false, error: "Le montant restitué ne peut pas être négatif." });
  });

  it("rejects a refund amount greater than what was received", () => {
    const result = validateRefund({ amountReceived: 300, amountRefunded: 400, reason: "" });
    expect(result).toEqual({
      valid: false,
      error: "Le montant restitué ne peut pas dépasser le montant reçu.",
    });
  });

  it("requires a reason when withholding part of the deposit", () => {
    const result = validateRefund({ amountReceived: 300, amountRefunded: 100, reason: "   " });
    expect(result).toEqual({
      valid: false,
      error: "Un motif est requis lorsque le montant restitué est inférieur au montant reçu.",
    });
  });

  it("accepts a partial refund once a reason is provided", () => {
    const result = validateRefund({
      amountReceived: 300,
      amountRefunded: 100,
      reason: "Loyer impayé du dernier mois",
    });
    expect(result.valid).toBe(true);
  });
});
