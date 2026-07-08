import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ContractStatusBadge,
  SecurityDepositStatusBadge,
  SepaMandateStatusBadge,
  SignatureStatusBadge,
} from "@/components/status-badge";
import { PaymentButton } from "@/components/portal/payment-button";
import { DownloadDocumentButton } from "@/components/documents/download-button";
import { formatCurrency, formatDate } from "@/lib/format";
import { getTenantCustomerId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function PortailHomePage() {
  const customerId = await getTenantCustomerId();
  // Le layout (app/portail/layout.tsx) affiche déjà le message adapté et
  // n'aura pas rendu {children} si customerId est null — rien à faire ici.
  if (!customerId) return null;
  const supabase = await createClient();

  const { data: contract } = await supabase
    .from("contracts")
    .select("*")
    .eq("customer_id", customerId)
    .in("statut", ["actif", "en_preavis"])
    .order("date_debut", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: unpaidInvoices } = await supabase
    .from("invoices")
    .select("montant_ttc")
    .eq("customer_id", customerId)
    .in("statut", ["emise", "en_retard"]);
  const solde = (unpaidInvoices ?? []).reduce((sum, i) => sum + i.montant_ttc, 0);

  if (!contract) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mon contrat</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Aucun contrat actif n&apos;est associé à votre compte. Contactez-nous si vous pensez qu&apos;il
          s&apos;agit d&apos;une erreur.
        </CardContent>
      </Card>
    );
  }

  const { data: unit } = await supabase.from("units").select("*").eq("id", contract.unit_id).single();
  const { data: latestRequest } = await supabase
    .from("signature_requests")
    .select("*")
    .eq("contract_id", contract.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: signedDocuments } = latestRequest
    ? await supabase.from("signed_documents").select("*").eq("signature_request_id", latestRequest.id)
    : { data: [] };
  const contractDoc = (signedDocuments ?? []).find((d) => d.document_type === "contrat");
  const mandateDoc = (signedDocuments ?? []).find((d) => d.document_type === "mandat_sepa");
  const { data: deposit } = await supabase
    .from("security_deposits")
    .select("*")
    .eq("contract_id", contract.id)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Mon contrat</CardTitle>
          <ContractStatusBadge status={contract.statut} />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <Info label="Box" value={`${unit?.numero} — ${unit?.taille_libelle}`} />
          <Info label="Loyer mensuel" value={formatCurrency(contract.prix_mensuel)} />
          <Info label="Date de début" value={formatDate(contract.date_debut)} />
          <Info label="Date de fin" value={contract.date_fin ? formatDate(contract.date_fin) : "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Signature du contrat</CardTitle>
          <SignatureStatusBadge status={contract.signature_status} />
        </CardHeader>
        <CardContent className="flex items-center justify-between text-sm">
          {contract.signature_status === "signe" && contractDoc ? (
            <>
              <p className="text-muted-foreground">Signé le {formatDate(latestRequest?.signed_at ?? "")}</p>
              <DownloadDocumentButton
                bucket="contracts"
                path={contractDoc.signed_document_path}
                label="Télécharger le contrat signé"
              />
            </>
          ) : (
            <p className="text-muted-foreground">
              {contract.signature_status === "en_attente"
                ? "Vous avez reçu un email avec un lien pour signer votre contrat."
                : "Aucune signature n'est requise pour le moment."}
            </p>
          )}
        </CardContent>
      </Card>

      {contract.sepa_mandate_status !== "non_requis" && (
        <Card>
          <CardHeader>
            <CardTitle>Mandat de prélèvement SEPA</CardTitle>
            <SepaMandateStatusBadge status={contract.sepa_mandate_status} />
          </CardHeader>
          <CardContent className="flex items-center justify-between text-sm">
            {contract.sepa_mandate_status === "signe" && mandateDoc ? (
              <>
                <p className="text-muted-foreground">Signé le {formatDate(latestRequest?.signed_at ?? "")}</p>
                <DownloadDocumentButton
                  bucket="contracts"
                  path={mandateDoc.signed_document_path}
                  label="Télécharger le mandat signé"
                />
              </>
            ) : (
              <p className="text-muted-foreground">Vous avez reçu un email avec un lien pour signer votre mandat.</p>
            )}
          </CardContent>
        </Card>
      )}

      {deposit && deposit.status !== "non_demande" && (
        <Card>
          <CardHeader>
            <CardTitle>Dépôt de garantie</CardTitle>
            <SecurityDepositStatusBadge status={deposit.status} />
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <Info label="Montant reçu" value={deposit.amount_received ? formatCurrency(deposit.amount_received) : "—"} />
            <Info label="Montant restitué" value={deposit.amount_refunded ? formatCurrency(deposit.amount_refunded) : "—"} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Mon solde</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className={`text-xl font-semibold ${solde > 0 ? "text-destructive" : "text-success"}`}>
              {formatCurrency(solde)}
            </p>
            <p className="text-xs text-muted-foreground">
              {solde > 0 ? "Merci de régulariser par virement, chèque ou espèces." : "Tout est à jour, merci !"}
            </p>
          </div>
          {solde > 0 && <PaymentButton />}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p>{value}</p>
    </div>
  );
}
