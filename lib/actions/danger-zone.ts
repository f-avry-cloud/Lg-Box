"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult } from "@/lib/actions/result";
import { RESET_CONFIRM_PHRASE } from "@/lib/actions/danger-zone-constants";

// Réinitialisation complète des données locataires (clients, contrats,
// factures, paiements). Trois vérifications indépendantes avant d'exécuter
// l'irréversible : phrase tapée exactement, case cochée, mot de passe du
// compte re-saisi et vérifié par une ré-authentification isolée (qui ne
// touche pas à la session en cours).
export async function resetTenantData(formData: FormData): Promise<ActionResult> {
  const profile = await requireAdmin();

  const phrase = String(formData.get("confirm_phrase") ?? "");
  if (phrase !== RESET_CONFIRM_PHRASE) {
    return fail(`Phrase de confirmation incorrecte — tapez exactement « ${RESET_CONFIRM_PHRASE} ».`);
  }

  if (formData.get("acknowledged") !== "on") {
    return fail("Vous devez cocher la case de confirmation.");
  }

  const password = String(formData.get("password") ?? "");
  if (!password) return fail("Mot de passe requis.");
  if (!profile.email) return fail("Impossible de vérifier votre mot de passe (compte sans email).");

  const verifyClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { error: authError } = await verifyClient.auth.signInWithPassword({
    email: profile.email,
    password,
  });
  if (authError) return fail("Mot de passe incorrect.");

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
