import { Document } from "@react-pdf/renderer";

import { ContractPageContent } from "@/lib/pdf/contract-document";
import { SignatureProofPage, type SignatureProof } from "@/lib/pdf/signature-proof-page";
import type { CompanySettings, Contract, Customer, Unit } from "@/types/database";

export function CertifiedContractDocument({
  contract,
  customer,
  unit,
  company,
  proof,
}: {
  contract: Contract;
  customer: Customer;
  unit: Unit;
  company: CompanySettings;
  proof: Omit<SignatureProof, "documentLabel">;
}) {
  return (
    <Document>
      <ContractPageContent contract={contract} customer={customer} unit={unit} company={company} />
      <SignatureProofPage proof={{ ...proof, documentLabel: "Contrat de location" }} />
    </Document>
  );
}
