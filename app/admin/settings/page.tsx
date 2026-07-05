import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanySettingsForm } from "@/components/settings/company-settings-form";
import { SiteSettingsForm } from "@/components/settings/site-settings-form";
import { PricingGridEditor } from "@/components/settings/pricing-grid-editor";
import { EmailTemplatesEditor } from "@/components/settings/email-templates-editor";
import { SepaMandateForm } from "@/components/settings/sepa-mandate-form";
import { DangerZone } from "@/components/settings/danger-zone";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: settings } = await supabase.from("company_settings").select("*").single();
  const { data: site } = await supabase.from("sites").select("*").limit(1).maybeSingle();
  const { data: pricing } = await supabase.from("pricing_grid").select("*").order("prix_mensuel");
  const { data: emailTemplates } = await supabase.from("email_templates").select("*").order("key");
  const [
    { count: customersCount },
    { count: contractsCount },
    { count: invoicesCount },
    { count: paymentsCount },
    { count: unitsCount },
  ] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("contracts").select("id", { count: "exact", head: true }),
    supabase.from("invoices").select("id", { count: "exact", head: true }),
    supabase.from("payments").select("id", { count: "exact", head: true }),
    supabase.from("units").select("id", { count: "exact", head: true }),
  ]);

  if (!settings) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">
          Réservé aux administrateurs — utilisés dans les contrats, factures et la page publique.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entreprise</CardTitle>
        </CardHeader>
        <CardContent>
          <CompanySettingsForm settings={settings} />
        </CardContent>
      </Card>

      {site && (
        <Card>
          <CardHeader>
            <CardTitle>Centre</CardTitle>
          </CardHeader>
          <CardContent>
            <SiteSettingsForm site={site} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Barème de prix par taille</CardTitle>
        </CardHeader>
        <CardContent>
          <PricingGridEditor rows={pricing ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modèles d&apos;email (relances et facture disponible)</CardTitle>
        </CardHeader>
        <CardContent>
          <EmailTemplatesEditor templates={emailTemplates ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mandat de prélèvement SEPA</CardTitle>
        </CardHeader>
        <CardContent>
          <SepaMandateForm settings={settings} />
        </CardContent>
      </Card>

      <DangerZone
        counts={{
          customers: customersCount ?? 0,
          contracts: contractsCount ?? 0,
          invoices: invoicesCount ?? 0,
          payments: paymentsCount ?? 0,
          units: unitsCount ?? 0,
        }}
      />
    </div>
  );
}
