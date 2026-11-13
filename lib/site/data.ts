// Ce que le site public lit dans la base de l'application.
//
// Deux sources, les mêmes que le back-office :
//   - `pricing_grid`  → les tarifs, modifiés dans Paramètres → Grille tarifaire ;
//   - `sr_box.libre`  → les box à louer, déclarés depuis /suivi, lus à travers
//     la fonction `disponibilites_publiques()` qui ne renvoie qu'un décompte.
//
// Le client est anonyme et sans cookies : les pages publiques restent ainsi
// statiques (régénérées toutes les 5 minutes, et aussitôt qu'un tarif ou un
// box change — voir `rafraichirSitePublic`).

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import type { Niveau } from "@/lib/site/config";
import {
  construireOffre,
  surfaceDepuisLibelle,
  type Disponibilites,
  type Offre,
  type Tarif,
} from "@/lib/site/offre";

/**
 * Grille de secours : les tarifs publiés sur lg-box.fr en 2026. Ne sert que si
 * la base est injoignable ou si la migration 022 n'a pas encore été appliquée.
 */
export const TARIFS_DE_SECOURS: Tarif[] = [
  { libelle: "2 m²", surface: 2, niveau: "rdc", prix: 45 },
  { libelle: "5 m²", surface: 5, niveau: "rdc", prix: 100 },
  { libelle: "8 m²", surface: 8, niveau: "rdc", prix: 120 },
  { libelle: "12 m²", surface: 12, niveau: "rdc", prix: 140 },
  { libelle: "15 m²", surface: 15, niveau: "rdc", prix: 160 },
  { libelle: "18 m²", surface: 18, niveau: "rdc", prix: 180 },
  { libelle: "20 m²", surface: 20, niveau: "rdc", prix: 200 },
  { libelle: "5 m² à l'étage", surface: 5, niveau: "etage", prix: 90 },
  { libelle: "8 m² à l'étage", surface: 8, niveau: "etage", prix: 110 },
  { libelle: "12 m² à l'étage", surface: 12, niveau: "etage", prix: 130 },
  { libelle: "18 m² à l'étage", surface: 18, niveau: "etage", prix: 170 },
];

function clientPublic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !cle) return null;
  return createClient(url, cle, { auth: { persistSession: false, autoRefreshToken: false } });
}

type LigneGrille = {
  taille_libelle: string;
  prix_mensuel: number | string;
  niveau?: string | null;
  surface_m2?: number | string | null;
};

export async function lireTarifs(): Promise<Tarif[]> {
  const supabase = clientPublic();
  if (!supabase) return TARIFS_DE_SECOURS;

  try {
    const { data, error } = await supabase.from("pricing_grid").select("*");
    if (error || !data || data.length === 0) return TARIFS_DE_SECOURS;

    const lignes = data as LigneGrille[];
    // Sans colonne `niveau`, la migration 022 n'est pas passée : la table
    // contient encore le jeu de démonstration, pas les tarifs du centre.
    if (!lignes.some((l) => "niveau" in l)) return TARIFS_DE_SECOURS;

    const tarifs: Tarif[] = [];
    for (const l of lignes) {
      const surface =
        l.surface_m2 !== null && l.surface_m2 !== undefined
          ? Number(l.surface_m2)
          : surfaceDepuisLibelle(l.taille_libelle);
      const prix = Number(l.prix_mensuel);
      if (surface === null || !Number.isFinite(surface) || !Number.isFinite(prix)) continue;
      tarifs.push({
        libelle: l.taille_libelle,
        surface,
        niveau: (l.niveau === "etage" ? "etage" : "rdc") as Niveau,
        prix,
      });
    }
    return tarifs.length ? tarifs : TARIFS_DE_SECOURS;
  } catch {
    return TARIFS_DE_SECOURS;
  }
}

export async function lireDisponibilites(): Promise<Disponibilites | null> {
  const supabase = clientPublic();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.rpc("disponibilites_publiques");
    if (error || !data || typeof data !== "object") return null;
    const d = data as Partial<Disponibilites>;
    if (!Array.isArray(d.libres)) return null;
    return {
      total_box: Number(d.total_box ?? 0),
      total_libres: Number(d.total_libres ?? 0),
      libres: d.libres.map((g) => ({
        surface_m2: g.surface_m2 === null ? null : Number(g.surface_m2),
        niveau: g.niveau === "etage" ? "etage" : "rdc",
        nombre: Number(g.nombre),
        tarif_eur: g.tarif_eur === null ? null : Number(g.tarif_eur),
      })),
    };
  } catch {
    return null;
  }
}

export async function lireOffre(): Promise<Offre> {
  const [tarifs, dispo] = await Promise.all([lireTarifs(), lireDisponibilites()]);
  return construireOffre(tarifs, dispo);
}

/**
 * À appeler après toute modification d'un tarif ou d'un box : le site public
 * se régénère sans attendre la prochaine fenêtre de 5 minutes.
 */
export function rafraichirSitePublic() {
  revalidatePath("/(site)", "layout");
  revalidatePath("/llms.txt");
}
