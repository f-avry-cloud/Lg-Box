"use server";

import { revalidatePath } from "next/cache";

import { requireStaff, requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult } from "@/lib/actions/result";
import { isValidIban, generateRum } from "@/lib/business/iban";

// Renseigne l'IBAN/BIC du locataire pour ce contrat et génère le RUM une
// fois pour toutes (stable, ne change pas si l'IBAN est corrigé ensuite —
// une vraie modification de RIB nécessiterait un nouveau mandat en pratique,
// hors du périmètre de ce MVP).
export async function updateContractSepaDetails(contractId: string, formData: FormData): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();

  const iban = String(formData.get("iban") ?? "").replace(/\s+/g, "").toUpperCase();
  const bic = String(formData.get("bic") ?? "").trim().toUpperCase();

  if (!iban || !isValidIban(iban)) return fail("IBAN invalide — vérifiez la saisie.");
  if (!bic) return fail("BIC requis.");

  const { data: contract } = await supabase.from("contracts").select("rum").eq("id", contractId).single();
  if (!contract) return fail("Contrat introuvable.");

  const { error } = await supabase
    .from("contracts")
    .update({ iban, bic, rum: contract.rum ?? generateRum(contractId) })
    .eq("id", contractId);
  if (error) return fail(error.message);

  revalidatePath(`/admin/contracts/${contractId}`);
  return ok;
}

// Sauvegarde le chemin de stockage du modèle de mandat SEPA importé (PDF de
// référence) après upload côté client — voir components/settings/sepa-mandate-form.tsx.
export async function setSepaMandateUploadPath(path: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("company_settings")
    .update({ mandat_sepa_upload_path: path, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) return fail(error.message);

  revalidatePath("/admin/settings");
  return ok;
}
