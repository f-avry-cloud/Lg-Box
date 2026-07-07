import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatCurrency, formatDate } from "@/lib/format";
import { DEFAULT_CGV_TEXT } from "@/lib/pdf/contract-template";
import type { CompanySettings, Customer, Invoice } from "@/types/database";

// Texte par défaut si aucune mention légale personnalisée n'a été renseignée
// dans les paramètres (Paramètres > Facturation).
export const DEFAULT_INVOICE_MENTIONS =
  "Facture à conserver. En cas de retard de paiement, une indemnité forfaitaire de 40 € pour frais de " +
  "recouvrement sera exigible, ainsi que des pénalités de retard au taux annuel de 10 %, conformément " +
  "aux articles L441-10 et L441-6 du Code de commerce. Aucun escompte pour paiement anticipé.";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1d21" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  title: { fontSize: 16, fontWeight: 700 },
  companyBlock: { fontSize: 9, color: "#374151", lineHeight: 1.5 },
  section: { marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  table: { marginTop: 10, borderTop: "1px solid #e1e4e8" },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottom: "1px solid #e1e4e8",
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, fontWeight: 700 },
  legal: { fontSize: 8, color: "#6b7280", lineHeight: 1.5, marginTop: 30 },
  acceptance: { fontSize: 8, color: "#374151", lineHeight: 1.5, marginTop: 8, fontWeight: 700 },
  cgvTitle: { fontSize: 12, fontWeight: 700, marginBottom: 10 },
  cgvBody: { fontSize: 9, lineHeight: 1.5, color: "#374151" },
});

export function InvoiceDocument({
  invoice,
  customer,
  company,
}: {
  invoice: Invoice;
  customer: Customer;
  company: CompanySettings;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Facture {invoice.numero_facture}</Text>
            <Text style={{ color: "#6b7280", marginTop: 4 }}>
              Émise le {formatDate(invoice.date_emission)} — échéance le {formatDate(invoice.date_echeance)}
            </Text>
          </View>
          <View style={styles.companyBlock}>
            <Text>{company.nom_entreprise ?? "LG BOX"}</Text>
            <Text>{company.adresse ?? ""}</Text>
            {company.siret && <Text>SIRET : {company.siret}</Text>}
            {company.tva_applicable && company.tva_intracom && <Text>TVA intracom. : {company.tva_intracom}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={{ fontWeight: 700, marginBottom: 4 }}>Facturé à</Text>
          <Text>
            {customer.prenom} {customer.nom}
            {customer.type === "professionnel" && customer.siret ? ` — SIRET ${customer.siret}` : ""}
          </Text>
          <Text>{customer.adresse ?? ""}</Text>
          <Text>
            {customer.code_postal ?? ""} {customer.ville ?? ""}
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text>Location de box de stockage</Text>
            <Text>
              {formatDate(invoice.periode_debut)} → {formatDate(invoice.periode_fin)}
            </Text>
            <Text>{formatCurrency(invoice.montant_ht)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 16, alignSelf: "flex-end", width: 220 }}>
          <View style={styles.row}>
            <Text>Total HT</Text>
            <Text>{formatCurrency(invoice.montant_ht)}</Text>
          </View>
          <View style={styles.row}>
            <Text>TVA</Text>
            <Text>{formatCurrency(invoice.tva)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Total TTC</Text>
            <Text>{formatCurrency(invoice.montant_ttc)}</Text>
          </View>
        </View>

        <Text style={styles.legal}>
          {company.facture_mentions_legales ?? DEFAULT_INVOICE_MENTIONS}
          {!company.tva_applicable ? " TVA non applicable, article 293 B du Code général des impôts." : ""}
          {company.rib ? ` Coordonnées bancaires : ${company.rib}.` : ""}
        </Text>
        <Text style={styles.acceptance}>
          Le paiement de cette facture vaut acceptation des conditions générales de location, jointes en page 2.
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.cgvTitle}>Conditions générales de location</Text>
        <Text style={styles.cgvBody}>{company.cgv ?? DEFAULT_CGV_TEXT}</Text>
      </Page>
    </Document>
  );
}
