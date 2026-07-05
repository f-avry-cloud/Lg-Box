import { SendForSignatureButton } from "@/components/contracts/send-for-signature-button";
import { SignatureStatusBadge } from "@/components/status-badge";
import { DownloadDocumentButton } from "@/components/documents/download-button";
import { formatDateLong } from "@/lib/format";
import type { Contract, ContractSignature } from "@/types/database";

export function ContractSignatureSection({
  contract,
  latestSignature,
}: {
  contract: Contract;
  latestSignature: ContractSignature | null;
}) {
  const isSigned = contract.signature_status === "signe";
  const buttonLabel = contract.signature_status === "en_attente" ? "Renvoyer pour signature" : "Envoyer pour signature";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <SignatureStatusBadge status={contract.signature_status} />
        {isSigned && latestSignature?.signed_at && (
          <span className="text-sm text-muted-foreground">
            Signé le {formatDateLong(latestSignature.signed_at)} par {latestSignature.signer_full_name}
          </span>
        )}
        {contract.signature_status === "en_attente" && latestSignature && (
          <span className="text-sm text-muted-foreground">
            Lien envoyé, expire le {formatDateLong(latestSignature.token_expires_at)}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {!isSigned && <SendForSignatureButton contractId={contract.id} label={buttonLabel} />}
        {isSigned && latestSignature?.signed_document_path && (
          <DownloadDocumentButton
            bucket="contracts"
            path={latestSignature.signed_document_path}
            label="Télécharger le contrat signé (avec preuve)"
          />
        )}
      </div>
    </div>
  );
}
