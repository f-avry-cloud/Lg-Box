import { notFound } from "next/navigation";

import { FicheLocataireVue } from "@/components/suivi/fiche-locataire";
import { isPeriode, periodeCourante } from "@/lib/suivi/period";
import { ficheLocataire } from "@/lib/suivi/repository";

export const dynamic = "force-dynamic";

export default async function FichePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mois?: string }>;
}) {
  const [{ id }, { mois }] = await Promise.all([params, searchParams]);
  const periode = mois && isPeriode(mois) ? mois : periodeCourante();

  const fiche = await ficheLocataire(decodeURIComponent(id));
  if (!fiche) notFound();

  return <FicheLocataireVue key={`${id}-${periode}`} fiche={fiche} periode={periode} />;
}
