import JSZip from "jszip";
import { NextResponse, type NextRequest } from "next/server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ensureInvoicePdf } from "@/lib/pdf/render-invoice";

async function assertStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" || profile?.role === "employee";
}

// Export groupé des factures PDF d'un exercice (année civile), pour tous les
// locataires ou un seul (?customerId=...) — voir app/admin/invoices/page.tsx
// et l'onglet "Factures" de la fiche client.
export async function GET(request: NextRequest) {
  if (!(await assertStaff())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const customerId = searchParams.get("customerId") || null;
  if (!year || Number.isNaN(year)) {
    return NextResponse.json({ error: "Paramètre 'year' invalide." }, { status: 400 });
  }

  const supabase = await createClient();
  const service = createServiceClient();

  let query = supabase
    .from("invoices")
    .select("*")
    .gte("date_emission", `${year}-01-01`)
    .lte("date_emission", `${year}-12-31`)
    .order("date_emission", { ascending: true });
  if (customerId) query = query.eq("customer_id", customerId);
  const { data: invoices } = await query;

  if (!invoices || invoices.length === 0) {
    return NextResponse.json({ error: "Aucune facture pour cette période." }, { status: 404 });
  }

  const { data: company } = await supabase.from("company_settings").select("*").single();
  const customerIds = [...new Set(invoices.map((i) => i.customer_id))];
  const { data: customers } = await supabase.from("customers").select("*").in("id", customerIds);
  const customerById = new Map((customers ?? []).map((c) => [c.id, c]));
  if (!company) return NextResponse.json({ error: "Paramètres entreprise manquants." }, { status: 500 });

  const zip = new JSZip();
  const multiCustomer = !customerId;

  for (const invoice of invoices) {
    const customer = customerById.get(invoice.customer_id);
    if (!customer) continue;
    const { buffer } = await ensureInvoicePdf(service, invoice, customer, company);
    const filename = `${invoice.numero_facture}.pdf`;
    const folder = multiCustomer ? `${customer.prenom} ${customer.nom}`.trim() : null;
    zip.file(folder ? `${folder}/${filename}` : filename, buffer);
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const suffix = customerId ? `-${customerById.get(customerId)?.nom ?? "client"}` : "";

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="factures-${year}${suffix}.zip"`,
    },
  });
}
