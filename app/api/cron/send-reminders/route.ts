import { NextResponse, type NextRequest } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { daysUntil } from "@/lib/business/notice";
import { formatCurrency, formatDate } from "@/lib/format";
import { getResend, FROM_EMAIL } from "@/lib/email/resend";
import { renderEmailTemplate, type ReminderStage } from "@/lib/email/templates";

// Relances automatiques : J-3 avant échéance, le jour J, puis J+7 et J+15
// après échéance si toujours impayée. A planifier quotidiennement via
// Vercel Cron (voir vercel.json). Le journal d'activité (activity_log) sert
// de garde-fou pour ne jamais envoyer deux fois la même relance.
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const today = new Date();

  // 1. Bascule les factures échues et toujours émises en "en_retard".
  const { data: dueUnpaid } = await supabase
    .from("invoices")
    .select("id, date_echeance")
    .eq("statut", "emise");
  const overdueIds = (dueUnpaid ?? [])
    .filter((i) => daysUntil(new Date(i.date_echeance), today) < 0)
    .map((i) => i.id);
  if (overdueIds.length > 0) {
    await supabase.from("invoices").update({ statut: "en_retard" }).in("id", overdueIds);
  }

  // 2. Sélectionne les factures candidates à une relance.
  const { data: candidates } = await supabase
    .from("invoices")
    .select("*")
    .in("statut", ["emise", "en_retard"]);

  const sent: string[] = [];
  const skipped: string[] = [];

  for (const invoice of candidates ?? []) {
    const delta = daysUntil(new Date(invoice.date_echeance), today);
    let stage: ReminderStage | null = null;
    if (delta === 3) stage = "j-3";
    else if (delta === 0) stage = "j0";
    else if (delta === -7) stage = "j+7";
    else if (delta === -15) stage = "j+15";
    if (!stage) continue;

    const action = `reminder_${stage}`;
    const { data: alreadySent } = await supabase
      .from("activity_log")
      .select("id")
      .eq("table_concernee", "invoices")
      .eq("enregistrement_id", invoice.id)
      .eq("action", action)
      .limit(1);
    if (alreadySent && alreadySent.length > 0) {
      skipped.push(invoice.id);
      continue;
    }

    const { data: customer } = await supabase
      .from("customers")
      .select("prenom, email")
      .eq("id", invoice.customer_id)
      .single();
    if (!customer) continue;

    const rendered = await renderEmailTemplate(supabase, stage, {
      prenom: customer.prenom,
      montant: formatCurrency(invoice.montant_ttc),
      numero_facture: invoice.numero_facture,
      date_echeance: formatDate(invoice.date_echeance),
    });
    if (!rendered) continue;

    if (process.env.RESEND_API_KEY) {
      await getResend().emails.send({
        from: FROM_EMAIL,
        to: customer.email,
        subject: rendered.subject,
        text: rendered.text,
      });
    }

    await supabase.from("activity_log").insert({
      action,
      table_concernee: "invoices",
      enregistrement_id: invoice.id,
      detail: { numero_facture: invoice.numero_facture, stage },
    });

    sent.push(invoice.id);
  }

  return NextResponse.json({ markedOverdue: overdueIds.length, sent: sent.length, skipped: skipped.length });
}
