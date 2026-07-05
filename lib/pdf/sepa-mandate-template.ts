import { formatCurrency, formatDateLong } from "@/lib/format";
import type { CompanySettings, Contract, Customer } from "@/types/database";

// Variables disponibles dans le modèle de mandat SEPA (Paramètres > Mandat SEPA).
export const SEPA_MANDATE_TEMPLATE_VARIABLES = [
  "{{rum}}",
  "{{ics}}",
  "{{iban}}",
  "{{bic}}",
  "{{prenom}}",
  "{{nom}}",
  "{{adresse_client}}",
  "{{prix_mensuel}}",
  "{{jour_prelevement}}",
  "{{entreprise_nom}}",
  "{{entreprise_adresse}}",
] as const;

export function interpolateSepaMandateTemplate(
  template: string,
  { contract, customer, company }: { contract: Contract; customer: Customer; company: CompanySettings }
): string {
  const replacements: Record<string, string> = {
    "{{rum}}": contract.rum ?? "",
    "{{ics}}": company.ics ?? "",
    "{{iban}}": contract.iban ?? "",
    "{{bic}}": contract.bic ?? "",
    "{{prenom}}": customer.prenom,
    "{{nom}}": customer.nom,
    "{{adresse_client}}": [customer.adresse, customer.code_postal, customer.ville].filter(Boolean).join(" "),
    "{{prix_mensuel}}": formatCurrency(contract.prix_mensuel),
    "{{jour_prelevement}}": String(contract.jour_prelevement_mensuel),
    "{{entreprise_nom}}": company.nom_entreprise ?? "",
    "{{entreprise_adresse}}": company.adresse ?? "",
  };

  return Object.entries(replacements).reduce(
    (text, [placeholder, value]) => text.replaceAll(placeholder, value),
    template
  );
}

// Rendu texte brut du mandat, utilisé à la fois pour l'affichage sur la page
// de signature publique et pour le hash SHA-256 de preuve.
export function renderSepaMandatePlainText(
  contract: Contract,
  customer: Customer,
  company: CompanySettings
): string {
  if (company.mandat_sepa_modele) {
    return interpolateSepaMandateTemplate(company.mandat_sepa_modele, { contract, customer, company });
  }

  return [
    "MANDAT DE PRÉLÈVEMENT SEPA",
    "",
    `Référence Unique de Mandat (RUM) : ${contract.rum ?? "—"}`,
    `Identifiant Créancier SEPA (ICS) : ${company.ics ?? "—"}`,
    "",
    `En signant ce mandat, vous autorisez ${company.nom_entreprise ?? "LG BOX"} à envoyer des instructions à`,
    "votre banque pour débiter votre compte, et votre banque à débiter votre compte conformément aux",
    "instructions de ce créancier. Vous bénéficiez du droit d'être remboursé par votre banque selon les",
    "conditions décrites dans la convention que vous avez passée avec elle. Une demande de remboursement",
    "doit être présentée dans les 8 semaines suivant la date de débit de votre compte pour un prélèvement autorisé.",
    "",
    `Débiteur : ${customer.prenom} ${customer.nom}`,
    `Adresse : ${[customer.adresse, customer.code_postal, customer.ville].filter(Boolean).join(" ") || "—"}`,
    `IBAN : ${contract.iban ?? "—"}`,
    `BIC : ${contract.bic ?? "—"}`,
    "",
    `Créancier : ${company.nom_entreprise ?? "LG BOX"}`,
    `Adresse : ${company.adresse ?? "—"}`,
    "",
    `Type de paiement : récurrent, ${formatCurrency(contract.prix_mensuel)} le ${contract.jour_prelevement_mensuel} de chaque mois.`,
    `Fait le ${formatDateLong(contract.date_debut)}.`,
  ].join("\n");
}
