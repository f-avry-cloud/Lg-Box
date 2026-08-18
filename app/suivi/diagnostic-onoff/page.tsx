import { DiagnosticOnoff } from "@/components/suivi/diagnostic-onoff";

export const dynamic = "force-dynamic";

/**
 * Banc d'essai des raccourcis Onoff — **page temporaire, hors onglets**.
 *
 * Le raccourci s'ouvre mais réclame son entrée : signe que le numéro ne lui
 * parvient pas. Plusieurs formes d'URL sont possibles et je ne peux pas les
 * départager sans un iPhone. Cette page les met côte à côte pour que l'essai
 * prenne une minute au lieu d'un aller-retour par variante.
 *
 * À supprimer une fois la bonne forme identifiée.
 */
export default function DiagnosticOnoffPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <DiagnosticOnoff />
    </div>
  );
}
