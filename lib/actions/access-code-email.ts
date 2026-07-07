"use server";

import { createClient } from "@/lib/supabase/server";
import { renderEmailTemplate, type EmailVars } from "@/lib/email/templates";
import { getResend, FROM_EMAIL } from "@/lib/email/resend";
import { ok, fail, type ActionResult } from "@/lib/actions/result";
import type { EmailTemplateKey } from "@/types/database";

// Partagé par l'envoi du code de porte générale et du code de box —
// même modèle d'échec explicite que les autres envois (relances, signature).
export async function sendAccessCodeEmail(
  key: EmailTemplateKey,
  to: { email: string; prenom: string },
  vars: Omit<EmailVars, "prenom">
): Promise<ActionResult> {
  const supabase = await createClient();

  const rendered = await renderEmailTemplate(supabase, key, { prenom: to.prenom, ...vars });
  if (!rendered) return fail("Modèle d'email introuvable.");

  if (!process.env.RESEND_API_KEY) {
    return fail("RESEND_API_KEY non configurée dans les variables d'environnement Vercel — impossible d'envoyer l'email.");
  }

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: to.email,
    subject: rendered.subject,
    text: rendered.text,
  });
  if (error) return fail(error.message);

  return ok;
}
