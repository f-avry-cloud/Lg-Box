import { Document } from "@react-pdf/renderer";

import { ContractPageContent } from "@/lib/pdf/contract-document";
import { SignatureProofPage, type SignatureProof } from "@/lib/pdf/signature-proof-page";
import type { CompanySignatureImage } from "@/lib/pdf/company-signature";
import type { CompanySettings, Contract, Customer, Unit } from "@/types/database";

export function CertifiedContractDocument({
  contract,
  customer,
  unit,
  company,
  signatureImage,
  proof,
}: {
  contract: Contract;
  customer: Customer;
  unit: Unit;
  company: CompanySettings;
  signatureImage?: CompanySignatureImage | null;
  proof: Omit<SignatureProof, "documentLabel">;
}) {
  return (
    <Document>
      <ContractPageContent
        contract={contract}
        customer={customer}
        unit={unit}
        company={company}
        signatureImage={signatureImage}
        tenantSignature={{ fullName: proof.signerFullName, signedAt: proof.signedAt }}
      />
      <SignatureProofPage proof={{ ...proof, documentLabel: "Contrat de location" }} />
    </Document>
  );
}
