import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ContractStatusBadge } from "@/components/status-badge";
import { ContractCreateDialog } from "@/components/contracts/contract-create-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function ContractsPage() {
  const supabase = await createClient();

  const { data: contracts } = await supabase
    .from("contracts")
    .select("*")
    .order("created_at", { ascending: false });
  const { data: customers } = await supabase.from("customers").select("*").order("nom");
  const { data: freeUnits } = await supabase
    .from("units")
    .select("*")
    .eq("statut", "libre")
    .order("numero");

  const customerIds = [...new Set((contracts ?? []).map((c) => c.customer_id))];
  const unitIds = [...new Set((contracts ?? []).map((c) => c.unit_id))];
  const { data: allCustomers } = customerIds.length
    ? await supabase.from("customers").select("id, prenom, nom").in("id", customerIds)
    : { data: [] };
  const { data: allUnits } = unitIds.length
    ? await supabase.from("units").select("id, numero").in("id", unitIds)
    : { data: [] };
  const customerById = new Map((allCustomers ?? []).map((c) => [c.id, c]));
  const unitById = new Map((allUnits ?? []).map((u) => [u.id, u]));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Contrats</h1>
          <p className="text-sm text-muted-foreground">{contracts?.length ?? 0} contrats.</p>
        </div>
        <ContractCreateDialog customers={customers ?? []} units={freeUnits ?? []} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Box</TableHead>
                <TableHead>Début</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(contracts ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/admin/contracts/${c.id}`} className="hover:text-primary">
                      {customerById.get(c.customer_id)?.prenom} {customerById.get(c.customer_id)?.nom}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono">{unitById.get(c.unit_id)?.numero}</TableCell>
                  <TableCell>{formatDate(c.date_debut)}</TableCell>
                  <TableCell>{c.date_fin ? formatDate(c.date_fin) : "—"}</TableCell>
                  <TableCell>{formatCurrency(c.prix_mensuel)}</TableCell>
                  <TableCell>
                    <ContractStatusBadge status={c.statut} />
                  </TableCell>
                </TableRow>
              ))}
              {(!contracts || contracts.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Aucun contrat.
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
