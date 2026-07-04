import { UnitsView } from "@/components/units/units-view";
import { UnitCreateDialog } from "@/components/units/unit-create-dialog";
import { CsvImportDialog } from "@/components/import/csv-import-dialog";
import { importUnitsCsv } from "@/lib/actions/import";
import { createClient } from "@/lib/supabase/server";

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
  const { data: units } = await supabase.from("units").select("*").order("numero");

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
          />
          <UnitCreateDialog />
        </div>
      </div>
      <UnitsView units={units ?? []} />
    </div>
  );
}
