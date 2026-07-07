import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExpenseCreateDialog } from "@/components/expenses/expense-create-dialog";
import { DeleteExpenseButton } from "@/components/expenses/delete-expense-button";
import { DownloadDocumentButton } from "@/components/documents/download-button";
import { SearchParamSelect } from "@/components/filters/search-param-select";
import { EXPENSE_CATEGORIES } from "@/lib/business/expense-categories";
import { formatCurrency, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; categorie?: string }>;
}) {
  const { annee, categorie } = await searchParams;
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

  const currentYear = now.getFullYear();
  const availableYears = [
    ...new Set((expenses ?? []).map((e) => new Date(e.date_depense).getFullYear())),
  ].sort((a, b) => b - a);
  if (!availableYears.includes(currentYear)) availableYears.unshift(currentYear);
  const selectedYear = annee ?? String(currentYear);
  const selectedCategory = categorie ?? "toutes";

  const filteredExpenses = (expenses ?? [])
    .filter((e) => selectedYear === "toutes" || new Date(e.date_depense).getFullYear() === Number(selectedYear))
    .filter((e) => selectedCategory === "toutes" || e.categorie === selectedCategory);

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

      <div className="mb-4 flex gap-2">
        <SearchParamSelect
          paramName="annee"
          className="w-40"
          options={[
            ...availableYears.map((y) => ({ value: String(y), label: String(y) })),
            { value: "toutes", label: "Toutes les années" },
          ]}
        />
        <SearchParamSelect
          paramName="categorie"
          className="w-56"
          options={[
            { value: "toutes", label: "Toutes les catégories" },
            ...EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c })),
          ]}
        />
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
              {filteredExpenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{formatDate(e.date_depense)}</TableCell>
                  <TableCell>{e.categorie}</TableCell>
                  <TableCell>{e.fournisseur ?? "—"}</TableCell>
                  <TableCell className="max-w-64 truncate text-muted-foreground">{e.description}</TableCell>
                  <TableCell>{formatCurrency(e.montant)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {e.justificatif_url && (
                        <DownloadDocumentButton bucket="documents" path={e.justificatif_url} label="Justificatif" />
                      )}
                      <DeleteExpenseButton expenseId={e.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredExpenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Aucune dépense pour ces filtres.
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
