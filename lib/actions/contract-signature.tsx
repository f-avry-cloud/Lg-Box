"use server";

import { randomBytes, createHash } from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireStaff } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult } from "@/lib/actions/result";
import { renderEmailTemplate, signatureLink } from "@/lib/email/templates";
import { getResend, FROM_EMAIL } from "@/lib/email/resend";
import { isSignatureTokenValid, SIGNATURE_TOKEN_TTL_DAYS } from "@/lib/business/contract-signature";
import { renderContractPlainText } from "@/lib/pdf/contract-template";
import { CertifiedContractDocument } from "@/lib/pdf/certified-contract-document";
import { renderPdfBuffer } from "@/lib/pdf/generate";
import type { Database } from "@/types/database";

// Crée (ou renouvelle) une demande de signature : nouveau token à usage
// unique, expirant dans SIGNATURE_TOKEN_TTL_DAYS jours. Appelée aussi bien
// depuis l'action staff "Envoyer pour signature" que depuis la relance
// automatique du cron lorsqu'un lien précédent a expiré — toujours avec un
// client service role, cette table n'ayant aucune policy d'écriture.
export async function createSignatureRequest(
  supabase: SupabaseClient<Database>,
  contractId: string
): Promise<{ token: string } | { error: string }> {
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, customer_id, signature_status")
    .eq("id", contractId)
    .single();
  if (!contract) return { error: "Contrat introuvable." };
  if (contract.signature_status === "signe") return { error: "Ce contrat est déjà signé." };

  const token = randomBytes(32).toString("hex");
  const tokenExpiresAt = new Date(Date.now() + SIGNATURE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const { error } = await supabase.from("contract_signatures").insert({
    contract_id: contract.id,
    customer_id: contract.customer_id,
    signature_token: token,
    token_expires_at: tokenExpiresAt.toISOString(),
  });
  if (error) return { error: error.message };

  await supabase.from("contracts").update({ signature_status: "en_attente" }).eq("id", contract.id);

  return { token };
}

async function loadEmailPayload(service: SupabaseClient<Database>, contractId: string) {
  const { data: contract } = await service.from("contracts").select("*").eq("id", contractId).single();
  if (!contract) return null;
  const { data: customer } = await service
    .from("customers")
    .select("prenom, email")
    .eq("id", contract.customer_id)
    .single();
  if (!customer) return null;
  return { contract, customer };
}

// Bouton "Envoyer pour signature" sur la fiche contrat (staff).
export async function sendContractForSignature(contractId: string): Promise<ActionResult> {
  await requireStaff();
  const service = createServiceClient();

  const created = await createSignatureRequest(service, contractId);
  if ("error" in created) return fail(created.error);

  const payload = await loadEmailPayload(service, contractId);
  if (!payload) return fail("Contrat ou client introuvable.");

  const rendered = await renderEmailTemplate(service, "contract_signature_request", {
    prenom: payload.customer.prenom,
    lien_signature: signatureLink(created.token),
  });

  if (rendered && process.env.RESEND_API_KEY) {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: payload.customer.email,
      subject: rendered.subject,
      text: rendered.text,
    });
  }

  await service.from("activity_log").insert({
    action: "contract_signature_requested",
    table_concernee: "contracts",
    enregistrement_id: contractId,
    detail: { resend_configured: Boolean(process.env.RESEND_API_KEY) },
  });

  revalidatePath(`/admin/contracts/${contractId}`);
  revalidatePath("/admin/contracts");
  return ok;
}

