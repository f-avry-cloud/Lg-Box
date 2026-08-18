import { ListeReprise } from "@/components/suivi/liste-reprise";
import { listeReprise } from "@/lib/suivi/repository";

export const dynamic = "force-dynamic";

/**
 * Reprise du centre — **écran temporaire**.
 *
 * Une fois tous les locataires prévenus du changement de propriétaire, cet
 * écran, son onglet, `components/suivi/liste-reprise.tsx`,
 * `lib/suivi/reprise.ts`, `lib/actions/suivi-reprise.ts` et la table
 * `sr_reprise_contacts` se retirent d'un bloc, sans rien laisser derrière.
 * Seule `modifieLocataire` mérite d'être conservée ailleurs.
 */
export default async function ReprisePage() {
  const lignes = await listeReprise();

  return (
    <div className="mx-auto max-w-2xl">
      <ListeReprise lignes={lignes} />
    </div>
  );
}
