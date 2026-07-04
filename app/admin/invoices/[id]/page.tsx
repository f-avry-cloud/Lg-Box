import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InvoiceStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { InvoicePdfSection } from "@/components/invoices/invoice-pdf-section";
import { MarkPaidDialog } from "@/components/invoices/mark-paid-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice } = await supabase.from("invoices").select("*").eq("id", id).single();
  if (!invoice) notFound();

  const [{ data: customer }, { data: payments }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", invoice.customer_id).single(),
    supabase.from("payments").select("*").eq("invoice_id", id).order("date_paiement", { ascending: false }),
  ]);

  const isPayable = invoice.statut === "emise" || invoice.statut === "en_retard";

  return (
    <div>
      <Link
        href="/admin/invoices"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Retour aux factures
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-mono text-lg font-semibold">{invoice.numero_facture}</h1>
          <p className="text-sm text-muted-foreground">
            {customer?.prenom} {customer?.nom} · {formatCurrency(invoice.montant_ttc)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <InvoiceStatusBadge status={invoice.statut} />
          {isPayable && <MarkPaidDialog invoiceId={invoice.id} montantTtc={invoice.montant_ttc} />}
        </div>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Détails</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <Info label="Période" value={`${formatDate(invoice.periode_debut)} → ${formatDate(invoice.periode_fin)}`} />
          <Info label="Émise le" value={formatDate(invoice.date_emission)} />
          <Info label="Échéance" value={formatDate(invoice.date_echeance)} />
          <Info label="Montant HT" value={formatCurrency(invoice.montant_ht)} />
          <Info label="TVA" value={formatCurrency(invoice.tva)} />
          <Info label="Montant TTC" value={formatCurrency(invoice.montant_ttc)} />
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Facture PDF</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoicePdfSection invoiceId={invoice.id} pdfPath={invoice.facture_pdf_url} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paiements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(payments ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{formatDate(p.date_paiement)}</TableCell>
                  <TableCell>{formatCurrency(p.montant)}</TableCell>
                  <TableCell className="capitalize">{p.methode}</TableCell>
                  <TableCell>{p.reference}</TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={p.statut} />
                  </TableCell>
                </TableRow>
              ))}
              {(!payments || payments.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Aucun paiement enregistré.
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
