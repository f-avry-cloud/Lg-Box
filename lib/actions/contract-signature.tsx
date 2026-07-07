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
import { renderContractFullText } from "@/lib/pdf/contract-template";
import { renderSepaMandatePlainText } from "@/lib/pdf/sepa-mandate-template";
import { CertifiedContractDocument } from "@/lib/pdf/certified-contract-document";
import { loadCompanySignatureImage } from "@/lib/pdf/company-signature";
import { CertifiedSepaMandateDocument, SepaMandateSummaryDocument } from "@/lib/pdf/sepa-mandate-document";
import { renderPdfBuffer } from "@/lib/pdf/generate";
import { mergePdfBuffers } from "@/lib/pdf/merge";
import type { Contract, Database } from "@/types/database";

export type SignatureRequestOptions = { includeContract: boolean; includeSepaMandate: boolean };

// Crée (ou renouvelle) une demande de signature couvrant le contrat, le
// mandat SEPA, ou les deux — un seul token, un seul geste de signature.
// Appelée aussi bien depuis l'action staff "Envoyer pour signature" que
// depuis la relance automatique du cron, toujours avec un client service
// role : ni signature_requests ni signed_documents n'ont de policy d'écriture.
export async function createSignatureRequest(
  supabase: SupabaseClient<Database>,
  contractId: string,
  options: SignatureRequestOptions
): Promise<{ token: string } | { error: string }> {
  if (!options.includeContract && !options.includeSepaMandate) {
    return { error: "Sélectionnez au moins un document à signer." };
  }

  const { data: contract } = await supabase.from("contracts").select("*").eq("id", contractId).single();
  if (!contract) return { error: "Contrat introuvable." };
  if (options.includeContract && contract.signature_status === "signe") {
    return { error: "Ce contrat est déjà signé." };
  }
  if (options.includeSepaMandate) {
    if (contract.sepa_mandate_status === "signe") return { error: "Ce mandat SEPA est déjà signé." };
    if (!contract.iban || !contract.bic || !contract.rum) {
      return { error: "Renseignez l'IBAN, le BIC et générez le RUM avant d'envoyer le mandat SEPA." };
    }
  }

  const token = randomBytes(32).toString("hex");
  const tokenExpiresAt = new Date(Date.now() + SIGNATURE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const { error } = await supabase.from("signature_requests").insert({
    contract_id: contract.id,
    customer_id: contract.customer_id,
    includes_contract: options.includeContract,
    includes_sepa_mandate: options.includeSepaMandate,
    signature_token: token,
    token_expires_at: tokenExpiresAt.toISOString(),
  });
  if (error) return { error: error.message };

  const update: Partial<Contract> = {};
  if (options.includeContract) update.signature_status = "en_attente";
  if (options.includeSepaMandate) update.sepa_mandate_status = "en_attente";
  if (Object.keys(update).length > 0) {
    await supabase.from("contracts").update(update).eq("id", contract.id);
  }

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

// Bouton "Envoyer pour signature" sur la fiche contrat (staff), avec choix
// des documents à inclure (contrat, mandat SEPA, ou les deux).
export async function sendContractForSignature(
  contractId: string,
  options: SignatureRequestOptions
): Promise<ActionResult> {
  await requireStaff();
  const service = createServiceClient();

  const created = await createSignatureRequest(service, contractId, options);
  if ("error" in created) return fail(created.error);

  const payload = await loadEmailPayload(service, contractId);
  if (!payload) return fail("Contrat ou client introuvable.");

  const rendered = await renderEmailTemplate(service, "contract_signature_request", {
    prenom: payload.customer.prenom,
    lien_signature: signatureLink(created.token),
  });
  if (!rendered) {
    return fail("Modèle d'email introuvable — exécutez la migration supabase/migrations/008_v1_7.sql.");
  }

  if (!process.env.RESEND_API_KEY) {
    return fail(
      "RESEND_API_KEY non configurée dans les variables d'environnement Vercel — impossible d'envoyer l'email. Le lien a bien été généré : utilisez le bouton « Mail » pour l'envoyer manuellement."
    );
  }

  const { error: sendError } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: payload.customer.email,
    subject: rendered.subject,
    text: rendered.text,
  });
  if (sendError) return fail(sendError.message);

  await service.from("activity_log").insert({
    action: "contract_signature_requested",
    table_concernee: "contracts",
    enregistrement_id: contractId,
    detail: {
      resend_configured: true,
      includes_contract: options.includeContract,
      includes_sepa_mandate: options.includeSepaMandate,
    },
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
    .from("signature_requests")
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
export async function signDocuments(token: string, signerFullName: string): Promise<ActionResult> {
  const fullName = signerFullName.trim();
  if (!fullName) return fail("Merci de saisir votre nom complet.");

  const service = createServiceClient();

  const { data: request } = await service
    .from("signature_requests")
    .select("*")
    .eq("signature_token", token)
    .maybeSingle();
  if (!request) return fail("Lien de signature introuvable.");

  const check = isSignatureTokenValid(request);
  if (!check.valid) {
    return fail(
      check.reason === "used"
        ? "Ces documents ont déjà été signés avec ce lien."
        : "Ce lien de signature a expiré — contactez-nous pour en recevoir un nouveau."
    );
  }

  const { data: contract } = await service
    .from("contracts")
    .select("*")
    .eq("id", request.contract_id)
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
  const signedAt = new Date();
  const sharedProof = { signerFullName: fullName, signedAt: signedAt.toISOString(), ipAddress, userAgent, contractId: contract.id };

  const signedDocuments: { document_type: "contrat" | "mandat_sepa"; document_hash: string; signed_document_path: string }[] = [];

  if (request.includes_contract) {
    const documentText = renderContractFullText(contract, customer, unit, company);
    const documentHash = createHash("sha256").update(documentText).digest("hex");
    const signatureImage = await loadCompanySignatureImage(service, company.signature_image_path);
    const buffer = await renderPdfBuffer(
      <CertifiedContractDocument
        contract={contract}
        customer={customer}
        unit={unit}
        company={company}
        signatureImage={signatureImage}
        proof={{ ...sharedProof, documentHash }}
      />
    );
    const path = `${customer.id}/${contract.id}-signe.pdf`;
    const { error: uploadError } = await service.storage
      .from("contracts")
      .upload(path, buffer, { contentType: "application/pdf", upsert: true });
    if (uploadError) return fail(uploadError.message);
    signedDocuments.push({ document_type: "contrat", document_hash: documentHash, signed_document_path: path });
  }

  if (request.includes_sepa_mandate) {
    let documentHash: string;
    let buffer: Buffer;

    if (company.mandat_sepa_template_mode === "upload" && company.mandat_sepa_upload_path) {
      const { data: templateFile, error: downloadError } = await service.storage
        .from("documents")
        .download(company.mandat_sepa_upload_path);
      if (downloadError || !templateFile) return fail("Modèle de mandat SEPA importé introuvable.");
      const templateBuffer = Buffer.from(await templateFile.arrayBuffer());
      documentHash = createHash("sha256").update(templateBuffer).digest("hex");

      const summaryBuffer = await renderPdfBuffer(
        <SepaMandateSummaryDocument
          contract={contract}
          customer={customer}
          company={company}
          proof={{ ...sharedProof, documentHash }}
        />
      );
      buffer = await mergePdfBuffers([templateBuffer, summaryBuffer]);
    } else {
      const documentText = renderSepaMandatePlainText(contract, customer, company);
      documentHash = createHash("sha256").update(documentText).digest("hex");
      buffer = await renderPdfBuffer(
        <CertifiedSepaMandateDocument
          contract={contract}
          customer={customer}
          company={company}
          proof={{ ...sharedProof, documentHash }}
        />
      );
    }

    const path = `${customer.id}/${contract.id}-mandat-sepa-signe.pdf`;
    const { error: uploadError } = await service.storage
      .from("contracts")
      .upload(path, buffer, { contentType: "application/pdf", upsert: true });
    if (uploadError) return fail(uploadError.message);
    signedDocuments.push({ document_type: "mandat_sepa", document_hash: documentHash, signed_document_path: path });
  }

  await service.from("signed_documents").insert(
    signedDocuments.map((doc) => ({ ...doc, signature_request_id: request.id }))
  );

  await service
    .from("signature_requests")
    .update({
      signer_full_name: fullName,
      signed_at: signedAt.toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
      token_used_at: signedAt.toISOString(),
    })
    .eq("id", request.id);

  const contractUpdate: Partial<Contract> = {};
  if (request.includes_contract) {
    contractUpdate.signature_status = "signe";
    contractUpdate.date_signature = signedAt.toISOString().slice(0, 10);
  }
  if (request.includes_sepa_mandate) contractUpdate.sepa_mandate_status = "signe";
  await service.from("contracts").update(contractUpdate).eq("id", contract.id);

  await service.from("activity_log").insert({
    action: "contract_signed",
    table_concernee: "contracts",
    enregistrement_id: contract.id,
    detail: {
      signer_full_name: fullName,
      ip_address: ipAddress,
      includes_contract: request.includes_contract,
      includes_sepa_mandate: request.includes_sepa_mandate,
    },
  });

  // Email de confirmation post-signature — best-effort : la signature est déjà
  // actée et les documents stockés, un échec d'envoi ne doit pas faire échouer
  // la démarche. Sert aussi de trace indépendante côté locataire (renforce
  // l'opposabilité de la preuve, au-delà du token utilisé une seule fois).
  try {
    if (process.env.RESEND_API_KEY) {
      const rendered = await renderEmailTemplate(service, "documents_signed_confirmation", {
        prenom: customer.prenom,
      });
      if (rendered) {
        // Greffe le code de porte générale si l'option est activée dans les
        // paramètres — sinon rien n'est ajouté (voir Paramètres > Code de
        // porte générale du bâtiment).
        const doorCodeParagraph =
          request.includes_contract && company.code_porte_generale_active && company.code_porte_generale
            ? `\n\nCode d'accès de la porte principale du bâtiment : ${company.code_porte_generale}`
            : "";
        await getResend().emails.send({
          from: FROM_EMAIL,
          to: customer.email,
          subject: rendered.subject,
          text: rendered.text + doorCodeParagraph,
        });
      }
    }
  } catch {
    // ignoré volontairement — voir commentaire ci-dessus
  }

  revalidatePath(`/admin/contracts/${contract.id}`);
  revalidatePath("/admin/contracts");
  revalidatePath(`/admin/customers/${customer.id}`);
  revalidatePath("/portail");

  return ok;
}
