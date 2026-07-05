import { SendForSignatureButton } from "@/components/contracts/send-for-signature-button";
import { SignatureStatusBadge, SepaMandateStatusBadge } from "@/components/status-badge";
import { DownloadDocumentButton } from "@/components/documents/download-button";
import { formatDateLong } from "@/lib/format";
import type { Contract, SignatureRequest, SignedDocument } from "@/types/database";

export function ContractSignatureSection({
  contract,
  latestRequest,
  signedDocuments,
}: {
  contract: Contract;
  latestRequest: SignatureRequest | null;
  signedDocuments: SignedDocument[];
}) {
  const contractDoc = signedDocuments.find((d) => d.document_type === "contrat");
  const mandateDoc = signedDocuments.find((d) => d.document_type === "mandat_sepa");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="w-28 text-xs uppercase tracking-wide text-muted-foreground">Contrat</span>
          <SignatureStatusBadge status={contract.signature_status} />
          {contract.signature_status === "signe" && contractDoc && (
            <DownloadDocumentButton bucket="contracts" path={contractDoc.signed_document_path} label="Télécharger (avec preuve)" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-28 text-xs uppercase tracking-wide text-muted-foreground">Mandat SEPA</span>
          <SepaMandateStatusBadge status={contract.sepa_mandate_status} />
          {contract.sepa_mandate_status === "signe" && mandateDoc && (
            <DownloadDocumentButton bucket="contracts" path={mandateDoc.signed_document_path} label="Télécharger (avec preuve)" />
          )}
        </div>
        {latestRequest && !latestRequest.token_used_at && (
          <p className="text-sm text-muted-foreground">
            Lien envoyé, expire le {formatDateLong(latestRequest.token_expires_at)}
          </p>
        )}
      </div>

      {(contract.signature_status !== "signe" || contract.sepa_mandate_status !== "signe") && (
        <SendForSignatureButton contract={contract} />
      )}
    </div>
  );
}
