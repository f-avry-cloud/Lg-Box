import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignatureForm } from "@/components/signature/signature-form";
import { isSignatureTokenValid } from "@/lib/business/contract-signature";
import { renderContractPlainText } from "@/lib/pdf/contract-template";
import { formatDateLong } from "@/lib/format";
import { createServiceClient } from "@/lib/supabase/server";

// Page publique, sans authentification : accédée via un lien à token envoyé
// par email. Toute la lecture passe par le service role (aucune policy RLS
// n'expose contract_signatures à un visiteur anonyme).
export default async function SignaturePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const service = createServiceClient();

  const { data: signature } = await service
    .from("contract_signatures")
    .select("*")
    .eq("signature_token", token)
    .maybeSingle();

  if (!signature) {
    return (
      <Message title="Lien invalide">
        Ce lien de signature n&apos;existe pas. Contactez-nous pour en recevoir un nouveau.
      </Message>
    );
  }

  const check = isSignatureTokenValid(signature);
  if (!check.valid) {
    return (
      <Message title={check.reason === "used" ? "Contrat déjà signé" : "Lien expiré"}>
        {check.reason === "used"
          ? "Ce contrat a déjà été signé avec ce lien."
          : "Ce lien de signature a expiré. Contactez-nous pour en recevoir un nouveau."}
      </Message>
    );
  }

  const { data: contract } = await service
    .from("contracts")
    .select("*")
    .eq("id", signature.contract_id)
    .single();
  const { data: customer } = contract
    ? await service.from("customers").select("*").eq("id", contract.customer_id).single()
    : { data: null };
  const { data: unit } = contract
    ? await service.from("units").select("*").eq("id", contract.unit_id).single()
    : { data: null };
  const { data: company } = await service.from("company_settings").select("*").single();

  if (!contract || !customer || !unit || !company) {
    return <Message title="Contrat introuvable">Impossible de charger ce contrat. Contactez-nous.</Message>;
  }

  const documentText = renderContractPlainText(contract, customer, unit, company);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold">Signature de votre contrat</h1>
        <p className="text-sm text-muted-foreground">
          Lien valable jusqu&apos;au {formatDateLong(signature.token_expires_at)}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contrat à signer</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-line text-sm leading-relaxed">{documentText}</CardContent>
      </Card>

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
