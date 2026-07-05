"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult } from "@/lib/actions/result";

export type BankImportRow = { date: string; libelle: string; montant: number };

export async function importBankStatement(
  rows: BankImportRow[]
): Promise<ActionResult & { imported?: number }> {
  await requireStaff();
  if (rows.length === 0) return { ...ok, imported: 0 };
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
  if (error) return fail(error.message);

  revalidatePath("/admin/bank");
  return { ...ok, imported: rows.length };
}

// Valide un rapprochement : enregistre le paiement sur la facture choisie,
// la marque payée, et referme la ligne bancaire correspondante.
export async function validateBankMatch(transactionId: string, invoiceId: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();

  const { data: transaction } = await supabase
    .from("bank_transactions")
    .select("*")
    .eq("id", transactionId)
    .single();
  if (!transaction) return fail("Opération bancaire introuvable.");

  const { data: invoice } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
  if (!invoice) return fail("Facture introuvable.");

  const { error: paymentError } = await supabase.from("payments").insert({
    invoice_id: invoiceId,
    customer_id: invoice.customer_id,
    montant: transaction.montant,
    methode: "virement",
    date_paiement: transaction.date_operation,
    reference: transaction.libelle,
    statut: "valide",
  });
  if (paymentError) return fail(paymentError.message);

  const { error: invoiceError } = await supabase
    .from("invoices")
    .update({ statut: "payee" })
    .eq("id", invoiceId);
  if (invoiceError) return fail(invoiceError.message);

  const { error: transactionError } = await supabase
    .from("bank_transactions")
    .update({ statut: "rapproche", invoice_id: invoiceId })
    .eq("id", transactionId);
  if (transactionError) return fail(transactionError.message);

  revalidatePath("/admin/bank");
  revalidatePath("/admin/invoices");
  return ok;
}

export async function ignoreBankTransaction(transactionId: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase
    .from("bank_transactions")
    .update({ statut: "ignore" })
    .eq("id", transactionId);
  if (error) return fail(error.message);
  revalidatePath("/admin/bank");
  return ok;
}

// Rapproche une opération sortante avec une dépense déjà enregistrée.
export async function linkTransactionToExpense(
  transactionId: string,
  expenseId: string
): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase
    .from("bank_transactions")
    .update({ statut: "rapproche", expense_id: expenseId })
    .eq("id", transactionId);
  if (error) return fail(error.message);
  revalidatePath("/admin/bank");
  revalidatePath("/admin/expenses");
  revalidatePath("/admin/reports");
  return ok;
}

// Crée une dépense directement à partir d'une opération bancaire sortante
// (montant, date et libellé repris automatiquement), puis la rapproche.
export async function createExpenseFromTransaction(
  transactionId: string,
  categorie: string
): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();

  const { data: transaction } = await supabase
    .from("bank_transactions")
    .select("*")
    .eq("id", transactionId)
    .single();
  if (!transaction) return fail("Opération bancaire introuvable.");
  if (!categorie.trim()) return fail("Catégorie requise.");

  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .insert({
      categorie: categorie.trim(),
      montant: Math.abs(transaction.montant),
      date_depense: transaction.date_operation,
      description: transaction.libelle,
    })
    .select("id")
    .single();
  if (expenseError) return fail(expenseError.message);

  const { error: transactionError } = await supabase
    .from("bank_transactions")
    .update({ statut: "rapproche", expense_id: expense.id })
    .eq("id", transactionId);
  if (transactionError) return fail(transactionError.message);

  revalidatePath("/admin/bank");
  revalidatePath("/admin/expenses");
  revalidatePath("/admin/reports");
  return ok;
}
