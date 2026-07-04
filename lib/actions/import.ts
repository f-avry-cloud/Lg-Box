"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult } from "@/lib/actions/result";
import type { CustomerType, UnitFloor, UnitStatus, UnitType } from "@/types/database";

// Reprise de données : import en masse de locataires ou de box depuis un CSV
// existant, pour éviter une ressaisie manuelle à l'ouverture du logiciel.

export async function importCustomersCsv(
  rows: Record<string, string>[]
): Promise<ActionResult & { imported?: number }> {
  await requireStaff();
  const supabase = await createClient();

  const payload = rows.map((r) => ({
    prenom: r.prenom,
    nom: r.nom,
    email: r.email,
    telephone: r.telephone || null,
    adresse: r.adresse || null,
    ville: r.ville || null,
    code_postal: r.code_postal || null,
    type: (r.type === "professionnel" ? "professionnel" : "particulier") as CustomerType,
    siret: r.siret || null,
    notes: r.notes || null,
  }));

  const { error } = await supabase.from("customers").insert(payload);
  if (error) return fail(error.message);

  revalidatePath("/admin/customers");
  return { ...ok, imported: payload.length };
}

export async function importUnitsCsv(
  rows: Record<string, string>[]
): Promise<ActionResult & { imported?: number }> {
  await requireStaff();
  const supabase = await createClient();

  const { data: site } = await supabase.from("sites").select("id").limit(1).single();
  if (!site) return fail("Aucun site configuré.");

  const VALID_TYPES: UnitType[] = ["interieur", "exterieur", "climatise"];
  const VALID_FLOORS: UnitFloor[] = ["sous_sol", "rez_de_chaussee", "premier_etage"];
  const VALID_STATUTS: UnitStatus[] = ["libre", "loue", "reserve", "hors_service"];

  const payload = rows.map((r) => ({
    site_id: site.id,
    numero: r.numero,
    taille_libelle: r.taille_libelle,
    taille_m2: r.taille_m2 ? Number(r.taille_m2) : null,
    type: (VALID_TYPES.includes(r.type as UnitType) ? r.type : "interieur") as UnitType,
    zone: r.zone || null,
    floor: (VALID_FLOORS.includes(r.floor as UnitFloor) ? r.floor : "rez_de_chaussee") as UnitFloor,
    prix_mensuel_standard: Number(r.prix_mensuel_standard) || 0,
    statut: (VALID_STATUTS.includes(r.statut as UnitStatus) ? r.statut : "libre") as UnitStatus,
    notes: r.notes || null,
  }));

  const { error } = await supabase.from("units").insert(payload);
  if (error) return fail(error.message);

  revalidatePath("/admin/units");
  return { ...ok, imported: payload.length };
}
