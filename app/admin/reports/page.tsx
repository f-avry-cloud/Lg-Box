import { Download } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function ReportsPage() {
  const supabase = await createClient();

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().slice(0, 10);

  const [
    { data: invoicedThisMonth },
    { data: collectedThisMonth },
    { data: unpaidInvoices },
    { data: expensesThisMonth },
    { count: totalUnits },
    { count: loues },
  ] = await Promise.all([
    supabase.from("invoices").select("montant_ttc").neq("statut", "annulee").gte("date_emission", monthStart),
    supabase.from("payments").select("montant").eq("statut", "valide").gte("date_paiement", monthStart),
    supabase.from("invoices").select("montant_ttc").in("statut", ["emise", "en_retard"]),
    supabase.from("expenses").select("montant").gte("date_depense", monthStart),
    supabase.from("units").select("id", { count: "exact", head: true }),
    supabase.from("units").select("id", { count: "exact", head: true }).eq("statut", "loue"),
  ]);

  const caFacture = (invoicedThisMonth ?? []).reduce((sum, i) => sum + i.montant_ttc, 0);
  const caEncaisse = (collectedThisMonth ?? []).reduce((sum, p) => sum + p.montant, 0);
  const impayes = (unpaidInvoices ?? []).reduce((sum, i) => sum + i.montant_ttc, 0);
  const charges = (expensesThisMonth ?? []).reduce((sum, e) => sum + e.montant, 0);
  const resultatNet = caEncaisse - charges;
  const occupation = totalUnits ? Math.round(((loues ?? 0) / totalUnits) * 100) : 0;

  const exports = [
    { type: "invoices", label: "Factures" },
    { type: "payments", label: "Paiements" },
    { type: "customers", label: "Clients" },
    { type: "expenses", label: "Dépenses" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold">Rapports</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Rapport du mois en cours</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="CA facturé" value={formatCurrency(caFacture)} />
          <Metric label="CA encaissé" value={formatCurrency(caEncaisse)} />
          <Metric label="Taux d'occupation" value={`${occupation}%`} />
          <Metric label="Impayés en cours" value={formatCurrency(impayes)} />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Résultat (mois en cours)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Metric label="Encaissements" value={formatCurrency(caEncaisse)} />
          <Metric label="Charges" value={formatCurrency(charges)} accent="text-destructive" />
          <Metric
            label="Résultat net"
            value={formatCurrency(resultatNet)}
            accent={resultatNet >= 0 ? "text-success" : "text-destructive"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exports CSV</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {exports.map((e) => (
            <a
              key={e.type}
              href={`/api/export/${e.type}`}
              className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-secondary"
            >
              <Download className="size-4" /> Exporter {e.label}
            </a>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold ${accent ?? ""}`}>{value}</p>
    </div>
  );
}
