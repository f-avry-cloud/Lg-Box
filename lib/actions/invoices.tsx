"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateInvoiceForContract } from "@/lib/business/generate-invoice";
import { renderPdfBuffer } from "@/lib/pdf/generate";
import { InvoiceDocument } from "@/lib/pdf/invoice-document";
import type { PaymentMethod } from "@/types/database";

export type InvoiceFormState = { error: string | null; success?: boolean; invoiceId?: string };

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
