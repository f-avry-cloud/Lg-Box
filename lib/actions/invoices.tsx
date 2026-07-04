"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateInvoiceForContract } from "@/lib/business/generate-invoice";
import { renderPdfBuffer } from "@/lib/pdf/generate";
import { InvoiceDocument } from "@/lib/pdf/invoice-document";
import { formatCurrency, formatDate } from "@/lib/format";
import { daysUntil } from "@/lib/business/notice";
import { getResend, FROM_EMAIL } from "@/lib/email/resend";
import { renderInvoiceReadyEmail, renderReminderEmail, type ReminderStage } from "@/lib/email/templates";
import type { PaymentMethod } from "@/types/database";

export type InvoiceFormState = { error: string | null; success?: boolean; invoiceId?: string };

export type BulkInvoiceResult = {
  created: number;
  skipped: number;
  emailsSent: number;
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

    const { subject, text } = renderInvoiceReadyEmail({
      prenom: customer.prenom,
      montant: formatCurrency(invoice.montant_ttc),
      numero_facture: invoice.numero_facture,
      date_echeance: formatDate(invoice.date_echeance),
    });

    await getResend().emails.send({ from: FROM_EMAIL, to: customer.email, subject, text });
    sent += 1;
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
) {
  await requireStaff();
  const supabase = await createClient();

  const { data: invoice } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
  if (!invoice) throw new Error("Facture introuvable.");

  const { error: paymentError } = await supabase.from("payments").insert({
    invoice_id: invoiceId,
    customer_id: invoice.customer_id,
    montant: input.montant,
    methode: input.methode,
    date_paiement: input.datePaiement,
    reference: input.reference || null,
    statut: "valide",
  });
  if (paymentError) throw new Error(paymentError.message);

  const { error: invoiceError } = await supabase
    .from("invoices")
    .update({ statut: "payee" })
    .eq("id", invoiceId);
  if (invoiceError) throw new Error(invoiceError.message);

  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath("/admin/invoices");
}

// Envoi manuel d'une relance à la demande de l'admin (bouton "Relancer"),
// indépendant du cron quotidien. Le palier de ton (j-3/j0/j+7/j+15) est
// déduit du retard actuel. Toujours journalisé dans activity_log, sans
// bloquer un futur envoi automatique du même palier ce jour-là.
export async function sendManualReminder(invoiceId: string) {
  await requireStaff();
  const supabase = await createClient();

  const { data: invoice } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
  if (!invoice) throw new Error("Facture introuvable.");

  const { data: customer } = await supabase
    .from("customers")
    .select("prenom, email")
    .eq("id", invoice.customer_id)
    .single();
  if (!customer) throw new Error("Client introuvable.");

  const late = -daysUntil(new Date(invoice.date_echeance));
  let stage: ReminderStage = "j-3";
  if (late >= 15) stage = "j+15";
  else if (late >= 7) stage = "j+7";
  else if (late >= 0) stage = "j0";

  const { subject, text } = renderReminderEmail(stage, {
    prenom: customer.prenom,
    montant: formatCurrency(invoice.montant_ttc),
    numero_facture: invoice.numero_facture,
    date_echeance: formatDate(invoice.date_echeance),
  });

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY non configurée — impossible d'envoyer l'email.");
  }
  await getResend().emails.send({ from: FROM_EMAIL, to: customer.email, subject, text });

  await supabase.from("activity_log").insert({
    action: `reminder_manual_${stage}`,
    table_concernee: "invoices",
    enregistrement_id: invoiceId,
    detail: { numero_facture: invoice.numero_facture, stage, triggered: "manual" },
  });

  revalidatePath("/admin/invoices");
}

export async function cancelInvoice(invoiceId: string) {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("invoices").update({ statut: "annulee" }).eq("id", invoiceId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath("/admin/invoices");
}

export async function generateInvoicePdf(invoiceId: string): Promise<string> {
  await requireStaff();
  const supabase = await createClient();

  const { data: invoice } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
  if (!invoice) throw new Error("Facture introuvable.");
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", invoice.customer_id)
    .single();
  const { data: company } = await supabase.from("company_settings").select("*").single();
  if (!customer || !company) throw new Error("Données manquantes pour générer le PDF.");

  const buffer = await renderPdfBuffer(
    <InvoiceDocument invoice={invoice} customer={customer} company={company} />
  );

  const path = `${customer.id}/${invoice.id}.pdf`;
  const service = createServiceClient();
  const { error: uploadError } = await service.storage
    .from("invoices")
    .upload(path, buffer, { contentType: "application/pdf", upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  await supabase.from("invoices").update({ facture_pdf_url: path }).eq("id", invoiceId);
  revalidatePath(`/admin/invoices/${invoiceId}`);

  return path;
}
