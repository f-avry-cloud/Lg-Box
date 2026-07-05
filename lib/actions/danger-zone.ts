"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult } from "@/lib/actions/result";
import type { Profile } from "@/types/database";
import {
  RESET_TENANT_CONFIRM_PHRASE,
  RESET_UNITS_CONFIRM_PHRASE,
} from "@/lib/actions/danger-zone-constants";

// Vérifie les trois facteurs communs aux actions de la zone dangereuse :
// phrase tapée exactement, case cochée, et mot de passe du compte re-saisi
// (vérifié par une ré-authentification isolée qui ne touche pas à la
// session en cours). Retourne le profil admin si tout est valide.
async function verifyDangerZoneConfirmation(
  formData: FormData,
  expectedPhrase: string
): Promise<{ profile: Profile } | { error: string }> {
  const profile = await requireAdmin();

  const phrase = String(formData.get("confirm_phrase") ?? "");
  if (phrase !== expectedPhrase) {
    return { error: `Phrase de confirmation incorrecte — tapez exactement « ${expectedPhrase} ».` };
  }

  if (formData.get("acknowledged") !== "on") {
    return { error: "Vous devez cocher la case de confirmation." };
  }

  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Mot de passe requis." };
  if (!profile.email) return { error: "Impossible de vérifier votre mot de passe (compte sans email)." };

  const verifyClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { error: authError } = await verifyClient.auth.signInWithPassword({
    email: profile.email,
    password,
  });
  if (authError) return { error: "Mot de passe incorrect." };

  return { profile };
}

// Réinitialisation complète des données locataires (clients, contrats,
// factures, paiements) — les box repassent en statut "libre".
export async function resetTenantData(formData: FormData): Promise<ActionResult> {
  const check = await verifyDangerZoneConfirmation(formData, RESET_TENANT_CONFIRM_PHRASE);
  if ("error" in check) return fail(check.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("reset_tenant_data");
  if (error) return fail(error.message);

  revalidatePath("/admin");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/contracts");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/units");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/settings");

  return ok;
}

// Réinitialisation de l'inventaire des box (données de démo). Refuse
// d'agir côté base tant que des contrats existent encore.
export async function resetUnitsData(formData: FormData): Promise<ActionResult> {
  const check = await verifyDangerZoneConfirmation(formData, RESET_UNITS_CONFIRM_PHRASE);
  if ("error" in check) return fail(check.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("reset_units_data");
  if (error) return fail(error.message);

  revalidatePath("/admin");
  revalidatePath("/admin/units");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/contracts");

  return ok;
}
