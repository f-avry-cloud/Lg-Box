"use server";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createServiceClient } from "@/lib/supabase/server";
import { generateTemporaryPassword } from "@/lib/business/generate-password";
import { renderEmailTemplate, portalLoginLink } from "@/lib/email/templates";
import { getResend, FROM_EMAIL } from "@/lib/email/resend";
import { ok, fail, type ActionResult } from "@/lib/actions/result";
import type { Database } from "@/types/database";

// Crée (ou réinitialise) l'accès à l'espace client d'un locataire : aucun
// mécanisme n'existait pour provisionner un compte Supabase Auth pour un
// client, donc l'espace client était inaccessible dans tous les cas.
// Appelé automatiquement à la première signature de contrat (voir
// signDocuments) et manuellement depuis la fiche client (rattrapage /
// réinitialisation). Le mot de passe est toujours renvoyé pour permettre une
// communication manuelle si l'email échoue (RESEND_API_KEY absente, etc.).
export async function provisionPortalAccess(
  supabase: SupabaseClient<Database>,
  customer: { id: string; prenom: string; email: string; user_id: string | null },
  options: { sendEmail?: boolean } = {}
): Promise<ActionResult & { password?: string; emailSent?: boolean }> {
  const service = createServiceClient();
  const password = generateTemporaryPassword();

  if (customer.user_id) {
    const { error } = await service.auth.admin.updateUserById(customer.user_id, { password });
    if (error) return fail(error.message);
  } else {
    const { data: created, error } = await service.auth.admin.createUser({
      email: customer.email,
      password,
      email_confirm: true,
    });
    if (error || !created.user) return fail(error?.message ?? "Impossible de créer le compte.");

    const { error: linkError } = await service
      .from("customers")
      .update({ user_id: created.user.id })
      .eq("id", customer.id);
    if (linkError) return fail(linkError.message);
  }

  const shouldSend = options.sendEmail !== false && Boolean(process.env.RESEND_API_KEY);
  if (!shouldSend) return { ...ok, password, emailSent: false };

  const rendered = await renderEmailTemplate(supabase, "portal_access", {
    prenom: customer.prenom,
    email: customer.email,
    mot_de_passe: password,
    lien_connexion: portalLoginLink(),
  });
  if (!rendered) return { ...ok, password, emailSent: false };

  const { error: sendError } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: customer.email,
    subject: rendered.subject,
    text: rendered.text,
  });

  return { ...ok, password, emailSent: !sendError };
}
