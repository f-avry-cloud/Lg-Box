"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type BankImportRow = { date: string; libelle: string; montant: number };

export async function importBankStatement(rows: BankImportRow[]): Promise<{ imported: number }> {
  await requireStaff();
  if (rows.length === 0) return { imported: 0 };
  const supabase = await createClient();

  const batchId = randomUUID();
  const { error } = await supabase.from("bank_transactions").insert(
    rows.map((r) => ({
      import_batch_id: batchId,
      date_operation: r.date,
      libelle: r.libelle,
      montant: r.montant,
      statut: "non_rapproche" as const,
    }))
  );
  if (error) throw new Error(error.message);

  revalidatePath("/admin/bank");
  return { imported: rows.length };
}

// Valide un rapprochement : enregistre le paiement sur la facture choisie,
// la marque payée, et referme la ligne bancaire correspondante.
export async function validateBankMatch(transactionId: string, invoiceId: string) {
  await requireStaff();
  const supabase = await createClient();

  const { data: transaction } = await supabase
    .from("bank_transactions")
    .select("*")
    .eq("id", transactionId)
    .single();
  if (!transaction) throw new Error("Opération bancaire introuvable.");

  const { data: invoice } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
  if (!invoice) throw new Error("Facture introuvable.");

  const { error: paymentError } = await supabase.from("payments").insert({
    invoice_id: invoiceId,
    customer_id: invoice.customer_id,
    montant: transaction.montant,
    methode: "virement",
    date_paiement: transaction.date_operation,
    reference: transaction.libelle,
    statut: "valide",
  });
  if (paymentError) throw new Error(paymentError.message);

  const { error: invoiceError } = await supabase
    .from("invoices")
    .update({ statut: "payee" })
    .eq("id", invoiceId);
  if (invoiceError) throw new Error(invoiceError.message);

  const { error: transactionError } = await supabase
    .from("bank_transactions")
    .update({ statut: "rapproche", invoice_id: invoiceId })
    .eq("id", transactionId);
  if (transactionError) throw new Error(transactionError.message);

  revalidatePath("/admin/bank");
  revalidatePath("/admin/invoices");
}

export async function ignoreBankTransaction(transactionId: string) {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase
    .from("bank_transactions")
    .update({ statut: "ignore" })
    .eq("id", transactionId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/bank");
}
