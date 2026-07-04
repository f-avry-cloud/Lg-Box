import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, EmailTemplateKey } from "@/types/database";

export type ReminderStage = "j-3" | "j0" | "j+7" | "j+15";

export type EmailVars = {
  prenom: string;
  montant: string;
  numero_facture: string;
  date_echeance: string;
  lien_portail: string;
};

function interpolate(text: string, vars: EmailVars): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value),
    text
  );
}

export function portailLink(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return `${base}/portail/factures`;
}

// Récupère un modèle d'email éditable (Paramètres > Modèles d'email) et
// l'interpole avec les variables fournies. Renvoie null si le modèle n'existe
// pas encore en base (avant la migration 003_v1_2.sql).
export async function renderEmailTemplate(
  supabase: SupabaseClient<Database>,
  key: EmailTemplateKey,
  vars: Omit<EmailVars, "lien_portail">
): Promise<{ subject: string; text: string } | null> {
  const { data: template } = await supabase.from("email_templates").select("*").eq("key", key).single();
  if (!template) return null;

  const allVars: EmailVars = { ...vars, lien_portail: portailLink() };
  return {
    subject: interpolate(template.subject, allVars),
    text: interpolate(template.body, allVars),
  };
}
