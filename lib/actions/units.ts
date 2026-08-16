"use server";

import { revalidatePath } from "next/cache";

import { requireStaff, requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendAccessCodeEmail } from "@/lib/actions/access-code-email";
import { ok, fail, type ActionResult } from "@/lib/actions/result";
import { FLOOR_PLAN_COLUMNS, KNOWN_ZONES, MIN_UNIT_SIZE_CM, type FloorPlanUnit } from "@/lib/units/floor-plan";
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

// Prix "vitrine" du box quand il est libre — distinct du prix_mensuel du
// contrat (le montant réellement facturé, qui peut avoir été négocié).
// Jusqu'ici uniquement modifiable à la création du box.
export async function updateUnitPrice(unitId: string, prixMensuelStandard: number): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  if (!Number.isFinite(prixMensuelStandard) || prixMensuelStandard < 0) {
    return fail("Le prix doit être un nombre positif.");
  }
  const { error } = await supabase
    .from("units")
    .update({ prix_mensuel_standard: prixMensuelStandard })
    .eq("id", unitId);
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

// Suppression définitive d'un box — réservée aux admins (contrats:unit_id
// est en ON DELETE RESTRICT, donc ça échouerait de toute façon si un contrat
// y fait encore référence ; on le vérifie ici pour un message clair plutôt
// que l'erreur Postgres brute).
export async function deleteUnit(unitId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: contract } = await supabase
    .from("contracts")
    .select("id")
    .eq("unit_id", unitId)
    .limit(1)
    .maybeSingle();
  if (contract) {
    return fail("Impossible de supprimer ce box : au moins un contrat (actif ou passé) y fait encore référence.");
  }

  const { error } = await supabase.from("units").delete().eq("id", unitId);
  if (error) return fail(error.message);

  revalidatePath("/admin/units");
  return ok;
}

export async function updateUnitZone(unitId: string, zone: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const known = KNOWN_ZONES.find((z) => z.value === zone);
  if (!known) return fail("Bâtiment inconnu.");
  const { error } = await supabase.from("units").update({ zone: known.value, floor: known.floor }).eq("id", unitId);
  if (error) return fail(error.message);
  revalidatePath("/admin/units");
  revalidatePath(`/admin/units/${unitId}`);
  return ok;
}

export async function updateUnitNumero(unitId: string, numero: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const trimmed = numero.trim();
  if (!trimmed) return fail("Le numéro ne peut pas être vide.");
  const { error } = await supabase.from("units").update({ numero: trimmed }).eq("id", unitId);
  if (error) {
    if (error.code === "23505") return fail("Ce numéro est déjà utilisé dans ce bâtiment.");
    return fail(error.message);
  }
  revalidatePath("/admin/units");
  revalidatePath(`/admin/units/${unitId}`);
  return ok;
}

// taille_libelle n'est qu'un affichage textuel de taille_m2 (cf. schema.sql:
// "taille_libelle text not null, -- ex 5m²") — le laisser saisir librement
// en plus de la surface produit un doublon qui part en désync avec le temps
// (ex. libellé "7.50 m2" pour un box dont la surface réelle vaut 9.36 après
// une correction). Il est donc dérivé ici, jamais saisi séparément.
function formatTailleLibelle(m2: number): string {
  return `${Number(m2.toFixed(2))} m²`;
}

// La surface est une donnée commerciale saisie à la main, indépendante de la
// géométrie du plan (largeur_cm/profondeur_cm). Le plan ne sert qu'au
// positionnement et à la numérotation : les relevés dont il est issu ne sont
// pas fiables au centimètre et ne doivent donc jamais dicter la surface
// facturée. Le trigger units_sync_taille_m2, qui recalculait taille_m2 depuis
// les dimensions dessinées, a été supprimé pour cette raison (migration
// 014_v1_13.sql) — redimensionner un box sur le plan ne change plus sa surface,
// et modifier sa surface ici ne déforme plus son emplacement sur le plan.
export async function updateUnitSize(unitId: string, params: { tailleM2: number | null }): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  if (params.tailleM2 === null || params.tailleM2 <= 0) {
    return fail("La surface doit être un nombre positif.");
  }

  const { error } = await supabase
    .from("units")
    .update({ taille_libelle: formatTailleLibelle(params.tailleM2), taille_m2: params.tailleM2 })
    .eq("id", unitId);
  if (error) return fail(error.message);

  revalidatePath("/admin/units");
  revalidatePath(`/admin/units/${unitId}`);
  return ok;
}

export type UnitPositionUpdate = {
  id: string;
  pos_x: number;
  pos_y: number;
  largeur_cm: number;
  profondeur_cm: number;
  rotation_deg: number;
};

// Enregistrement groupé des box déplacés/redimensionnés dans le plan
// interactif — réservé aux admins (contrairement aux autres mutations de
// cette page, réservées au staff au sens large). taille_m2 n'est jamais
// écrite ici : déplacer ou redimensionner un box sur le plan ne doit pas
// toucher à sa surface commerciale (voir updateUnitSize). La relecture après
// écriture renvoie simplement les lignes canoniques au client.
export async function saveUnitPositions(
  updates: UnitPositionUpdate[]
): Promise<ActionResult & { units?: FloorPlanUnit[] }> {
  await requireAdmin();
  if (updates.length === 0) return ok;

  for (const u of updates) {
    if (u.largeur_cm < MIN_UNIT_SIZE_CM || u.profondeur_cm < MIN_UNIT_SIZE_CM) {
      return fail(`Le box ${u.id} est en dessous de la taille minimale de ${MIN_UNIT_SIZE_CM} cm.`);
    }
  }

  const supabase = await createClient();

  const results = await Promise.all(
    updates.map((u) =>
      supabase
        .from("units")
        .update({
          pos_x: u.pos_x,
          pos_y: u.pos_y,
          largeur_cm: u.largeur_cm,
          profondeur_cm: u.profondeur_cm,
          rotation_deg: u.rotation_deg,
        })
        .eq("id", u.id)
    )
  );
  const firstError = results.find((r) => r.error)?.error;
  if (firstError) return fail(firstError.message);

  const { data, error } = await supabase
    .from("units")
    .select(FLOOR_PLAN_COLUMNS)
    .in(
      "id",
      updates.map((u) => u.id)
    );
  if (error) return fail(error.message);

  revalidatePath("/admin/units");
  return { ...ok, units: (data ?? []) as FloorPlanUnit[] };
}
