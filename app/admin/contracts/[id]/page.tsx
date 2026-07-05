import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ContractStatusBadge, InvoiceStatusBadge } from "@/components/status-badge";
import { ContractStatusActions } from "@/components/contracts/contract-status-actions";
import { ContractPdfSection } from "@/components/contracts/contract-pdf-section";
import { ContractSignatureSection } from "@/components/contracts/contract-signature-section";
import { SecurityDepositForm } from "@/components/contracts/security-deposit-form";
import { SecurityDepositRefundForm } from "@/components/contracts/security-deposit-refund-form";
import { formatCurrency, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contract } = await supabase.from("contracts").select("*").eq("id", id).single();
  if (!contract) notFound();

  const [{ data: customer }, { data: unit }, { data: invoices }, { data: latestSignature }, { data: deposit }] =
    await Promise.all([
      supabase.from("customers").select("*").eq("id", contract.customer_id).single(),
      supabase.from("units").select("*").eq("id", contract.unit_id).single(),
      supabase.from("invoices").select("*").eq("contract_id", id).order("date_emission", { ascending: false }),
      supabase
        .from("contract_signatures")
        .select("*")
        .eq("contract_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("security_deposits").select("*").eq("contract_id", id).maybeSingle(),
    ]);

  const canRefundDeposit =
    contract.statut === "resilie" &&
    deposit &&
    Boolean(deposit.amount_received) &&
    deposit.status !== "rembourse" &&
    deposit.status !== "non_demande";

  return (
    <div>
      <Link
        href="/admin/contracts"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Retour aux contrats
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">
            Contrat — {customer?.prenom} {customer?.nom}
          </h1>
          <p className="text-sm text-muted-foreground">
            Box {unit?.numero} · {formatCurrency(contract.prix_mensuel)}/mois
          </p>
        </div>
        <ContractStatusBadge status={contract.statut} />
      </div>

      <div className="mb-4">
        <ContractStatusActions contract={contract} />
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Détails</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <Info label="Date de début" value={formatDate(contract.date_debut)} />
          <Info label="Date de fin" value={contract.date_fin ? formatDate(contract.date_fin) : "—"} />
          <Info label="Dépôt de garantie" value={formatCurrency(contract.depot_garantie)} />
          <Info label="Jour de prélèvement" value={String(contract.jour_prelevement_mensuel)} />
          <Info label="Préavis" value={`${contract.preavis_jours} jours`} />
          <Info label="Motif de résiliation" value={contract.motif_resiliation ?? "—"} />
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Contrat signé (PDF)</CardTitle>
        </CardHeader>
        <CardContent>
          <ContractPdfSection contractId={contract.id} pdfPath={contract.contrat_pdf_url} />
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Signature électronique</CardTitle>
        </CardHeader>
        <CardContent>
          <ContractSignatureSection contract={contract} latestSignature={latestSignature ?? null} />
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Dépôt de garantie</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SecurityDepositForm contractId={contract.id} customerId={contract.customer_id} deposit={deposit ?? null} />
          {canRefundDeposit && deposit && <SecurityDepositRefundForm deposit={deposit} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Factures liées</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Montant TTC</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(invoices ?? []).map((i) => (
                <TableRow key={i.id}>
                  <TableCell>
                    <Link href={`/admin/invoices/${i.id}`} className="font-mono hover:text-primary">
                      {i.numero_facture}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {formatDate(i.periode_debut)} → {formatDate(i.periode_fin)}
                  </TableCell>
                  <TableCell>{formatCurrency(i.montant_ttc)}</TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={i.statut} />
                  </TableCell>
                </TableRow>
              ))}
              {(!invoices || invoices.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Aucune facture pour ce contrat.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
