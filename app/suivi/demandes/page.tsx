import { ListeDemandes } from "@/components/suivi/liste-demandes";
import { demandesReservation } from "@/lib/suivi/repository";

export const dynamic = "force-dynamic";

export default async function DemandesPage() {
  const demandes = await demandesReservation();

  return (
    <div className="mx-auto max-w-2xl">
      <ListeDemandes demandes={demandes} />
    </div>
  );
}
