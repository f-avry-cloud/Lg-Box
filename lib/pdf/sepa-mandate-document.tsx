import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatCurrency, formatDateLong } from "@/lib/format";
import { interpolateSepaMandateTemplate } from "@/lib/pdf/sepa-mandate-template";
import { SignatureProofPage, type SignatureProof } from "@/lib/pdf/signature-proof-page";
import type { CompanySettings, Contract, Customer } from "@/types/database";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1d21" },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#6b7280", marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { color: "#6b7280" },
  mono: { fontFamily: "Courier" },
  body: { fontSize: 10, lineHeight: 1.5, marginBottom: 10 },
});

export function SepaMandatePageContent({
  contract,
  customer,
  company,
}: {
  contract: Contract;
  customer: Customer;
  company: CompanySettings;
}) {
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Mandat de prélèvement SEPA</Text>
      <Text style={styles.subtitle}>
        RUM : {contract.rum ?? "—"} — ICS : {company.ics ?? "—"}
      </Text>

      {company.mandat_sepa_modele ? (
        <View style={styles.section}>
          {interpolateSepaMandateTemplate(company.mandat_sepa_modele, { contract, customer, company })
            .split(/\n\s*\n/)
            .map((paragraph, i) => (
              <Text key={i} style={styles.body}>
                {paragraph.trim()}
              </Text>
            ))}
        </View>
      ) : (
        <>
          <Text style={styles.body}>
            En signant ce mandat, vous autorisez {company.nom_entreprise ?? "LG BOX"} à envoyer des
            instructions à votre banque pour débiter votre compte, et votre banque à débiter votre compte
            conformément aux instructions de ce créancier. Vous bénéficiez du droit d&apos;être remboursé par
            votre banque selon les conditions décrites dans la convention passée avec elle. Une demande de
            remboursement doit être présentée dans les 8 semaines suivant la date de débit pour un
            prélèvement autorisé.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Débiteur</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Nom</Text>
              <Text>
                {customer.prenom} {customer.nom}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Adresse</Text>
              <Text>{[customer.adresse, customer.code_postal, customer.ville].filter(Boolean).join(" ")}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>IBAN</Text>
              <Text style={styles.mono}>{contract.iban ?? "—"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>BIC</Text>
              <Text style={styles.mono}>{contract.bic ?? "—"}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Créancier</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Nom</Text>
              <Text>{company.nom_entreprise ?? "LG BOX"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Adresse</Text>
              <Text>{company.adresse ?? "—"}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Paiement</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Type</Text>
              <Text>Récurrent</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Montant</Text>
              <Text>{formatCurrency(contract.prix_mensuel)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Jour de prélèvement</Text>
              <Text>Le {contract.jour_prelevement_mensuel} de chaque mois</Text>
            </View>
          </View>
        </>
      )}

      <Text>Fait le {formatDateLong(contract.date_debut)}</Text>
    </Page>
  );
}

export function CertifiedSepaMandateDocument({
  contract,
  customer,
  company,
  proof,
}: {
  contract: Contract;
  customer: Customer;
  company: CompanySettings;
  proof: Omit<SignatureProof, "documentLabel">;
}) {
  return (
    <Document>
      <SepaMandatePageContent contract={contract} customer={customer} company={company} />
      <SignatureProofPage proof={{ ...proof, documentLabel: "Mandat de prélèvement SEPA" }} />
    </Document>
  );
}

// Utilisé en mode "modèle importé" : le PDF de référence uploadé par l'admin
// n'est pas rempli automatiquement (pas de fusion de champs), donc ce
// récapitulatif porte les données propres au locataire (RUM/IBAN/BIC) avant
// d'être fusionné avec le PDF importé — voir lib/pdf/merge.ts.
export function SepaMandateSummaryDocument({
  contract,
  customer,
  company,
  proof,
}: {
  contract: Contract;
  customer: Customer;
  company: CompanySettings;
  proof: Omit<SignatureProof, "documentLabel">;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Récapitulatif du mandat de prélèvement SEPA</Text>
        <Text style={styles.subtitle}>
          Signé sur la base du modèle de référence fourni par {company.nom_entreprise ?? "LG BOX"}.
        </Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>RUM</Text>
            <Text style={styles.mono}>{contract.rum ?? "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>ICS</Text>
            <Text style={styles.mono}>{company.ics ?? "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Débiteur</Text>
            <Text>
              {customer.prenom} {customer.nom}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>IBAN</Text>
            <Text style={styles.mono}>{contract.iban ?? "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>BIC</Text>
            <Text style={styles.mono}>{contract.bic ?? "—"}</Text>
          </View>
        </View>
      </Page>
      <SignatureProofPage proof={{ ...proof, documentLabel: "Mandat de prélèvement SEPA" }} />
    </Document>
  );
}
