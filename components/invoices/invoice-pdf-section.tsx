"use client";

import { GeneratePdfButton } from "@/components/documents/generate-pdf-button";
import { DownloadDocumentButton } from "@/components/documents/download-button";
import { generateInvoicePdf } from "@/lib/actions/invoices";

export function InvoicePdfSection({ invoiceId, pdfPath }: { invoiceId: string; pdfPath: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <GeneratePdfButton
        action={() => generateInvoicePdf(invoiceId)}
        label={pdfPath ? "Régénérer le PDF" : "Générer le PDF"}
      />
      {pdfPath && <DownloadDocumentButton bucket="invoices" path={pdfPath} />}
    </div>
  );
}
