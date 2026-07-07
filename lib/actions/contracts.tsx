"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { canTransitionContract, unitStatusForContractStatus } from "@/lib/business/contract-status";
import { computeNoticeEndDate } from "@/lib/business/notice";
import { renderPdfBuffer } from "@/lib/pdf/generate";
import { ContractDocument } from "@/lib/pdf/contract-document";
import { loadCompanySignatureImage } from "@/lib/pdf/company-signature";
import { sendAccessCodeEmail } from "@/lib/actions/access-code-email";
import { ok, fail, type ActionResult } from "@/lib/actions/result";
import type { Contract, ContractStatus, CustomerType } from "@/types/database";

export type ContractFormState = { error: string | null; success?: boolean; contractId?: string };

export async function createContract(
  _prevState: ContractFormState,
  formData: FormData
): Promise<ContractFormState> {
  await requireStaff();
  const supabase = await createClient();

  let customerId = String(formData.get("customer_id") ?? "");

  if (!customerId) {
    const prenom = String(formData.get("new_prenom") ?? "").trim();
    const nom = String(formData.get("new_nom") ?? "").trim();
    const email = String(formData.get("new_email") ?? "").trim();
    if (!prenom || !nom || !email) {
      return { error: "Sélectionnez un client existant ou renseignez un nouveau client complet." };
    }
    const { data: newCustomer, error: customerError } = await supabase
      .from("customers")
      .insert({
        prenom,
        nom,
        email,
        telephone: String(formData.get("new_telephone") ?? "") || null,
        type: String(formData.get("new_type") ?? "particulier") as CustomerType,
      })
      .select("id")
      .single();
    if (customerError) return { error: customerError.message };
    customerId = newCustomer.id;
  }

  const unitId = String(formData.get("unit_id") ?? "");
  if (!unitId) return { error: "Sélectionnez un box." };

  const { data: contract, error } = await supabase
    .from("contracts")
    .insert({
      customer_id: customerId,
      unit_id: unitId,
      date_debut: String(formData.get("date_debut")),
      prix_mensuel: Number(formData.get("prix_mensuel")),
      depot_garantie: Number(formData.get("depot_garantie") ?? 0),
      jour_prelevement_mensuel: Number(formData.get("jour_prelevement_mensuel") ?? 5),
      preavis_jours: Number(formData.get("preavis_jours") ?? 30),
      date_signature: String(formData.get("date_debut")),
      statut: "actif",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.from("units").update({ statut: "loue" }).eq("id", unitId);

  revalidatePath("/admin/contracts");
  revalidatePath("/admin/units");
  return { error: null, success: true, contractId: contract.id };
}

export async function changeContractStatus(
  contractId: string,
  newStatus: ContractStatus,
  options?: { motif?: string; dateFin?: string }
): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();

  const { data: contract } = await supabase.from("contracts").select("*").eq("id", contractId).single();
  if (!contract) return fail("Contrat introuvable.");
  if (!canTransitionContract(contract.statut, newStatus)) {
    return fail(`Transition de "${contract.statut}" vers "${newStatus}" non autorisée.`);
  }

  const update: Partial<Contract> = { statut: newStatus };

  if (newStatus === "en_preavis") {
    const requestDate = new Date();
    update.date_demande_resiliation = requestDate.toISOString().slice(0, 10);
    update.date_fin =
      options?.dateFin ??
      computeNoticeEndDate(requestDate, contract.preavis_jours).toISOString().slice(0, 10);
  }
  if (newStatus === "resilie") {
    update.motif_resiliation = options?.motif ?? contract.motif_resiliation;
    if (!contract.date_fin) update.date_fin = new Date().toISOString().slice(0, 10);
  }

  const { error } = await supabase.from("contracts").update(update).eq("id", contractId);
  if (error) return fail(error.message);

  await supabase
    .from("units")
    .update({ statut: unitStatusForContractStatus(newStatus) })
    .eq("id", contract.unit_id);

  revalidatePath(`/admin/contracts/${contractId}`);
  revalidatePath("/admin/contracts");
  revalidatePath("/admin/units");
  return ok;
}

// Modification du loyer en cours de contrat — les factures déjà émises
// conservent leur montant (stocké indépendamment sur chaque facture), seules
// les prochaines générations utiliseront le nouveau montant.
export async function updateContractRent(contractId: string, formData: FormData): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();

  const nouveauPrix = Number(formData.get("prix_mensuel") ?? 0);
  if (!nouveauPrix || nouveauPrix <= 0) return fail("Montant invalide.");
  const motif = String(formData.get("motif") ?? "").trim() || null;

  const { data: contract } = await supabase.from("contracts").select("prix_mensuel").eq("id", contractId).single();
  if (!contract) return fail("Contrat introuvable.");

  const { error } = await supabase
    .from("contracts")
    .update({ prix_mensuel: nouveauPrix })
    .eq("id", contractId);
  if (error) return fail(error.message);

  await supabase.from("activity_log").insert({
    action: "contract_rent_changed",
    table_concernee: "contracts",
    enregistrement_id: contractId,
    detail: { ancien_prix_mensuel: contract.prix_mensuel, nouveau_prix_mensuel: nouveauPrix, motif },
  });

  revalidatePath(`/admin/contracts/${contractId}`);
  revalidatePath("/admin/contracts");
  return ok;
}

