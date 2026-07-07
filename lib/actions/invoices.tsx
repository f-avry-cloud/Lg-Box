"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateInvoiceForContract } from "@/lib/business/generate-invoice";
import { ensureInvoicePdf } from "@/lib/pdf/render-invoice";
import { formatCurrency, formatDate } from "@/lib/format";
import { daysUntil } from "@/lib/business/notice";
import { getResend, FROM_EMAIL } from "@/lib/email/resend";
import { renderEmailTemplate, type ReminderStage } from "@/lib/email/templates";
import { ok, fail, type ActionResult } from "@/lib/actions/result";
import type { PaymentMethod } from "@/types/database";

export type InvoiceFormState = { error: string | null; success?: boolean; invoiceId?: string };

export type BulkInvoiceResult = {
  created: number;
  skipped: number;
  emailsSent: number;
  errors: string[];
};

export type BulkReminderResult = {
  sent: number;
  skipped: number;
  errors: string[];
};

// Génère les factures du mois en cours pour tous les contrats actifs/en préavis
// qui n'en ont pas déjà une pour cette période, puis notifie les clients par email.
export async function generateAndSendMonthlyInvoices(): Promise<BulkInvoiceResult> {
  await requireStaff();
  const supabase = await createClient();

  const now = new Date();
  const periodeDebut = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().slice(0, 10);
  const periodeFin = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0)).toISOString().slice(0, 10);

  const { data: contracts } = await supabase
    .from("contracts")
    .select("id")
    .in("statut", ["actif", "en_preavis"]);

  const { data: existingInvoices } = await supabase
    .from("invoices")
    .select("contract_id")
    .eq("periode_debut", periodeDebut);
  const alreadyInvoiced = new Set((existingInvoices ?? []).map((i) => i.contract_id));

  const createdInvoiceIds: string[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (const contract of contracts ?? []) {
    if (alreadyInvoiced.has(contract.id)) {
      skipped += 1;
      continue;
    }
    try {
      const invoiceId = await generateInvoiceForContract(supabase, contract.id, periodeDebut, periodeFin);
      createdInvoiceIds.push(invoiceId);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "Erreur inconnue");
    }
  }

  const emailsSent = await sendInvoiceNotifications(createdInvoiceIds);

  revalidatePath("/admin/invoices");
  return { created: createdInvoiceIds.length, skipped, emailsSent, errors };
}

// Envoie un email "facture disponible" pour chaque facture listée. Utilisé
// juste après une génération groupée, mais aussi réutilisable seul.
export async function sendInvoiceNotifications(invoiceIds: string[]): Promise<number> {
  if (invoiceIds.length === 0) return 0;
  await requireStaff();
  const supabase = await createClient();

  const { data: invoices } = await supabase.from("invoices").select("*").in("id", invoiceIds);
  if (!invoices || invoices.length === 0) return 0;

  const customerIds = [...new Set(invoices.map((i) => i.customer_id))];
  const { data: customers } = await supabase
    .from("customers")
    .select("id, prenom, email")
    .in("id", customerIds);
  const customerById = new Map((customers ?? []).map((c) => [c.id, c]));

  let sent = 0;
  for (const invoice of invoices) {
    const customer = customerById.get(invoice.customer_id);
    if (!customer || !process.env.RESEND_API_KEY) continue;

    const rendered = await renderEmailTemplate(supabase, "invoice_ready", {
      prenom: customer.prenom,
      montant: formatCurrency(invoice.montant_ttc),
      numero_facture: invoice.numero_facture,
      date_echeance: formatDate(invoice.date_echeance),
    });
    if (!rendered) continue;

    const { error: sendError } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: customer.email,
      subject: rendered.subject,
      text: rendered.text,
    });
    if (!sendError) sent += 1;
  }

  return sent;
}

export async function createManualInvoice(
  _prevState: InvoiceFormState,
  formData: FormData
): Promise<InvoiceFormState> {
  await requireStaff();

  const contractId = String(formData.get("contract_id") ?? "");
  const periodeDebut = String(formData.get("periode_debut") ?? "");
  const periodeFin = String(formData.get("periode_fin") ?? "");
  const montantOverride = formData.get("montant_ttc")
    ? Number(formData.get("montant_ttc"))
    : undefined;

  if (!contractId || !periodeDebut || !periodeFin) {
    return { error: "Contrat et période sont obligatoires." };
  }

  try {
    const supabase = await createClient();
    const invoiceId = await generateInvoiceForContract(
      supabase,
      contractId,
      periodeDebut,
      periodeFin,
      montantOverride
    );
    revalidatePath("/admin/invoices");
    return { error: null, success: true, invoiceId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue." };
  }
}

export async function markInvoicePaid(
  invoiceId: string,
  input: { montant: number; methode: PaymentMethod; datePaiement: string; reference?: string }
): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();

  const { data: invoice } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
  if (!invoice) return fail("Facture introuvable.");

  const { error: paymentError } = await supabase.from("payments").insert({
    invoice_id: invoiceId,
    customer_id: invoice.customer_id,
    montant: input.montant,
    methode: input.methode,
    date_paiement: input.datePaiement,
    reference: input.reference || null,
    statut: "valide",
  });
  if (paymentError) return fail(paymentError.message);

  const { error: invoiceError } = await supabase
    .from("invoices")
    .update({ statut: "payee" })
    .eq("id", invoiceId);
  if (invoiceError) return fail(invoiceError.message);

  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath("/admin/invoices");
  return ok;
}

