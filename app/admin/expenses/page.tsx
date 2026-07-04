import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExpenseCreateDialog } from "@/components/expenses/expense-create-dialog";
import { DeleteExpenseButton } from "@/components/expenses/delete-expense-button";
import { formatCurrency, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function ExpensesPage() {
  const supabase = await createClient();

  const { data: expenses } = await supabase
    .from("expenses")
    .select("*")
    .order("date_depense", { ascending: false });

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().slice(0, 10);
  const totalThisMonth = (expenses ?? [])
    .filter((e) => e.date_depense >= monthStart)
    .reduce((sum, e) => sum + e.montant, 0);
  const totalAll = (expenses ?? []).reduce((sum, e) => sum + e.montant, 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Dépenses</h1>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(totalThisMonth)} ce mois-ci · {formatCurrency(totalAll)} au total
          </p>
        </div>
        <ExpenseCreateDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(expenses ?? []).map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{formatDate(e.date_depense)}</TableCell>
                  <TableCell>{e.categorie}</TableCell>
                  <TableCell>{e.fournisseur ?? "—"}</TableCell>
                  <TableCell className="max-w-64 truncate text-muted-foreground">{e.description}</TableCell>
                  <TableCell>{formatCurrency(e.montant)}</TableCell>
                  <TableCell>
                    <DeleteExpenseButton expenseId={e.id} />
                  </TableCell>
                </TableRow>
              ))}
              {(!expenses || expenses.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Aucune dépense enregistrée.
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
