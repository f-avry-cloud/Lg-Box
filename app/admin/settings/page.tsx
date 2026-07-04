import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanySettingsForm } from "@/components/settings/company-settings-form";
import { PricingGridEditor } from "@/components/settings/pricing-grid-editor";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: settings } = await supabase.from("company_settings").select("*").single();
  const { data: pricing } = await supabase.from("pricing_grid").select("*").order("prix_mensuel");

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

      <Card>
        <CardHeader>
          <CardTitle>Barème de prix par taille</CardTitle>
        </CardHeader>
        <CardContent>
          <PricingGridEditor rows={pricing ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
