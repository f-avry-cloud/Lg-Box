import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CsvImportDialog } from "@/components/bank/csv-import-dialog";
import { ReconcileRow } from "@/components/bank/reconcile-row";
import { formatCurrency, formatDate } from "@/lib/format";
import { suggestInvoiceMatch } from "@/lib/business/reconciliation";
import { createClient } from "@/lib/supabase/server";

export default async function BankReconciliationPage() {
  const supabase = await createClient();

  const [{ data: pending }, { data: resolved }, { data: unpaidInvoices }, { data: expenses }] =
    await Promise.all([
      supabase
        .from("bank_transactions")
        .select("*")
        .eq("statut", "non_rapproche")
        .order("date_operation", { ascending: false }),
      supabase
        .from("bank_transactions")
        .select("*")
        .neq("statut", "non_rapproche")
        .order("date_operation", { ascending: false })
        .limit(50),
      supabase.from("invoices").select("*").in("statut", ["emise", "en_retard"]),
      supabase.from("expenses").select("*").order("date_depense", { ascending: false }).limit(100),
    ]);

  const customerIds = [...new Set((unpaidInvoices ?? []).map((i) => i.customer_id))];
  const { data: customers } = customerIds.length
    ? await supabase.from("customers").select("id, prenom, nom").in("id", customerIds)
    : { data: [] };
  const customerById = new Map((customers ?? []).map((c) => [c.id, c]));

  const invoiceOptions = (unpaidInvoices ?? []).map((i) => ({
    id: i.id,
    label: `${i.numero_facture} — ${customerById.get(i.customer_id)?.prenom ?? ""} ${
      customerById.get(i.customer_id)?.nom ?? ""
    } — ${formatCurrency(i.montant_ttc)}`,
  }));

  const expenseOptions = (expenses ?? []).map((e) => ({
    id: e.id,
    label: `${formatDate(e.date_depense)} — ${e.categorie} — ${formatCurrency(e.montant)}`,
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Rapprochement bancaire</h1>
          <p className="text-sm text-muted-foreground">
            Importez un relevé CSV. Les entrées (montant positif) se rapprochent d&apos;une facture ;
            les sorties (montant négatif, en rouge) se rapprochent d&apos;une dépense existante ou en
            créent une nouvelle en un clic.
          </p>
        </div>
        <CsvImportDialog />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>À traiter ({pending?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Facture ou dépense correspondante</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(pending ?? []).map((t) => {
                const suggestion = suggestInvoiceMatch(t, unpaidInvoices ?? []);
                return (
                  <ReconcileRow
                    key={t.id}
                    transaction={t}
                    invoiceOptions={invoiceOptions}
                    expenseOptions={expenseOptions}
                    suggestedInvoiceId={suggestion?.id ?? null}
                  />
                );
              })}
              {(!pending || pending.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Aucune opération en attente de rapprochement.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique récent</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(resolved ?? []).map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{formatDate(t.date_operation)}</TableCell>
                  <TableCell className="max-w-64 truncate">{t.libelle}</TableCell>
                  <TableCell>{formatCurrency(t.montant)}</TableCell>
                  <TableCell className="capitalize">
                    {t.statut === "rapproche" ? "Rapproché" : "Ignoré"}
                  </TableCell>
                </TableRow>
              ))}
              {(!resolved || resolved.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Aucun historique pour le moment.
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
