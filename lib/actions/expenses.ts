"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult } from "@/lib/actions/result";

export type ExpenseFormState = { error: string | null; success?: boolean };

export async function createExpense(
  _prevState: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  await requireStaff();
  const supabase = await createClient();

  const categorie = String(formData.get("categorie") ?? "").trim();
  const montant = Number(formData.get("montant") ?? 0);
  if (!categorie || !montant) {
    return { error: "Catégorie et montant sont obligatoires." };
  }

  const { error } = await supabase.from("expenses").insert({
    categorie,
    montant,
    date_depense: String(formData.get("date_depense") ?? new Date().toISOString().slice(0, 10)),
    fournisseur: String(formData.get("fournisseur") ?? "") || null,
    description: String(formData.get("description") ?? "") || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/expenses");
  revalidatePath("/admin/reports");
  return { error: null, success: true };
}

export async function deleteExpense(expenseId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
  if (error) return fail(error.message);
  revalidatePath("/admin/expenses");
  revalidatePath("/admin/reports");
  return ok;
}
