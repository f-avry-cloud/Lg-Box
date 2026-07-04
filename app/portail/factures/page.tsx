import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/components/status-badge";
import { DownloadDocumentButton } from "@/components/documents/download-button";
import { formatCurrency, formatDate } from "@/lib/format";
import { requireTenantCustomerId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function PortailFacturesPage() {
  const customerId = await requireTenantCustomerId();
  const supabase = await createClient();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("customer_id", customerId)
    .order("date_emission", { ascending: false });

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Mes factures</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Montant TTC</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(invoices ?? []).map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono">{i.numero_facture}</TableCell>
                  <TableCell>
                    {formatDate(i.periode_debut)} → {formatDate(i.periode_fin)}
                  </TableCell>
                  <TableCell>{formatCurrency(i.montant_ttc)}</TableCell>
                  <TableCell>{formatDate(i.date_echeance)}</TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={i.statut} />
                  </TableCell>
                  <TableCell>
                    {i.facture_pdf_url && <DownloadDocumentButton bucket="invoices" path={i.facture_pdf_url} label="PDF" />}
                  </TableCell>
                </TableRow>
              ))}
              {(!invoices || invoices.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Aucune facture pour le moment.
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
