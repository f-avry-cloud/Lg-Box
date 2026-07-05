"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult } from "@/lib/actions/result";
import { geocodeAddress } from "@/lib/geocoding";
import type { CustomerType } from "@/types/database";

export type CustomerFormState = { error: string | null; success?: boolean; customerId?: string };

export async function createCustomer(
  _prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  await requireStaff();
  const supabase = await createClient();

  const adresse = String(formData.get("adresse") ?? "") || null;
  const ville = String(formData.get("ville") ?? "") || null;
  const codePostal = String(formData.get("code_postal") ?? "") || null;
  const coords = await geocodeAddress(adresse, codePostal, ville);

  const { data, error } = await supabase
    .from("customers")
    .insert({
      prenom: String(formData.get("prenom") ?? "").trim(),
      nom: String(formData.get("nom") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      telephone: String(formData.get("telephone") ?? "") || null,
      adresse,
      ville,
      code_postal: codePostal,
      type: String(formData.get("type") ?? "particulier") as CustomerType,
      siret: String(formData.get("siret") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/customers");
  return { error: null, success: true, customerId: data.id };
}

export async function updateCustomerNotes(customerId: string, notes: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("customers").update({ notes }).eq("id", customerId);
  if (error) return fail(error.message);
  revalidatePath(`/admin/customers/${customerId}`);
  return ok;
}

export async function recordDocument(input: {
  relatedTable: string;
  relatedId: string;
  nomFichier: string;
  url: string;
  type: "contrat" | "facture" | "piece_identite" | "autre";
}): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("documents").insert({
    related_table: input.relatedTable,
    related_id: input.relatedId,
    nom_fichier: input.nomFichier,
    url: input.url,
    type: input.type,
  });
  if (error) return fail(error.message);
  revalidatePath(`/admin/customers/${input.relatedId}`);
  return ok;
}

export async function deleteCustomerDocument(documentId: string, customerId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("documents").delete().eq("id", documentId);
  if (error) return fail(error.message);
  revalidatePath(`/admin/customers/${customerId}`);
  return ok;
}
