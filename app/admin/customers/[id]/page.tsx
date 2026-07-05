import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ContractStatusBadge,
  InvoiceStatusBadge,
  PaymentStatusBadge,
  SecurityDepositStatusBadge,
  SignatureStatusBadge,
} from "@/components/status-badge";
import { DocumentUpload } from "@/components/customers/document-upload";
import { CustomerNotes } from "@/components/customers/customer-notes";
import { CustomerEditDialog } from "@/components/customers/customer-edit-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase.from("customers").select("*").eq("id", id).single();
  if (!customer) notFound();

  const [{ data: contracts }, { data: invoices }, { data: payments }, { data: documents }, { data: deposits }] =
    await Promise.all([
      supabase.from("contracts").select("*").eq("customer_id", id).order("date_debut", { ascending: false }),
      supabase.from("invoices").select("*").eq("customer_id", id).order("date_emission", { ascending: false }),
      supabase.from("payments").select("*").eq("customer_id", id).order("date_paiement", { ascending: false }),
      supabase
        .from("documents")
        .select("*")
        .eq("related_table", "customers")
        .eq("related_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("security_deposits")
        .select("*")
        .eq("customer_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const unitIds = [...new Set((contracts ?? []).map((c) => c.unit_id))];
  const { data: units } = unitIds.length
    ? await supabase.from("units").select("id, numero").in("id", unitIds)
    : { data: [] };
  const unitById = new Map((units ?? []).map((u) => [u.id, u]));
  const contractById = new Map((contracts ?? []).map((c) => [c.id, c]));

  return (
    <div>
      <Link
        href="/admin/customers"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Retour aux clients
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">
            {customer.prenom} {customer.nom}
          </h1>
          <p className="text-sm text-muted-foreground">
            {customer.email} · {customer.telephone ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={customer.type === "professionnel" ? "secondary" : "outline"}>
            {customer.type === "professionnel" ? "Professionnel" : "Particulier"}
          </Badge>
          <CustomerEditDialog customer={customer} />
        </div>
      </div>

      <Tabs defaultValue="infos">
        <TabsList>
          <TabsTrigger value="infos">Infos</TabsTrigger>
          <TabsTrigger value="contrats">Contrats ({contracts?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="factures">Factures ({invoices?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="paiements">Paiements ({payments?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="infos">
          <Card>
            <CardHeader>
              <CardTitle>Coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <Info label="Adresse" value={customer.adresse} />
              <Info label="Ville" value={[customer.code_postal, customer.ville].filter(Boolean).join(" ")} />
              <Info label="SIRET" value={customer.siret} />
              <Info label="Client depuis" value={formatDate(customer.created_at)} />
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Notes internes</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerNotes customerId={customer.id} initialNotes={customer.notes ?? ""} />
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Dépôts de garantie</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Box</TableHead>
                    <TableHead>Reçu</TableHead>
                    <TableHead>Restitué</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(deposits ?? []).map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <Link href={`/admin/contracts/${d.contract_id}`} className="font-mono hover:text-primary">
                          {unitById.get(contractById.get(d.contract_id)?.unit_id ?? "")?.numero ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell>{d.amount_received ? formatCurrency(d.amount_received) : "—"}</TableCell>
                      <TableCell>{d.amount_refunded ? formatCurrency(d.amount_refunded) : "—"}</TableCell>
                      <TableCell>
                        <SecurityDepositStatusBadge status={d.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!deposits || deposits.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        Aucun dépôt de garantie.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contrats">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Box</TableHead>
                    <TableHead>Début</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Signature</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(contracts ?? []).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link href={`/admin/contracts/${c.id}`} className="font-mono hover:text-primary">
                          {unitById.get(c.unit_id)?.numero}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(c.date_debut)}</TableCell>
                      <TableCell>{c.date_fin ? formatDate(c.date_fin) : "—"}</TableCell>
                      <TableCell>{formatCurrency(c.prix_mensuel)}</TableCell>
                      <TableCell>
                        <ContractStatusBadge status={c.statut} />
                      </TableCell>
                      <TableCell>
                        <SignatureStatusBadge status={c.signature_status} />
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
        </TabsContent>

        <TabsContent value="factures">
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
                        {formatDate(i.periode_debut)} → {formatDate(i.periode_fin)}
                      </TableCell>
                      <TableCell>{formatCurrency(i.montant_ttc)}</TableCell>
                      <TableCell>{formatDate(i.date_echeance)}</TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={i.statut} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!invoices || invoices.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        Aucune facture.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paiements">
          <Card>
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
                        Aucun paiement.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <DocumentUpload customerId={customer.id} documentType="piece_identite" label="Ajouter un document" />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fichier</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Ajouté le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(documents ?? []).map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.nom_fichier}</TableCell>
                      <TableCell className="capitalize">{d.type.replace("_", " ")}</TableCell>
                      <TableCell>{formatDate(d.created_at)}</TableCell>
                    </TableRow>
                  ))}
                  {(!documents || documents.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        Aucun document.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p>{value || "—"}</p>
    </div>
  );
}
