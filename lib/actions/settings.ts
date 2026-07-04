"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult } from "@/lib/actions/result";
import type { EmailTemplateKey } from "@/types/database";

export type SettingsFormState = { error: string | null; success?: boolean };

export async function updateCompanySettings(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("company_settings")
    .update({
      nom_entreprise: String(formData.get("nom_entreprise") ?? "") || null,
      siret: String(formData.get("siret") ?? "") || null,
      tva_intracom: String(formData.get("tva_intracom") ?? "") || null,
      adresse: String(formData.get("adresse") ?? "") || null,
      rib: String(formData.get("rib") ?? "") || null,
      cgv: String(formData.get("cgv") ?? "") || null,
      contrat_modele: String(formData.get("contrat_modele") ?? "") || null,
      preavis_jours_defaut: Number(formData.get("preavis_jours_defaut") ?? 30),
      jour_prelevement_defaut: Number(formData.get("jour_prelevement_defaut") ?? 1),
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  return { error: null, success: true };
}

export async function upsertPricingRow(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const tailleLibelle = String(formData.get("taille_libelle") ?? "").trim();
  const prixMensuel = Number(formData.get("prix_mensuel") ?? 0);
  if (!tailleLibelle) return fail("Taille requise.");

  const { error } = await supabase
    .from("pricing_grid")
    .upsert({ taille_libelle: tailleLibelle, prix_mensuel: prixMensuel }, { onConflict: "taille_libelle" });
  if (error) return fail(error.message);
  revalidatePath("/admin/settings");
  return ok;
}

export async function deletePricingRow(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("pricing_grid").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/admin/settings");
  return ok;
}

export async function updateEmailTemplate(
  key: EmailTemplateKey,
  subject: string,
  body: string
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("email_templates")
    .update({ subject, body, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) return fail(error.message);
  revalidatePath("/admin/settings");
  return ok;
}
