import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { ContractPageContent } from "@/lib/pdf/contract-document";
import { formatDateLong } from "@/lib/format";
import type { CompanySettings, Contract, Customer, Unit } from "@/types/database";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1d21" },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 9, color: "#6b7280", marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  label: { color: "#6b7280" },
  mono: { fontFamily: "Courier" },
  legal: { fontSize: 8, lineHeight: 1.5, color: "#6b7280", marginTop: 24 },
});

export type SignatureProof = {
  signerFullName: string;
  signedAt: string;
  ipAddress: string;
  userAgent: string | null;
  documentHash: string;
  contractId: string;
};

function SignatureProofPage({ proof }: { proof: SignatureProof }) {
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Preuve de signature électronique</Text>
      <Text style={styles.subtitle}>Signature électronique simple — article 1367 du Code civil</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Éléments de preuve</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Contrat</Text>
          <Text style={styles.mono}>{proof.contractId.slice(0, 8).toUpperCase()}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Signataire</Text>
          <Text>{proof.signerFullName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date et heure de signature</Text>
          <Text>{formatDateLong(proof.signedAt)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Adresse IP</Text>
          <Text style={styles.mono}>{proof.ipAddress}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Navigateur (user-agent)</Text>
          <Text style={{ maxWidth: 320 }}>{proof.userAgent ?? "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Empreinte du document (SHA-256)</Text>
          <Text style={{ ...styles.mono, maxWidth: 320 }}>{proof.documentHash}</Text>
        </View>
      </View>

      <Text style={styles.legal}>
        Ce document atteste que le signataire ci-dessus a pris connaissance du contrat présenté à la date et
        à l&apos;heure indiquées, a coché une case de consentement explicite et a confirmé son identité en
        saisissant son nom complet. L&apos;empreinte SHA-256 ci-dessus permet de vérifier que le contrat
        signé est identique, au caractère près, à celui présenté au moment de la signature. Cette preuve
        constitue un faisceau d&apos;indices de fiabilité au sens de l&apos;article 1367 du Code civil pour
        une signature électronique simple.
      </Text>
    </Page>
  );
}

export function CertifiedContractDocument({
  contract,
  customer,
  unit,
  company,
  proof,
}: {
  contract: Contract;
  customer: Customer;
  unit: Unit;
  company: CompanySettings;
  proof: SignatureProof;
}) {
  return (
    <Document>
      <ContractPageContent contract={contract} customer={customer} unit={unit} company={company} />
      <SignatureProofPage proof={proof} />
    </Document>
  );
}
