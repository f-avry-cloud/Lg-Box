import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatCurrency, formatDateLong } from "@/lib/format";
import { interpolateContractTemplate } from "@/lib/pdf/contract-template";
import type { CompanySettings, Contract, Customer, Unit } from "@/types/database";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1d21" },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#6b7280", marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { color: "#6b7280" },
  cgv: { fontSize: 9, lineHeight: 1.5, color: "#374151" },
  body: { fontSize: 10, lineHeight: 1.5, marginBottom: 10 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#9aa0a6" },
});

// Contenu de la page de contrat, séparé de <Document> pour pouvoir être
// composé avec une page de preuve de signature (voir certified-contract-document.tsx)
// sans dupliquer la mise en page.
export function ContractPageContent({
  contract,
  customer,
  unit,
  company,
}: {
  contract: Contract;
  customer: Customer;
  unit: Unit;
  company: CompanySettings;
}) {
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Contrat de location de box de self-stockage</Text>
      <Text style={styles.subtitle}>
        {company.nom_entreprise ?? "LG BOX"} {company.siret ? `— SIRET ${company.siret}` : ""}
      </Text>

      {company.contrat_modele ? (
        <View style={styles.section}>
          {interpolateContractTemplate(company.contrat_modele, { contract, customer, unit, company })
            .split(/\n\s*\n/)
            .map((paragraph, i) => (
              <Text key={i} style={styles.body}>
                {paragraph.trim()}
              </Text>
            ))}
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Entre les soussignés</Text>
            <Text>
              {company.nom_entreprise ?? "LG BOX"}, {company.adresse ?? ""}, ci-après « le Loueur »,
            </Text>
            <Text style={{ marginTop: 4 }}>
              Et {customer.prenom} {customer.nom}
              {customer.type === "professionnel" && customer.siret ? ` (SIRET ${customer.siret})` : ""},
              demeurant {customer.adresse ?? ""} {customer.code_postal ?? ""} {customer.ville ?? ""}, ci-après
              « le Locataire ».
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Objet du contrat</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Box loué</Text>
              <Text>
                N° {unit.numero} — {unit.taille_libelle} ({unit.type})
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Date de début</Text>
              <Text>{formatDateLong(contract.date_debut)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Durée</Text>
              <Text>Indéterminée, préavis de {contract.preavis_jours} jours</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Loyer mensuel</Text>
              <Text>{formatCurrency(contract.prix_mensuel)} TTC</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Dépôt de garantie</Text>
              <Text>{formatCurrency(contract.depot_garantie)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Jour de prélèvement mensuel</Text>
              <Text>Le {contract.jour_prelevement_mensuel} de chaque mois</Text>
            </View>
          </View>
        </>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Conditions générales</Text>
        <Text style={styles.cgv}>
          {company.cgv ?? "Conditions générales de location à compléter dans les paramètres du back-office."}
        </Text>
      </View>

      <View style={styles.section}>
        <Text>Fait le {formatDateLong(contract.date_signature ?? contract.date_debut)}</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 30 }}>
          <Text>Le Loueur</Text>
          <Text>Le Locataire</Text>
        </View>
      </View>

      <Text style={styles.footer}>
        {company.nom_entreprise ?? "LG BOX"} — Contrat n° {contract.id.slice(0, 8).toUpperCase()}
      </Text>
    </Page>
  );
}

export function ContractDocument(props: {
  contract: Contract;
  customer: Customer;
  unit: Unit;
  company: CompanySettings;
}) {
  return (
    <Document>
      <ContractPageContent {...props} />
    </Document>
  );
}
