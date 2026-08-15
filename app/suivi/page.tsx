import { ListeMois } from "@/components/suivi/liste-mois";
import { isPeriode, periodeCourante } from "@/lib/suivi/period";
import { estModeDemo, lignesDuMois } from "@/lib/suivi/repository";

// Le carnet reflète ce qui vient d'être pointé : aucun cache de page.
export const dynamic = "force-dynamic";

export default async function SuiviPage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>;
}) {
  const { mois } = await searchParams;
  // Le mois en cours est le défaut ; un paramètre d'URL bricolé ne doit pas
  // faire tomber la page en erreur.
  const periode = mois && isPeriode(mois) ? mois : periodeCourante();

  const lignes = await lignesDuMois(periode);
  const modeDemo = estModeDemo();

  return (
    <ListeMois
      // Remonter le composant à chaque mois repart d'un état local propre :
      // l'ordre figé et les modifications optimistes appartiennent au mois
      // affiché, pas au suivant.
      key={periode}
      periode={periode}
      lignesInitiales={lignes}
      modeDemo={modeDemo}
    />
  );
}
