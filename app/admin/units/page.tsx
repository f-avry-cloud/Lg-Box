import { UnitsView } from "@/components/units/units-view";
import { UnitCreateDialog } from "@/components/units/unit-create-dialog";
import { createClient } from "@/lib/supabase/server";

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
        <UnitCreateDialog />
      </div>
      <UnitsView units={units ?? []} />
    </div>
  );
}
