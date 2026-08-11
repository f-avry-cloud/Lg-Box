import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ContractStatusBadge } from "@/components/status-badge";
import { UnitStatusSelect } from "@/components/units/unit-status-select";
import { UnitZoneSelect } from "@/components/units/unit-zone-select";
import { UnitAccessCodeForm } from "@/components/units/unit-access-code-form";
import { UnitDeleteButton } from "@/components/units/unit-delete-button";
import { UnitSizeEditForm } from "@/components/units/unit-size-edit-form";
import { UnitNumeroEditForm } from "@/components/units/unit-numero-edit-form";
import { SendAccessCodeButton } from "@/components/access-codes/send-access-code-button";
import { formatCurrency, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

export default async function UnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: unit }, profile] = await Promise.all([
    supabase.from("units").select("*").eq("id", id).single(),
    getCurrentProfile(),
  ]);
  if (!unit) notFound();
  const isAdmin = profile?.role === "admin";

  const { data: contracts } = await supabase
    .from("contracts")
    .select("*")
    .eq("unit_id", id)
    .order("date_debut", { ascending: false });

  const customerIds = [...new Set((contracts ?? []).map((c) => c.customer_id))];
  const { data: customers } = customerIds.length
    ? await supabase.from("customers").select("id, prenom, nom").in("id", customerIds)
    : { data: [] };
  const customerById = new Map((customers ?? []).map((c) => [c.id, c]));
  const hasActiveTenant = (contracts ?? []).some((c) => c.statut === "actif" || c.statut === "en_preavis");

  return (
    <div>
      <Link href="/admin/units" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Retour aux box
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-1 font-mono text-lg font-semibold">
            Box {unit.numero}
            <UnitNumeroEditForm unitId={unit.id} numero={unit.numero} />
          </h1>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            {unit.taille_libelle}
            <UnitSizeEditForm
              unitId={unit.id}
              tailleM2={unit.taille_m2}
              hasPhysicalDimensions={unit.largeur_cm !== null && unit.profondeur_cm !== null}
            />
            · {unit.type} · {unit.zone} · {formatCurrency(unit.prix_mensuel_standard)}/mois
          </p>
        </div>
        <div className="flex items-center gap-2">
          <UnitZoneSelect unitId={unit.id} zone={unit.zone} />
          <UnitStatusSelect unitId={unit.id} status={unit.statut} />
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Code d&apos;accès</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <UnitAccessCodeForm unitId={unit.id} initialCode={unit.code_acces ?? ""} />
          <p className="text-xs text-muted-foreground">
            Disponible dans le modèle de contrat via la variable {"{{box_code}}"}.
          </p>
          {unit.code_acces && hasActiveTenant && (
            <div>
              <SendAccessCodeButton kind="unit-box" unitId={unit.id} />
            </div>
          )}
        </CardContent>
      </Card>

      {unit.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Notes internes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{unit.notes}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historique de location</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Début</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(contracts ?? []).map((c) => {
                const customer = customerById.get(c.customer_id);
                return (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/admin/customers/${c.customer_id}`} className="hover:text-primary">
                      {customer?.prenom} {customer?.nom}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(c.date_debut)}</TableCell>
                  <TableCell>{c.date_fin ? formatDate(c.date_fin) : "—"}</TableCell>
                  <TableCell>{formatCurrency(c.prix_mensuel)}</TableCell>
                  <TableCell>
                    <ContractStatusBadge status={c.statut} />
                  </TableCell>
                </TableRow>
                );
              })}
              {(!contracts || contracts.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Aucune location enregistrée pour ce box.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isAdmin && (!contracts || contracts.length === 0) && (
        <Card className="mt-4 border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Zone dangereuse</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Supprime définitivement ce box. Utile pour nettoyer un box provisoire (zone « À localiser »)
              devenu inutile après avoir réassigné son contrat au bon box.
            </p>
            <div>
              <UnitDeleteButton unitId={unit.id} unitNumero={unit.numero} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