// Envoi manuel d'une relance à la demande de l'admin (bouton "Relancer"),
// indépendant du cron quotidien. Le palier de ton (j-3/j0/j+7/j+15) est
// déduit du retard actuel. Toujours journalisé dans activity_log, sans
// bloquer un futur envoi automatique du même palier ce jour-là.
export async function sendManualReminder(invoiceId: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();

  const { data: invoice } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
  if (!invoice) return fail("Facture introuvable.");

  const { data: customer } = await supabase
    .from("customers")
    .select("prenom, email")
    .eq("id", invoice.customer_id)
    .single();
  if (!customer) return fail("Client introuvable.");

  const stage = reminderStageForDaysLate(-daysUntil(new Date(invoice.date_echeance)));

  const rendered = await renderEmailTemplate(supabase, stage, {
    prenom: customer.prenom,
    montant: formatCurrency(invoice.montant_ttc),
    numero_facture: invoice.numero_facture,
    date_echeance: formatDate(invoice.date_echeance),
  });
  if (!rendered) {
    return fail("Modèle d'email introuvable — exécutez la migration supabase/migrations/003_v1_2.sql.");
  }

  if (!process.env.RESEND_API_KEY) {
    return fail("RESEND_API_KEY non configurée dans les variables d'environnement Vercel — impossible d'envoyer l'email.");
  }

  const { error: sendError } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: customer.email,
    subject: rendered.subject,
    text: rendered.text,
  });
  if (sendError) return fail(sendError.message);

  await supabase.from("activity_log").insert({
    action: `reminder_manual_${stage}`,
    table_concernee: "invoices",
    enregistrement_id: invoiceId,
    detail: { numero_facture: invoice.numero_facture, stage, triggered: "manual" },
  });

  revalidatePath("/admin/invoices");
  return ok;
}

// Prépare le sujet/corps/destinataire de la relance sans l'envoyer, pour
// ouvrir un brouillon dans le client mail par défaut de l'admin (texte
// modifiable avant envoi), plutôt que de passer par Resend.
export async function previewReminderEmail(
  invoiceId: string
): Promise<ActionResult & { to?: string; subject?: string; body?: string }> {
  await requireStaff();
  const supabase = await createClient();

  const { data: invoice } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
  if (!invoice) return fail("Facture introuvable.");

  const { data: customer } = await supabase
    .from("customers")
    .select("prenom, email")
    .eq("id", invoice.customer_id)
    .single();
  if (!customer) return fail("Client introuvable.");

  const stage = reminderStageForDaysLate(-daysUntil(new Date(invoice.date_echeance)));
  const rendered = await renderEmailTemplate(supabase, stage, {
    prenom: customer.prenom,
    montant: formatCurrency(invoice.montant_ttc),
    numero_facture: invoice.numero_facture,
    date_echeance: formatDate(invoice.date_echeance),
  });
  if (!rendered) {
    return fail("Modèle d'email introuvable — exécutez la migration supabase/migrations/003_v1_2.sql.");
  }

  return { ...ok, to: customer.email, subject: rendered.subject, body: rendered.text };
}

function reminderStageForDaysLate(daysLate: number): ReminderStage {
  if (daysLate >= 15) return "j+15";
  if (daysLate >= 7) return "j+7";
  if (daysLate >= 0) return "j0";
  return "j-3";
}

// Envoie la relance manuelle à toutes les factures actuellement impayées
// (émises ou en retard) en une fois, avec le palier de ton adapté à chacune.
export async function sendAllReminders(): Promise<BulkReminderResult> {
  await requireStaff();
  const supabase = await createClient();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .in("statut", ["emise", "en_retard"]);

  const errors: string[] = [];
  let sent = 0;
  let skipped = 0;

  for (const invoice of invoices ?? []) {
    const result = await sendManualReminder(invoice.id);
    if (result.success) sent += 1;
    else {
      skipped += 1;
      errors.push(`${invoice.numero_facture} : ${result.error}`);
    }
  }

  return { sent, skipped, errors };
}

export async function cancelInvoice(invoiceId: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("invoices").update({ statut: "annulee" }).eq("id", invoiceId);
  if (error) return fail(error.message);
  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath("/admin/invoices");
  return ok;
}

export async function generateInvoicePdf(invoiceId: string): Promise<ActionResult & { path?: string }> {
  await requireStaff();
  const supabase = await createClient();

  const { data: invoice } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
  if (!invoice) return fail("Facture introuvable.");
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", invoice.customer_id)
    .single();
  const { data: company } = await supabase.from("company_settings").select("*").single();
  if (!customer || !company) return fail("Données manquantes pour générer le PDF.");

  const service = createServiceClient();
  // On force la régénération (le PDF peut être obsolète après un changement de loyer,
  // de mentions légales ou de CGV) plutôt que de réutiliser un fichier déjà stocké.
  const { path } = await ensureInvoicePdf(service, { ...invoice, facture_pdf_url: null }, customer, company);

  await supabase.from("invoices").update({ facture_pdf_url: path }).eq("id", invoiceId);
  revalidatePath(`/admin/invoices/${invoiceId}`);

  return { ...ok, path };
}
