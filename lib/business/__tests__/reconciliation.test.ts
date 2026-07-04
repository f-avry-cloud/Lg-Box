import { describe, expect, it } from "vitest";

import { suggestInvoiceMatch } from "@/lib/business/reconciliation";

type Invoice = { id: string; montant_ttc: number; date_echeance: string };

describe("suggestInvoiceMatch", () => {
  it("returns null when no invoice matches the amount", () => {
    const invoices: Invoice[] = [{ id: "1", montant_ttc: 100, date_echeance: "2026-01-15" }];
    expect(suggestInvoiceMatch({ montant: 50, date_operation: "2026-01-10" }, invoices)).toBeNull();
  });

  it("matches a single invoice with the same amount", () => {
    const invoices: Invoice[] = [{ id: "1", montant_ttc: 119, date_echeance: "2026-01-15" }];
    const result = suggestInvoiceMatch({ montant: 119, date_operation: "2026-01-10" }, invoices);
    expect(result?.id).toBe("1");
  });

  it("tolerates small floating point rounding differences", () => {
    const invoices: Invoice[] = [{ id: "1", montant_ttc: 119.0, date_echeance: "2026-01-15" }];
    const result = suggestInvoiceMatch({ montant: 118.999, date_operation: "2026-01-10" }, invoices);
    expect(result?.id).toBe("1");
  });

  it("picks the invoice with the closest due date when several share the same amount", () => {
    const invoices: Invoice[] = [
      { id: "far", montant_ttc: 119, date_echeance: "2026-03-15" },
      { id: "close", montant_ttc: 119, date_echeance: "2026-01-16" },
    ];
    const result = suggestInvoiceMatch({ montant: 119, date_operation: "2026-01-10" }, invoices);
    expect(result?.id).toBe("close");
  });
});
