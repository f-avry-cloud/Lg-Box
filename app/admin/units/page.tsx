import { UnitsView } from "@/components/units/units-view";
import { UnitCreateDialog } from "@/components/units/unit-create-dialog";
import { CsvImportDialog } from "@/components/import/csv-import-dialog";
import { importUnitsCsv } from "@/lib/actions/import";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import type { UnitTenantInfo } from "@/lib/units/floor-plan";

const UNIT_IMPORT_FIELDS = [
  { key: "numero", label: "Numéro", required: true },
  { key: "taille_libelle", label: "Taille (ex. 10m²)", required: true },
  { key: "taille_m2", label: "Surface (m²)" },
  { key: "prix_mensuel_standard", label: "Prix mensuel", required: true },
  { key: "type", label: "Type (interieur/exterieur/climatise)" },
  { key: "floor", label: "Étage (sous_sol/rez_de_chaussee/premier_etage)" },
  { key: "zone", label: "Zone" },
  { key: "statut", label: "Statut (libre/loue/reserve/hors_service)" },
  { key: "notes", label: "Notes" },
];

export default async function UnitsPage() {
  const supabase = await createClient();
  const [{ data: units }, profile, { data: activeContracts }] = await Promise.all([
    supabase.from("units").select("*").order("numero"),
    getCurrentProfile(),
    supabase.from("contracts").select("id, unit_id, customer_id, prix_mensuel, statut").in("statut", ["actif", "en_preavis"]),
  ]);
  const isAdmin = profile?.role === "admin";

  // Locataire actuel par box — permet au plan interactif d'afficher qui
  // occupe un box sans devoir naviguer vers sa fiche pour le savoir.
  const tenantCustomerIds = [...new Set((activeContracts ?? []).map((c) => c.customer_id))];
  const { data: tenantCustomers } = tenantCustomerIds.length
    ? await supabase.from("customers").select("id, prenom, nom").in("id", tenantCustomerIds)
    : { data: [] };
  const tenantCustomerById = new Map((tenantCustomers ?? []).map((c) => [c.id, c]));

  const tenantsByUnit: Record<string, UnitTenantInfo> = {};
  for (const c of activeContracts ?? []) {
    const cust = tenantCustomerById.get(c.customer_id);
    if (!cust) continue;
    tenantsByUnit[c.unit_id] = {
      contractId: c.id,
      customerId: c.customer_id,
      customerName: `${cust.prenom} ${cust.nom}`.trim(),
      prixMensuel: c.prix_mensuel,
      statut: c.statut,
    };
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Box</h1>
          <p className="text-sm text-muted-foreground">
            {units?.length ?? 0} box au total — vue liste ou plan du site.
          </p>
        </div>
        <div className="flex gap-2">
          <CsvImportDialog
            triggerLabel="Importer CSV"
            title="Importer des box depuis un CSV"
            description="Utile pour reprendre un inventaire de box existant sans ressaisie manuelle."
            fields={UNIT_IMPORT_FIELDS}
            onImport={importUnitsCsv}
            templateUrl="/templates/box-modele.csv"
          />
          <UnitCreateDialog />
        </div>
      </div>
      <UnitsView units={units ?? []} isAdmin={isAdmin} tenantsByUnit={tenantsByUnit} />
    </div>
  );
}