// Bouton "Mail" de secours (mailto), même principe que pour les relances de facture.
export async function previewSignatureRequestEmail(
  contractId: string
): Promise<ActionResult & { to?: string; subject?: string; body?: string }> {
  await requireStaff();
  const service = createServiceClient();

  const payload = await loadEmailPayload(service, contractId);
  if (!payload) return fail("Contrat ou client introuvable.");

  const { data: latest } = await service
    .from("contract_signatures")
    .select("*")
    .eq("contract_id", contractId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const token = latest && isSignatureTokenValid(latest).valid ? latest.signature_token : null;
  if (!token) return fail("Aucun lien de signature valide — cliquez d'abord sur « Envoyer pour signature ».");

  const rendered = await renderEmailTemplate(service, "contract_signature_request", {
    prenom: payload.customer.prenom,
    lien_signature: signatureLink(token),
  });
  if (!rendered) return fail("Modèle d'email introuvable.");

  return { ...ok, to: payload.customer.email, subject: rendered.subject, body: rendered.text };
}

// Signature via le lien public à token — aucune session utilisateur : tout
// passe par le service role, en dehors du contexte RLS.
export async function signContract(token: string, signerFullName: string): Promise<ActionResult> {
  const fullName = signerFullName.trim();
  if (!fullName) return fail("Merci de saisir votre nom complet.");

  const service = createServiceClient();

  const { data: signature } = await service
    .from("contract_signatures")
    .select("*")
    .eq("signature_token", token)
    .maybeSingle();
  if (!signature) return fail("Lien de signature introuvable.");

  const check = isSignatureTokenValid(signature);
  if (!check.valid) {
    return fail(
      check.reason === "used"
        ? "Ce contrat a déjà été signé avec ce lien."
        : "Ce lien de signature a expiré — contactez-nous pour en recevoir un nouveau."
    );
  }

  const { data: contract } = await service
    .from("contracts")
    .select("*")
    .eq("id", signature.contract_id)
    .single();
  const { data: customer } = contract
    ? await service.from("customers").select("*").eq("id", contract.customer_id).single()
    : { data: null };
  const { data: unit } = contract
    ? await service.from("units").select("*").eq("id", contract.unit_id).single()
    : { data: null };
  const { data: company } = await service.from("company_settings").select("*").single();
  if (!contract || !customer || !unit || !company) return fail("Données du contrat introuvables.");

  const headersList = await headers();
  const ipAddress = (headersList.get("x-forwarded-for") ?? "inconnue").split(",")[0].trim();
  const userAgent = headersList.get("user-agent");

  const documentText = renderContractPlainText(contract, customer, unit, company);
  const documentHash = createHash("sha256").update(documentText).digest("hex");
  const signedAt = new Date();

  const buffer = await renderPdfBuffer(
    <CertifiedContractDocument
      contract={contract}
      customer={customer}
      unit={unit}
      company={company}
      proof={{
        signerFullName: fullName,
        signedAt: signedAt.toISOString(),
        ipAddress,
        userAgent,
        documentHash,
        contractId: contract.id,
      }}
    />
  );

  const signedDocumentPath = `${customer.id}/${contract.id}-signe.pdf`;
  const { error: uploadError } = await service.storage
    .from("contracts")
    .upload(signedDocumentPath, buffer, { contentType: "application/pdf", upsert: true });
  if (uploadError) return fail(uploadError.message);

  await service
    .from("contract_signatures")
    .update({
      signer_full_name: fullName,
      signed_at: signedAt.toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
      document_hash: documentHash,
      signed_document_path: signedDocumentPath,
      token_used_at: signedAt.toISOString(),
    })
    .eq("id", signature.id);

  await service
    .from("contracts")
    .update({ signature_status: "signe", date_signature: signedAt.toISOString().slice(0, 10) })
    .eq("id", contract.id);

  await service.from("activity_log").insert({
    action: "contract_signed",
    table_concernee: "contracts",
    enregistrement_id: contract.id,
    detail: { signer_full_name: fullName, ip_address: ipAddress },
  });

  revalidatePath(`/admin/contracts/${contract.id}`);
  revalidatePath("/admin/contracts");
  revalidatePath(`/admin/customers/${customer.id}`);
  revalidatePath("/portail");

  return ok;
}
