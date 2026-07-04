"use client";

import { GeneratePdfButton } from "@/components/documents/generate-pdf-button";
import { DownloadDocumentButton } from "@/components/documents/download-button";
import { generateContractPdf } from "@/lib/actions/contracts";

export function ContractPdfSection({
  contractId,
  pdfPath,
}: {
  contractId: string;
  pdfPath: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <GeneratePdfButton
        action={() => generateContractPdf(contractId)}
        label={pdfPath ? "Régénérer le PDF" : "Générer le PDF"}
      />
      {pdfPath && <DownloadDocumentButton bucket="contracts" path={pdfPath} />}
    </div>
  );
}
