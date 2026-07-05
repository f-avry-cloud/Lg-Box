import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignatureForm } from "@/components/signature/signature-form";
import { isSignatureTokenValid } from "@/lib/business/contract-signature";
import { renderContractPlainText } from "@/lib/pdf/contract-template";
import { renderSepaMandatePlainText } from "@/lib/pdf/sepa-mandate-template";
import { DownloadDocumentButton } from "@/components/documents/download-button";
import { formatDateLong } from "@/lib/format";
import { createServiceClient } from "@/lib/supabase/server";

// Page publique, sans authentification : accédée via un lien à token envoyé
// par email. Toute la lecture passe par le service role (aucune policy RLS
// n'expose signature_requests à un visiteur anonyme).
export default async function SignaturePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const service = createServiceClient();

  const { data: request } = await service
    .from("signature_requests")
    .select("*")
    .eq("signature_token", token)
    .maybeSingle();

  if (!request) {
    return (
      <Message title="Lien invalide">
        Ce lien de signature n&apos;existe pas. Contactez-nous pour en recevoir un nouveau.
      </Message>
    );
  }

  const check = isSignatureTokenValid(request);
  if (!check.valid) {
    return (
      <Message title={check.reason === "used" ? "Documents déjà signés" : "Lien expiré"}>
        {check.reason === "used"
          ? "Ces documents ont déjà été signés avec ce lien."
          : "Ce lien de signature a expiré. Contactez-nous pour en recevoir un nouveau."}
      </Message>
    );
  }

  const { data: contract } = await service
    .from("contracts")
    .select("*")
    .eq("id", request.contract_id)
    .single();
  const { data: customer } = contract
    ? await service.from("customers").select("*").eq("id", contract.customer_id).single()
    : { data: null };
  const { data: unit } = contract
    ? await service.from("units").select("*").eq("id", contract.unit_id).single()
    : { data: null };
  const { data: company } = await service.from("company_settings").select("*").single();

  if (!contract || !customer || !unit || !company) {
    return <Message title="Documents introuvables">Impossible de charger vos documents. Contactez-nous.</Message>;
  }

  const contractText = request.includes_contract
    ? renderContractPlainText(contract, customer, unit, company)
    : null;
  const showMandateUpload = request.includes_sepa_mandate && company.mandat_sepa_template_mode === "upload";
  const mandateText =
    request.includes_sepa_mandate && company.mandat_sepa_template_mode === "integre"
      ? renderSepaMandatePlainText(contract, customer, company)
      : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold">Signature de vos documents</h1>
        <p className="text-sm text-muted-foreground">
          Lien valable jusqu&apos;au {formatDateLong(request.token_expires_at)}.
        </p>
      </div>

      {contractText && (
        <Card>
          <CardHeader>
            <CardTitle>Contrat à signer</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-line text-sm leading-relaxed">{contractText}</CardContent>
        </Card>
      )}

      {request.includes_sepa_mandate && (
        <Card>
          <CardHeader>
            <CardTitle>Mandat de prélèvement SEPA à signer</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm leading-relaxed">
            {showMandateUpload && company.mandat_sepa_upload_path && (
              <DownloadDocumentButton
                bucket="documents"
                path={company.mandat_sepa_upload_path}
                label="Télécharger le modèle de mandat SEPA"
              />
            )}
            <div className="rounded-md border border-border p-3">
              <p>
                <strong>RUM</strong> : {contract.rum} — <strong>ICS</strong> : {company.ics}
              </p>
              <p>
                <strong>IBAN</strong> : {contract.iban} — <strong>BIC</strong> : {contract.bic}
              </p>
            </div>
            {mandateText && <p className="whitespace-pre-line">{mandateText}</p>}
          </CardContent>
        </Card>
      )}

      <SignatureForm token={token} />
    </div>
  );
}

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-2 p-6 text-center">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
