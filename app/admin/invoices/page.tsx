import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/components/status-badge";
import { InvoiceCreateDialog } from "@/components/invoices/invoice-create-dialog";
import { BulkInvoiceButton } from "@/components/invoices/bulk-invoice-button";
import { BulkReminderButton } from "@/components/invoices/bulk-reminder-button";
import { MarkPaidDialog } from "@/components/invoices/mark-paid-dialog";
import { SendReminderButton } from "@/components/invoices/send-reminder-button";
import { formatCurrency, formatDate } from "@/lib/format";
import { daysUntil } from "@/lib/business/notice";
import { createClient } from "@/lib/supabase/server";

export default async function InvoicesPage() {
  const supabase = await createClient();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .order("date_emission", { ascending: false });

  const { data: activeContracts } = await supabase
    .from("contracts")
    .select("id, customer_id, unit_id, prix_mensuel")
    .in("statut", ["actif", "en_preavis"]);

  const customerIds = [...new Set((invoices ?? []).map((i) => i.customer_id))];
  const { data: customers } = customerIds.length
    ? await supabase.from("customers").select("id, prenom, nom").in("id", customerIds)
    : { data: [] };
  const customerById = new Map((customers ?? []).map((c) => [c.id, c]));

  const contractCustomerIds = [...new Set((activeContracts ?? []).map((c) => c.customer_id))];
  const contractUnitIds = [...new Set((activeContracts ?? []).map((c) => c.unit_id))];
  const { data: contractCustomers } = contractCustomerIds.length
    ? await supabase.from("customers").select("id, prenom, nom").in("id", contractCustomerIds)
    : { data: [] };
  const { data: contractUnits } = contractUnitIds.length
    ? await supabase.from("units").select("id, numero").in("id", contractUnitIds)
    : { data: [] };
  const contractCustomerById = new Map((contractCustomers ?? []).map((c) => [c.id, c]));
  const contractUnitById = new Map((contractUnits ?? []).map((u) => [u.id, u]));

  const contractOptions = (activeContracts ?? []).map((c) => ({
    id: c.id,
    label: `${contractCustomerById.get(c.customer_id)?.prenom ?? ""} ${
      contractCustomerById.get(c.customer_id)?.nom ?? ""
    } — Box ${contractUnitById.get(c.unit_id)?.numero ?? ""} (${formatCurrency(c.prix_mensuel)})`,
  }));

  const unpaid = (invoices ?? [])
    .filter((i) => i.statut === "emise" || i.statut === "en_retard")
    .map((i) => ({ ...i, daysLate: -daysUntil(new Date(i.date_echeance)) }))
    .sort((a, b) => b.daysLate - a.daysLate);

  const balanceByCustomer = new Map<string, number>();
  unpaid.forEach((i) => {
    balanceByCustomer.set(i.customer_id, (balanceByCustomer.get(i.customer_id) ?? 0) + i.montant_ttc);
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Facturation</h1>
          <p className="text-sm text-muted-foreground">{invoices?.length ?? 0} factures au total.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BulkInvoiceButton />
          <BulkReminderButton unpaidCount={unpaid.length} />
          <InvoiceCreateDialog contracts={contractOptions} />
        </div>
      </div>

      <Tabs defaultValue="impayees">
        <TabsList className="mb-4">
          <TabsTrigger value="impayees">Impayées ({unpaid.length})</TabsTrigger>
          <TabsTrigger value="toutes">Toutes</TabsTrigger>
        </TabsList>

        <TabsContent value="impayees">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numéro</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Solde client</TableHead>
                    <TableHead>Échéance</TableHead>
                    <TableHead>Retard</TableHead>
                    <TableHead>Montant TTC</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unpaid.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>
                        <Link href={`/admin/invoices/${i.id}`} className="font-mono hover:text-primary">
                          {i.numero_facture}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/customers/${i.customer_id}`} className="hover:text-primary">
                          {customerById.get(i.customer_id)?.prenom} {customerById.get(i.customer_id)?.nom}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatCurrency(balanceByCustomer.get(i.customer_id) ?? 0)}
                      </TableCell>
                      <TableCell>{formatDate(i.date_echeance)}</TableCell>
                      <TableCell>{i.daysLate > 0 ? `${i.daysLate} j` : "—"}</TableCell>
                      <TableCell>{formatCurrency(i.montant_ttc)}</TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={i.statut} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <SendReminderButton invoiceId={i.id} />
                          <MarkPaidDialog invoiceId={i.id} montantTtc={i.montant_ttc} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {unpaid.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        Aucune facture impayée. 🎉
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="toutes">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numéro</TableHead>
                    <TableHead>Client</TableHead>
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
                        {customerById.get(i.customer_id)?.prenom} {customerById.get(i.customer_id)?.nom}
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
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
