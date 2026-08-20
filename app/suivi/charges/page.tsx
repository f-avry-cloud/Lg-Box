import { ListeCharges } from "@/components/suivi/liste-charges";
import { isPeriode, periodeCourante } from "@/lib/suivi/period";
import { estModeDemo, listeCharges, statsTableauDeBord } from "@/lib/suivi/repository";

export const dynamic = "force-dynamic";

/**
 * Charges du centre.
 *
 * Écran atteint depuis le tableau de bord plutôt que depuis la barre du bas :
 * les charges se consultent quand on regarde les chiffres du mois, pas en
 * permanence — et une sixième pastille dans la barre rendrait les cinq autres
 * illisibles.
 *
 * Les recettes viennent de `statsTableauDeBord` et non d'un calcul propre à
 * l'écran : le solde affiché ici doit être, au centime près, la différence
 * entre le chiffre du tableau de bord et les charges. Deux calculs de recettes
 * finiraient par diverger.
 */
export default async function ChargesPage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>;
}) {
  const { mois } = await searchParams;
  const periode = mois && isPeriode(mois) ? mois : periodeCourante();

  const [charges, stats] = await Promise.all([listeCharges(), statsTableauDeBord(periode)]);

  return (
    <div className="mx-auto max-w-2xl">
      <ListeCharges
        charges={charges}
        periode={periode}
        encaisseDuMois={stats.encaisse}
        encaisseCumule={stats.caAnnuel}
        modifiable={!estModeDemo()}
      />
    </div>
  );
}
