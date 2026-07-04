import { NextResponse, type NextRequest } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { generateInvoiceForContract } from "@/lib/business/generate-invoice";

// Génération mensuelle automatique des factures pour tous les contrats actifs.
// A planifier le 1er de chaque mois via Vercel Cron (voir vercel.json).
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const periodeDebut = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().slice(0, 10);
  const periodeFin = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0)).toISOString().slice(0, 10);

  const { data: contracts } = await supabase
    .from("contracts")
    .select("id")
    .in("statut", ["actif", "en_preavis"]);

  const { data: existingInvoices } = await supabase
    .from("invoices")
    .select("contract_id")
    .eq("periode_debut", periodeDebut);
  const alreadyInvoiced = new Set((existingInvoices ?? []).map((i) => i.contract_id));

  const created: string[] = [];
  const errors: { contractId: string; message: string }[] = [];

  for (const contract of contracts ?? []) {
    if (alreadyInvoiced.has(contract.id)) continue;
    try {
      const invoiceId = await generateInvoiceForContract(supabase, contract.id, periodeDebut, periodeFin);
      created.push(invoiceId);
    } catch (e) {
      errors.push({ contractId: contract.id, message: e instanceof Error ? e.message : "Erreur inconnue" });
    }
  }

  return NextResponse.json({ period: { periodeDebut, periodeFin }, created: created.length, errors });
}
