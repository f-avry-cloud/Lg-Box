import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DownloadDocumentButton } from "@/components/documents/download-button";
import { formatDate } from "@/lib/format";
import { requireTenantCustomerId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function PortailDocumentsPage() {
  const customerId = await requireTenantCustomerId();
  const supabase = await createClient();

  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, contrat_pdf_url, date_debut")
    .eq("customer_id", customerId)
    .not("contrat_pdf_url", "is", null);

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("related_table", "customers")
    .eq("related_id", customerId)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Mes contrats signés</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrat</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(contracts ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>Contrat du {formatDate(c.date_debut)}</TableCell>
                  <TableCell>
                    {c.contrat_pdf_url && (
                      <DownloadDocumentButton bucket="contracts" path={c.contrat_pdf_url} label="Télécharger" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!contracts || contracts.length === 0) && (
                <TableRow>
                  <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                    Aucun contrat signé disponible pour le moment.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Autres documents</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fichier</TableHead>
                <TableHead>Ajouté le</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(documents ?? []).map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.nom_fichier}</TableCell>
                  <TableCell>{formatDate(d.created_at)}</TableCell>
                  <TableCell>
                    <DownloadDocumentButton bucket="documents" path={d.url} label="Télécharger" />
                  </TableCell>
                </TableRow>
              ))}
              {(!documents || documents.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                    Aucun autre document.
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
