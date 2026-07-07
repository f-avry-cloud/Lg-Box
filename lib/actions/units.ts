"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendAccessCodeEmail } from "@/lib/actions/access-code-email";
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
    code_acces: String(formData.get("code_acces") ?? "") || null,
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

// Code d'accès au box (digicode, cadenas à combinaison...) — utilisable dans
// le modèle de contrat via la variable {{box_code}}, voir lib/pdf/contract-template.ts.
export async function updateUnitAccessCode(unitId: string, codeAcces: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase
    .from("units")
    .update({ code_acces: codeAcces.trim() || null })
    .eq("id", unitId);
  if (error) return fail(error.message);
  revalidatePath(`/admin/units/${unitId}`);
  revalidatePath("/admin/contracts");
  return ok;
}

// Envoie le code d'accès de ce box au locataire actif (le plus récent
// contrat en cours), pour l'utiliser depuis la fiche box directement.
export async function sendUnitBoxAccessCodeEmail(unitId: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();

  const { data: unit } = await supabase.from("units").select("numero, code_acces").eq("id", unitId).single();
  if (!unit) return fail("Box introuvable.");
  if (!unit.code_acces) return fail("Aucun code d'accès renseigné pour ce box.");

  const { data: contract } = await supabase
    .from("contracts")
    .select("customer_id")
    .eq("unit_id", unitId)
    .in("statut", ["actif", "en_preavis"])
    .order("date_debut", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!contract) return fail("Aucun locataire actif pour ce box.");

  const { data: customer } = await supabase
    .from("customers")
    .select("prenom, email")
    .eq("id", contract.customer_id)
    .single();
  if (!customer) return fail("Client introuvable.");

  const result = await sendAccessCodeEmail("code_acces_box", customer, {
    code_acces: unit.code_acces,
    box_numero: unit.numero,
  });
  if (result.success) {
    await supabase.from("activity_log").insert({
      action: "box_access_code_sent",
      table_concernee: "units",
      enregistrement_id: unitId,
      detail: { customer_id: contract.customer_id },
    });
  }
  return result;
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
