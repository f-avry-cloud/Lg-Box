import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { formatDate } from "@/lib/format";

async function assertStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" || profile?.role === "employee";
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;

  if (!(await assertStaff())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  let csv: string;

  if (type === "invoices") {
    const { data } = await supabase.from("invoices").select("*").order("date_emission", { ascending: false });
    csv = toCsv(
      (data ?? []).map((i) => ({
        ...i,
        date_emission: formatDate(i.date_emission),
        date_echeance: formatDate(i.date_echeance),
        periode_debut: formatDate(i.periode_debut),
        periode_fin: formatDate(i.periode_fin),
      })),
      [
        { key: "numero_facture", label: "Numéro" },
        { key: "date_emission", label: "Émise le" },
        { key: "date_echeance", label: "Échéance" },
        { key: "periode_debut", label: "Période début" },
        { key: "periode_fin", label: "Période fin" },
        { key: "montant_ht", label: "Montant HT" },
        { key: "tva", label: "TVA" },
        { key: "montant_ttc", label: "Montant TTC" },
        { key: "statut", label: "Statut" },
      ]
    );
  } else if (type === "payments") {
    const { data } = await supabase.from("payments").select("*").order("date_paiement", { ascending: false });
    csv = toCsv(
      (data ?? []).map((p) => ({ ...p, date_paiement: formatDate(p.date_paiement) })),
      [
        { key: "date_paiement", label: "Date" },
        { key: "montant", label: "Montant" },
        { key: "methode", label: "Méthode" },
        { key: "reference", label: "Référence" },
        { key: "statut", label: "Statut" },
      ]
    );
  } else if (type === "customers") {
    const { data } = await supabase.from("customers").select("*").order("nom");
    csv = toCsv(
      (data ?? []).map((c) => ({ ...c, created_at: formatDate(c.created_at) })),
      [
        { key: "nom", label: "Nom" },
        { key: "prenom", label: "Prénom" },
        { key: "email", label: "Email" },
        { key: "telephone", label: "Téléphone" },
        { key: "adresse", label: "Adresse" },
        { key: "ville", label: "Ville" },
        { key: "code_postal", label: "Code postal" },
        { key: "type", label: "Type" },
        { key: "siret", label: "SIRET" },
        { key: "created_at", label: "Client depuis" },
      ]
    );
  } else {
    return NextResponse.json({ error: "Type d'export inconnu." }, { status: 400 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}.csv"`,
    },
  });
}
