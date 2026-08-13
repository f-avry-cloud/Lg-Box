import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UnitStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

// Recherche transverse clients + box, accessible depuis n'importe quel écran
// via le champ de la sidebar — évite d'avoir à deviner la bonne section
// (Clients ou Box) avant de pouvoir chercher. Les contrats restent
// accessibles depuis l'un ou l'autre de ces deux résultats plutôt que
// dupliqués ici en une troisième liste.
export default async function GlobalSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const supabase = await createClient();

  const [{ data: customers }, { data: units }] = query
    ? await Promise.all([
        supabase
          .from("customers")
          .select("*")
          .or(`nom.ilike.%${query}%,prenom.ilike.%${query}%,email.ilike.%${query}%,telephone.ilike.%${query}%`)
          .order("nom")
          .limit(25),
        supabase
          .from("units")
          .select("*")
          .or(`numero.ilike.%${query}%,zone.ilike.%${query}%`)
          .order("zone")
          .order("numero")
          .limit(25),
      ])
    : [{ data: [] }, { data: [] }];

  const noResults = query && (customers ?? []).length === 0 && (units ?? []).length === 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Recherche</h1>
        <p className="text-sm text-muted-foreground">
          {query ? (
            <>Résultats pour « {query} »</>
          ) : (
            "Cherche un client (nom, email, téléphone) ou un box (numéro, bâtiment) depuis le champ de la barre latérale."
          )}
        </p>
      </div>

      {noResults && (
        <p className="text-sm text-muted-foreground">Aucun résultat pour « {query} ».</p>
      )}

      {query && (customers ?? []).length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Clients ({customers?.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {query && (units ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Box ({units?.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Bâtiment</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(units ?? []).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Link href={`/admin/units/${u.id}`} className="font-mono hover:text-primary">
                        {u.numero}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{u.zone ?? "—"}</Badge>
                    </TableCell>
                    <TableCell>{u.taille_libelle}</TableCell>
                    <TableCell>{formatCurrency(u.prix_mensuel_standard)}</TableCell>
                    <TableCell>
                      <UnitStatusBadge status={u.statut} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
