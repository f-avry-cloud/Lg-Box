import type { SupabaseClient } from "@supabase/supabase-js";

import { nextInvoiceNumber } from "@/lib/business/invoice-number";
import type { Database } from "@/types/database";

// Génère une facture pour un contrat et une période donnés. Partagé entre
// la création manuelle (back-office) et le job mensuel automatique (cron),
// qui fournissent chacun un client Supabase différent (session vs service role).
export async function generateInvoiceForContract(
  supabase: SupabaseClient<Database>,
  contractId: string,
  periodeDebut: string,
  periodeFin: string,
  montantTtcOverride?: number
): Promise<string> {
  const { data: contract } = await supabase.from("contracts").select("*").eq("id", contractId).single();
  if (!contract) throw new Error("Contrat introuvable.");

  const { data: company } = await supabase
    .from("company_settings")
    .select("tva_applicable, taux_tva")
    .single();

  const montantTtc = montantTtcOverride ?? contract.prix_mensuel;
  // Activité en franchise en base de TVA par défaut (art. 293 B du CGI) :
  // HT = TTC tant que la TVA n'est pas explicitement activée dans les paramètres.
  let montantHt = montantTtc;
  let tva = 0;
  if (company?.tva_applicable) {
    const tauxTva = company.taux_tva / 100;
    montantHt = Math.round((montantTtc / (1 + tauxTva)) * 100) / 100;
    tva = Math.round((montantTtc - montantHt) * 100) / 100;
  }

  const { data: existingNumbers } = await supabase.from("invoices").select("numero_facture");
  const numero = nextInvoiceNumber((existingNumbers ?? []).map((i) => i.numero_facture), new Date());

  const dateEmission = new Date();
  const dateEcheance = new Date(dateEmission);
  dateEcheance.setUTCDate(dateEcheance.getUTCDate() + 15);

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      contract_id: contractId,
      customer_id: contract.customer_id,
      numero_facture: numero,
      periode_debut: periodeDebut,
      periode_fin: periodeFin,
      montant_ht: montantHt,
      tva,
      montant_ttc: montantTtc,
      statut: "emise",
      date_emission: dateEmission.toISOString().slice(0, 10),
      date_echeance: dateEcheance.toISOString().slice(0, 10),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return invoice.id as string;
}