// Envoie le code de la porte générale du bâtiment au locataire de ce contrat
// — n'a d'effet que si l'option est activée dans Paramètres (sinon rien ne
// se passe, conformément à la demande : le code n'existe pas tant qu'il
// n'est pas explicitement activé).
export async function sendGeneralDoorCodeEmail(contractId: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();

  const { data: contract } = await supabase.from("contracts").select("customer_id").eq("id", contractId).single();
  if (!contract) return fail("Contrat introuvable.");
  const { data: customer } = await supabase
    .from("customers")
    .select("prenom, email")
    .eq("id", contract.customer_id)
    .single();
  if (!customer) return fail("Client introuvable.");
  const { data: company } = await supabase
    .from("company_settings")
    .select("code_porte_generale_active, code_porte_generale")
    .single();
  if (!company?.code_porte_generale_active || !company.code_porte_generale) {
    return fail("Le code de porte générale n'est pas activé ou renseigné dans les paramètres.");
  }

  const result = await sendAccessCodeEmail("code_porte_generale", customer, {
    code_acces: company.code_porte_generale,
  });
  if (result.success) {
    await supabase.from("activity_log").insert({
      action: "general_door_code_sent",
      table_concernee: "contracts",
      enregistrement_id: contractId,
      detail: { customer_id: contract.customer_id },
    });
  }
  return result;
}

// Envoie le code d'accès spécifique du box loué à ce contrat.
export async function sendBoxAccessCodeEmail(contractId: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();

  const { data: contract } = await supabase
    .from("contracts")
    .select("customer_id, unit_id")
    .eq("id", contractId)
    .single();
  if (!contract) return fail("Contrat introuvable.");
  const { data: customer } = await supabase
    .from("customers")
    .select("prenom, email")
    .eq("id", contract.customer_id)
    .single();
  const { data: unit } = await supabase
    .from("units")
    .select("numero, code_acces")
    .eq("id", contract.unit_id)
    .single();
  if (!customer || !unit) return fail("Données manquantes.");
  if (!unit.code_acces) return fail("Aucun code d'accès renseigné pour ce box.");

  const result = await sendAccessCodeEmail("code_acces_box", customer, {
    code_acces: unit.code_acces,
    box_numero: unit.numero,
  });
  if (result.success) {
    await supabase.from("activity_log").insert({
      action: "box_access_code_sent",
      table_concernee: "contracts",
      enregistrement_id: contractId,
      detail: { unit_id: contract.unit_id },
    });
  }
  return result;
}

export async function generateContractPdf(contractId: string): Promise<ActionResult & { path?: string }> {
  await requireStaff();
  const supabase = await createClient();

  const { data: contract } = await supabase.from("contracts").select("*").eq("id", contractId).single();
  if (!contract) return fail("Contrat introuvable.");
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", contract.customer_id)
    .single();
  const { data: unit } = await supabase.from("units").select("*").eq("id", contract.unit_id).single();
  const { data: company } = await supabase.from("company_settings").select("*").single();
  if (!customer || !unit || !company) return fail("Données manquantes pour générer le PDF.");

  const service = createServiceClient();
  const signatureImage = await loadCompanySignatureImage(service, company.signature_image_path);

  const buffer = await renderPdfBuffer(
    <ContractDocument
      contract={contract}
      customer={customer}
      unit={unit}
      company={company}
      signatureImage={signatureImage}
    />
  );

  const path = `${customer.id}/${contract.id}.pdf`;
  const { error: uploadError } = await service.storage
    .from("contracts")
    .upload(path, buffer, { contentType: "application/pdf", upsert: true });
  if (uploadError) return fail(uploadError.message);

  await supabase.from("contracts").update({ contrat_pdf_url: path }).eq("id", contractId);
  revalidatePath(`/admin/contracts/${contractId}`);

  return { ...ok, path };
}
