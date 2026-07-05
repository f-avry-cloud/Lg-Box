"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult } from "@/lib/actions/result";
import type { UnitFloor, UnitStatus, UnitType } from "@/types/database";

export type UnitFormState = { error: string | null; success?: boolean };

export async function createUnit(
  _prevState: UnitFormState,
  formData: FormData
): Promise<UnitFormState> {
  await requireStaff();
  const supabase = await createClient();

  const { data: site } = await supabase.from("sites").select("id").limit(1).single();
  if (!site) return { error: "Aucun site configuré." };

  const { error } = await supabase.from("units").insert({
    site_id: site.id,
    numero: String(formData.get("numero") ?? "").trim(),
    taille_libelle: String(formData.get("taille_libelle") ?? ""),
    taille_m2: formData.get("taille_m2") ? Number(formData.get("taille_m2")) : null,
    type: String(formData.get("type") ?? "interieur") as UnitType,
    zone: String(formData.get("zone") ?? "") || null,
    prix_mensuel_standard: Number(formData.get("prix_mensuel_standard") ?? 0),
    statut: "libre",
    notes: String(formData.get("notes") ?? "") || null,
    floor: String(formData.get("floor") ?? "rez_de_chaussee") as UnitFloor,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/units");
  return { error: null, success: true };
}

export async function updateUnitStatus(unitId: string, statut: UnitStatus): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("units").update({ statut }).eq("id", unitId);
  if (error) return fail(error.message);
  revalidatePath("/admin/units");
  revalidatePath(`/admin/units/${unitId}`);
  return ok;
}

export async function updateUnitNotes(unitId: string, notes: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("units").update({ notes }).eq("id", unitId);
  if (error) return fail(error.message);
  revalidatePath(`/admin/units/${unitId}`);
  return ok;
}

export async function updateUnitFloor(unitId: string, floor: UnitFloor): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  // On repart d'une position centrale par défaut sur le nouvel étage, l'admin
  // pourra ensuite glisser le box où il veut.
  const { error } = await supabase
    .from("units")
    .update({ floor, pos_x: 50, pos_y: 50 })
    .eq("id", unitId);
  if (error) return fail(error.message);
  revalidatePath("/admin/units");
  revalidatePath(`/admin/units/${unitId}`);
  return ok;
}

export async function updateUnitPosition(
  unitId: string,
  posX: number,
  posY: number
): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const clampedX = Math.min(100, Math.max(0, posX));
  const clampedY = Math.min(100, Math.max(0, posY));
  const { error } = await supabase
    .from("units")
    .update({ pos_x: clampedX, pos_y: clampedY })
    .eq("id", unitId);
  if (error) return fail(error.message);
  revalidatePath("/admin/units");
  return ok;
}
