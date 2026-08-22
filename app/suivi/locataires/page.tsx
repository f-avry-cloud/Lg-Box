import { ListeLocataires } from "@/components/suivi/liste-locataires";
import { estModeDemo, listeLocataires } from "@/lib/suivi/repository";

export const dynamic = "force-dynamic";

/**
 * L'annuaire des locataires.
 *
 * Aucune donnée nouvelle : nom, box et loyer se lisaient déjà ailleurs. Ce qui
 * manquait, c'était le chemin — partir d'un nom quand c'est tout ce qu'on a en
 * tête. Chaque ligne mène à la fiche existante plutôt que d'en refaire une.
 */
export default async function LocatairesPage() {
  const locataires = await listeLocataires();

  return (
    <div className="mx-auto max-w-2xl">
      <ListeLocataires locataires={locataires} modifiable={!estModeDemo()} />
    </div>
  );
}
