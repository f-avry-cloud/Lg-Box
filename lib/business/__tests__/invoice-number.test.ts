import { describe, expect, it } from "vitest";

import { nextInvoiceNumber } from "@/lib/business/invoice-number";

describe("nextInvoiceNumber", () => {
  it("starts the sequence at 1 when there are no existing invoices", () => {
    const numero = nextInvoiceNumber([], new Date(Date.UTC(2026, 0, 1)));
    expect(numero).toBe("FA-2026-00001");
  });

  it("increments from the highest existing sequence, regardless of order", () => {
    const numero = nextInvoiceNumber(
      ["FA-2025-00001", "FA-2025-00003", "FA-2025-00002"],
      new Date(Date.UTC(2025, 5, 1))
    );
    expect(numero).toBe("FA-2025-00004");
  });

  it("never resets or duplicates the sequence across a year boundary", () => {
    const numero = nextInvoiceNumber(["FA-2025-00047"], new Date(Date.UTC(2026, 0, 1)));
    expect(numero).toBe("FA-2026-00048");
  });

  it("ignores malformed numbers instead of throwing", () => {
    const numero = nextInvoiceNumber(["not-a-number", "FA-2025-00005"], new Date(Date.UTC(2025, 5, 1)));
    expect(numero).toBe("FA-2025-00006");
  });
});
