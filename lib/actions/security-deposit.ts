"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult } from "@/lib/actions/result";
import { computeDepositStatusAfterRefund, validateRefund } from "@/lib/business/security-deposit";
import type { PaymentMethod, SecurityDepositStatus } from "@/types/database";

// Crée ou met à jour le dépôt de garantie d'un contrat (un seul par
// contrat). Le statut passe à "demande" ou "recu" selon la présence d'un
// montant reçu, sauf si l'admin le force explicitement dans le formulaire.
export async function upsertSecurityDeposit(
  contractId: string,
  customerId: string,
  formData: FormData
): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();

  const amountExpected = Number(formData.get("amount_expected") ?? 0);
  const amountReceivedRaw = String(formData.get("amount_received") ?? "").trim();
  const amountReceived = amountReceivedRaw ? Number(amountReceivedRaw) : null;
  const paymentMethod = (String(formData.get("payment_method") ?? "") || null) as PaymentMethod | null;
  const receivedAt = String(formData.get("received_at") ?? "") || null;

  let status: SecurityDepositStatus = "non_demande";
  if (amountReceived !== null && amountReceived > 0) status = "recu";
  else if (amountExpected > 0) status = "demande";

  const { data: existing } = await supabase
    .from("security_deposits")
    .select("id")
    .eq("contract_id", contractId)
    .maybeSingle();

  const payload = {
    contract_id: contractId,
    customer_id: customerId,
    amount_expected: amountExpected,
    amount_received: amountReceived,
    payment_method: paymentMethod,
    received_at: receivedAt,
    status,
  };

  const { error } = existing
    ? await supabase.from("security_deposits").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", existing.id)
    : await supabase.from("security_deposits").insert(payload);

  if (error) return fail(error.message);

  revalidatePath(`/admin/contracts/${contractId}`);
  revalidatePath("/admin/reports");
  return ok;
}

// Restitution du dépôt (à la résiliation) : montant à restituer, éditable
// pour déduire des sommes dues, avec motif obligatoire dès que le montant
// restitué est inférieur au montant reçu.
export async function refundSecurityDeposit(depositId: string, formData: FormData): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();

  const { data: deposit } = await supabase.from("security_deposits").select("*").eq("id", depositId).single();
  if (!deposit) return fail("Dépôt de garantie introuvable.");
  if (!deposit.amount_received) return fail("Aucun montant reçu à restituer.");

  const amountRefunded = Number(formData.get("amount_refunded") ?? 0);
  const refundedAt = String(formData.get("refunded_at") ?? "") || new Date().toISOString().slice(0, 10);
  const refundReason = String(formData.get("refund_reason") ?? "").trim();

  const validation = validateRefund({
    amountReceived: deposit.amount_received,
    amountRefunded,
    reason: refundReason,
  });
  if (!validation.valid) return fail(validation.error);

  const status = computeDepositStatusAfterRefund(deposit.amount_received, amountRefunded);

  const { error } = await supabase
    .from("security_deposits")
    .update({
      amount_refunded: amountRefunded,
      refunded_at: refundedAt,
      refund_reason: refundReason || null,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", depositId);
  if (error) return fail(error.message);

  revalidatePath(`/admin/contracts/${deposit.contract_id}`);
  revalidatePath("/admin/reports");
  return ok;
}
