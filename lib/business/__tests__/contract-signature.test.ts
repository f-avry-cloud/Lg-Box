import { describe, expect, it } from "vitest";

import { isSignatureTokenValid } from "@/lib/business/contract-signature";

describe("isSignatureTokenValid", () => {
  const now = new Date(Date.UTC(2026, 5, 15, 12, 0, 0));

  it("accepts a token that is neither used nor expired", () => {
    const result = isSignatureTokenValid(
      { token_expires_at: new Date(Date.UTC(2026, 5, 20)).toISOString(), token_used_at: null },
      now
    );
    expect(result.valid).toBe(true);
  });

  it("rejects a token that has already been used, even if not expired", () => {
    const result = isSignatureTokenValid(
      {
        token_expires_at: new Date(Date.UTC(2026, 5, 20)).toISOString(),
        token_used_at: new Date(Date.UTC(2026, 5, 14)).toISOString(),
      },
      now
    );
    expect(result).toEqual({ valid: false, reason: "used" });
  });

  it("rejects a token past its expiration date", () => {
    const result = isSignatureTokenValid(
      { token_expires_at: new Date(Date.UTC(2026, 5, 10)).toISOString(), token_used_at: null },
      now
    );
    expect(result).toEqual({ valid: false, reason: "expired" });
  });

  it("treats the exact expiration instant as still valid (expiry is a strict 'before now' check)", () => {
    const result = isSignatureTokenValid(
      { token_expires_at: now.toISOString(), token_used_at: null },
      now
    );
    expect(result.valid).toBe(true);
  });

  it("rejects one millisecond after the expiration instant", () => {
    const result = isSignatureTokenValid(
      { token_expires_at: now.toISOString(), token_used_at: null },
      new Date(now.getTime() + 1)
    );
    expect(result).toEqual({ valid: false, reason: "expired" });
  });

  it("prioritizes 'used' over 'expired' when both conditions are true", () => {
    const result = isSignatureTokenValid(
      {
        token_expires_at: new Date(Date.UTC(2026, 5, 1)).toISOString(),
        token_used_at: new Date(Date.UTC(2026, 5, 2)).toISOString(),
      },
      now
    );
    expect(result).toEqual({ valid: false, reason: "used" });
  });
});
