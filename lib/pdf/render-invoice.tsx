import type { SupabaseClient } from "@supabase/supabase-js";

import { renderPdfBuffer } from "@/lib/pdf/generate";
import { InvoiceDocument } from "@/lib/pdf/invoice-document";
import type { CompanySettings, Customer, Database, Invoice } from "@/types/database";

// Réutilisé par la génération à la demande (fiche facture) et par l'export
// groupé (ZIP) — régénère le PDF seulement s'il n'existe pas déjà en stockage.
export async function ensureInvoicePdf(
  service: SupabaseClient<Database>,
  invoice: Invoice,
  customer: Customer,
  company: CompanySettings
): Promise<{ path: string; buffer: Buffer }> {
  if (invoice.facture_pdf_url) {
    const { data, error } = await service.storage.from("invoices").download(invoice.facture_pdf_url);
    if (!error && data) {
      return { path: invoice.facture_pdf_url, buffer: Buffer.from(await data.arrayBuffer()) };
    }
  }

  const buffer = await renderPdfBuffer(
    <InvoiceDocument invoice={invoice} customer={customer} company={company} />
  );
  const path = `${customer.id}/${invoice.id}.pdf`;
  await service.storage.from("invoices").upload(path, buffer, { contentType: "application/pdf", upsert: true });
  await service.from("invoices").update({ facture_pdf_url: path }).eq("id", invoice.id);
  return { path, buffer };
}
