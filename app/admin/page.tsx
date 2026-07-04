import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReservationStatusBadge } from "@/components/status-badge";
import { OccupancyGauge } from "@/components/dashboard/occupancy-gauge";
import { OccupancyChart } from "@/components/dashboard/occupancy-chart";
import { formatCurrency, formatDate } from "@/lib/format";
import { computeMonthlyOccupancy } from "@/lib/business/occupancy";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const currentMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().slice(0, 10);
  const previousMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1))
    .toISOString()
    .slice(0, 10);

  const [
    { count: totalUnits },
    { count: loues },
    { data: currentMonthInvoices },
    { data: previousMonthInvoices },
    { data: unpaidInvoices },
    { data: noticeContracts },
    { data: newReservations },
    { data: allContracts },
  ] = await Promise.all([
    supabase.from("units").select("id", { count: "exact", head: true }),
    supabase.from("units").select("id", { count: "exact", head: true }).eq("statut", "loue"),
    supabase
      .from("invoices")
      .select("montant_ttc")
      .neq("statut", "annulee")
      .gte("date_emission", currentMonthStart),
    supabase
      .from("invoices")
      .select("montant_ttc")
      .neq("statut", "annulee")
      .gte("date_emission", previousMonthStart)
      .lt("date_emission", currentMonthStart),
    supabase.from("invoices").select("montant_ttc, customer_id").in("statut", ["emise", "en_retard"]),
    supabase
      .from("contracts")
      .select("*")
      .eq("statut", "en_preavis")
      .order("date_fin", { ascending: true })
      .limit(5),
    supabase
      .from("reservation_requests")
      .select("*")
      .eq("statut", "nouvelle")
      .order("created_at", { ascending: false }),
    supabase.from("contracts").select("date_debut, date_fin, statut"),
  ]);

  const occupancyRate = totalUnits ? Math.round(((loues ?? 0) / totalUnits) * 100) : 0;
  const caCurrentMonth = (currentMonthInvoices ?? []).reduce((sum, i) => sum + i.montant_ttc, 0);
  const caPreviousMonth = (previousMonthInvoices ?? []).reduce((sum, i) => sum + i.montant_ttc, 0);
  const caDelta = caPreviousMonth > 0 ? Math.round(((caCurrentMonth - caPreviousMonth) / caPreviousMonth) * 100) : null;

  const totalUnpaid = (unpaidInvoices ?? []).reduce((sum, i) => sum + i.montant_ttc, 0);
  const unpaidCustomers = new Set((unpaidInvoices ?? []).map((i) => i.customer_id)).size;

  const noticeUnitIds = [...new Set((noticeContracts ?? []).map((c) => c.unit_id))];
  const noticeCustomerIds = [...new Set((noticeContracts ?? []).map((c) => c.customer_id))];
  const { data: noticeUnits } = noticeUnitIds.length
    ? await supabase.from("units").select("id, numero").in("id", noticeUnitIds)
    : { data: [] };
  const { data: noticeCustomers } = noticeCustomerIds.length
    ? await supabase.from("customers").select("id, prenom, nom").in("id", noticeCustomerIds)
    : { data: [] };
  const noticeUnitById = new Map((noticeUnits ?? []).map((u) => [u.id, u]));
  const noticeCustomerById = new Map((noticeCustomers ?? []).map((c) => [c.id, c]));

  const occupancyHistory = computeMonthlyOccupancy(allContracts ?? [], totalUnits ?? 0);

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold">Tableau de bord</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Occupation</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <OccupancyGauge rate={occupancyRate} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CA du mois</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(caCurrentMonth)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {caDelta === null
                ? "Pas de comparaison disponible"
                : `${caDelta >= 0 ? "+" : ""}${caDelta}% vs mois précédent (${formatCurrency(caPreviousMonth)})`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Impayés</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-destructive">{formatCurrency(totalUnpaid)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {unpaidCustomers} client{unpaidCustomers > 1 ? "s" : ""} concerné{unpaidCustomers > 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Box</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {loues ?? 0} / {totalUnits ?? 0}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">box loués sur le total</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Occupation sur 12 mois</CardTitle>
          </CardHeader>
          <CardContent>
            <OccupancyChart data={occupancyHistory} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prochaines échéances</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {(noticeContracts ?? []).map((c) => (
              <Link
                key={c.id}
                href={`/admin/contracts/${c.id}`}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary"
              >
                <div>
                  <p className="font-medium">
                    {noticeCustomerById.get(c.customer_id)?.prenom} {noticeCustomerById.get(c.customer_id)?.nom}
                  </p>
                  <p className="text-xs text-muted-foreground">Box {noticeUnitById.get(c.unit_id)?.numero}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {c.date_fin ? formatDate(c.date_fin) : "—"}
                </span>
              </Link>
            ))}
            {(!noticeContracts || noticeContracts.length === 0) && (
              <p className="text-sm text-muted-foreground">Aucun préavis en cours.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nouvelles demandes de réservation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {(newReservations ?? []).map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{r.nom}</p>
                <p className="text-xs text-muted-foreground">
                  {r.email} · {r.taille_souhaitee ?? "taille non précisée"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
                <ReservationStatusBadge status={r.statut} />
              </div>
            </div>
          ))}
          {(!newReservations || newReservations.length === 0) && (
            <p className="text-sm text-muted-foreground">Aucune nouvelle demande.</p>
          )}
          <Link href="/admin/reservations" className="mt-1 text-xs text-primary hover:underline">
            Voir toutes les demandes →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
