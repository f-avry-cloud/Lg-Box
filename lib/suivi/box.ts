// Regroupement et tri des box pour l'écran Box. Fonction pure, séparée du
// repository pour être testable sans base ni contexte de requête.

import {
  BATIMENT_NON_PRECISE,
  estBatimentATraiter,
  type BoxListe,
  type GroupeBatiment,
} from "@/lib/suivi/types";

/**
 * Groupe les box par bâtiment, façon carnet de contacts.
 *
 * Deux règles de tri, toutes deux dictées par les données réelles du site :
 *
 * - Les groupes « à traiter » (« À localiser », « Sans bâtiment ») passent en
 *   dernier. Ce ne sont pas des bâtiments mais des files d'attente, et elles
 *   pèsent lourd — 70 des 137 box. Les remonter en tête de liste par ordre
 *   alphabétique enterrerait les vrais bâtiments sous elles.
 * - À l'intérieur d'un groupe, tri numérique naturel : les numéros mêlent
 *   chiffres et lettres (« 2 », « 2A », « 2C », « 10 »), et un tri
 *   lexicographique placerait « 10 » avant « 2 ».
 */
export function groupeParBatiment(box: BoxListe[]): GroupeBatiment[] {
  const groupes = new Map<string, BoxListe[]>();

  for (const b of box) {
    const cle = b.batiment?.trim() || BATIMENT_NON_PRECISE;
    const liste = groupes.get(cle);
    if (liste) liste.push(b);
    else groupes.set(cle, [b]);
  }

  return [...groupes.entries()]
    .map(([batiment, liste]) => ({
      batiment,
      box: [...liste].sort((a, b) =>
        a.numero.localeCompare(b.numero, "fr", { numeric: true, sensitivity: "base" })
      ),
      // Les box sans surface comptent pour 0 : le total annoncé est bien la
      // « surface connue à ce jour », pas une estimation.
      surface_totale: liste.reduce((somme, b) => somme + (b.surface_m2 ?? 0), 0),
    }))
    .sort((a, b) => {
      const aTraiter = estBatimentATraiter(a.batiment);
      const bTraiter = estBatimentATraiter(b.batiment);
      if (aTraiter !== bTraiter) return aTraiter ? 1 : -1;
      return a.batiment.localeCompare(b.batiment, "fr", { numeric: true });
    });
}
