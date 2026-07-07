import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CustomerCreateDialog } from "@/components/customers/customer-create-dialog";
import { CustomerActiveSelect } from "@/components/customers/customer-active-select";
import { CsvImportDialog } from "@/components/import/csv-import-dialog";
import { SearchParamSelect } from "@/components/filters/search-param-select";
import { importCustomersCsv } from "@/lib/actions/import";
import { createClient } from "@/lib/supabase/server";

const CUSTOMER_IMPORT_FIELDS = [
  { key: "prenom", label: "Prénom", required: true },
  { key: "nom", label: "Nom", required: true },
  { key: "email", label: "Email", required: true },
  { key: "telephone", label: "Téléphone" },
  { key: "adresse", label: "Adresse" },
  { key: "ville", label: "Ville" },
  { key: "code_postal", label: "Code postal" },
  { key: "type", label: "Type (particulier/professionnel)" },
  { key: "siret", label: "SIRET" },
  { key: "notes", label: "Notes" },
];

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string }>;
}) {
  const { q, statut } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("customers").select("*").order("nom");
  if (q) {
    query = query.or(`nom.ilike.%${q}%,prenom.ilike.%${q}%,email.ilike.%${q}%,telephone.ilike.%${q}%`);
  }
  const selectedStatus = statut ?? "actif";
  if (selectedStatus !== "tous") {
    query = query.eq("actif", selectedStatus === "actif");
  }
  const { data: customers } = await query;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground">{customers?.length ?? 0} clients enregistrés.</p>
        </div>
        <div className="flex gap-2">
          <CsvImportDialog
            triggerLabel="Importer CSV"
            title="Importer des clients depuis un CSV"
            description="Utile pour reprendre une base de locataires existante sans ressaisie manuelle."
            fields={CUSTOMER_IMPORT_FIELDS}
            onImport={importCustomersCsv}
            templateUrl="/templates/clients-modele.csv"
          />
          <CustomerCreateDialog />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <form>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Rechercher (nom, email, téléphone)..."
            className="h-9 w-72 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>
        <SearchParamSelect
          paramName="statut"
          className="w-32"
          options={[
            { value: "actif", label: "Actifs" },
            { value: "inactif", label: "Inactifs" },
            { value: "tous", label: "Tous" },
          ]}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(customers ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/admin/customers/${c.id}`} className="font-medium hover:text-primary">
                      {c.prenom} {c.nom}
                    </Link>
                  </TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.telephone}</TableCell>
                  <TableCell>
                    <Badge variant={c.type === "professionnel" ? "secondary" : "outline"}>
                      {c.type === "professionnel" ? "Professionnel" : "Particulier"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <CustomerActiveSelect customerId={c.id} actif={c.actif} />
                  </TableCell>
                </TableRow>
              ))}
              {(!customers || customers.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Aucun client trouvé.
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
