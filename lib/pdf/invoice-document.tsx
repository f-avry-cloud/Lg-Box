import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatCurrency, formatDate } from "@/lib/format";
import type { CompanySettings, Customer, Invoice } from "@/types/database";

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
            {company.tva_intracom && <Text>TVA intracom. : {company.tva_intracom}</Text>}
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
          Facture à conserver. En cas de retard de paiement, une indemnité forfaitaire de 40 € pour frais de
          recouvrement sera exigible, ainsi que des pénalités de retard au taux annuel de 10 %, conformément
          aux articles L441-10 et L441-6 du Code de commerce. Aucun escompte pour paiement anticipé.
          {company.rib ? ` Coordonnées bancaires : ${company.rib}.` : ""}
        </Text>
      </Page>
    </Document>
  );
}
