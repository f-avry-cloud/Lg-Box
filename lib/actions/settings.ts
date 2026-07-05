"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult } from "@/lib/actions/result";
import { geocodeAddress } from "@/lib/geocoding";
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
      relance_signature_jours_defaut: Number(formData.get("relance_signature_jours_defaut") ?? 7),
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  return { error: null, success: true };
}

// Sauvegarde le chemin de stockage de l'image de signature LG BOX, apposée
// automatiquement sur chaque contrat généré (voir lib/pdf/company-signature.ts).
export async function setCompanySignatureImagePath(path: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("company_settings")
    .update({ signature_image_path: path, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) return fail(error.message);

  revalidatePath("/admin/settings");
  return ok;
}

export async function updateSepaMandateSettings(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  await requireAdmin();
  const supabase = await createClient();

  const templateMode = String(formData.get("mandat_sepa_template_mode") ?? "integre");

  const { error } = await supabase
    .from("company_settings")
    .update({
      ics: String(formData.get("ics") ?? "") || null,
      mandat_sepa_modele: String(formData.get("mandat_sepa_modele") ?? "") || null,
      mandat_sepa_template_mode: templateMode === "upload" ? "upload" : "integre",
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  return { error: null, success: true };
}

export async function updateSiteSettings(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  await requireAdmin();
  const supabase = await createClient();

  const siteId = String(formData.get("id") ?? "");
  if (!siteId) return { error: "Site introuvable." };

  const adresse = String(formData.get("adresse") ?? "") || null;
  const ville = String(formData.get("ville") ?? "") || null;
  const codePostal = String(formData.get("code_postal") ?? "") || null;
  const coords = await geocodeAddress(adresse, codePostal, ville);

  const { error } = await supabase
    .from("sites")
    .update({
      nom: String(formData.get("nom") ?? "") || "LG BOX",
      adresse,
      ville,
      code_postal: codePostal,
      telephone: String(formData.get("telephone") ?? "") || null,
      email_contact: String(formData.get("email_contact") ?? "") || null,
      horaires: String(formData.get("horaires") ?? "") || null,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    })
    .eq("id", siteId);

  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  revalidatePath("/admin/reports");
  revalidatePath("/");
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
