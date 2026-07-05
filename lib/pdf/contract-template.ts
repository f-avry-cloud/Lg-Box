import { formatCurrency, formatDateLong } from "@/lib/format";
import type { CompanySettings, Contract, Customer, Unit } from "@/types/database";

// Variables disponibles dans le modèle de contrat (Paramètres > Modèle de contrat).
export const CONTRACT_TEMPLATE_VARIABLES = [
  "{{prenom}}",
  "{{nom}}",
  "{{email}}",
  "{{telephone}}",
  "{{adresse_client}}",
  "{{box_numero}}",
  "{{box_taille}}",
  "{{prix_mensuel}}",
  "{{depot_garantie}}",
  "{{date_debut}}",
  "{{jour_prelevement}}",
  "{{preavis_jours}}",
  "{{entreprise_nom}}",
  "{{entreprise_siret}}",
  "{{entreprise_adresse}}",
] as const;

export function interpolateContractTemplate(
  template: string,
  { contract, customer, unit, company }: { contract: Contract; customer: Customer; unit: Unit; company: CompanySettings }
): string {
  const replacements: Record<string, string> = {
    "{{prenom}}": customer.prenom,
    "{{nom}}": customer.nom,
    "{{email}}": customer.email,
    "{{telephone}}": customer.telephone ?? "",
    "{{adresse_client}}": [customer.adresse, customer.code_postal, customer.ville].filter(Boolean).join(" "),
    "{{box_numero}}": unit.numero,
    "{{box_taille}}": unit.taille_libelle,
    "{{prix_mensuel}}": formatCurrency(contract.prix_mensuel),
    "{{depot_garantie}}": formatCurrency(contract.depot_garantie),
    "{{date_debut}}": formatDateLong(contract.date_debut),
    "{{jour_prelevement}}": String(contract.jour_prelevement_mensuel),
    "{{preavis_jours}}": String(contract.preavis_jours),
    "{{entreprise_nom}}": company.nom_entreprise ?? "",
    "{{entreprise_siret}}": company.siret ?? "",
    "{{entreprise_adresse}}": company.adresse ?? "",
  };

  return Object.entries(replacements).reduce(
    (text, [placeholder, value]) => text.replaceAll(placeholder, value),
    template
  );
}

// Texte par défaut si aucune CGV n'a été renseignée dans les paramètres.
const DEFAULT_CGV_TEXT = "Conditions générales de location à compléter dans les paramètres du back-office.";

// Corps du contrat (hors CGV), utilisé pour l'affichage principal sur la
// page de signature publique — les CGV y sont accessibles séparément via un
// lien plutôt que recopiées en bloc au milieu du texte.
export function renderContractBodyText(
  contract: Contract,
  customer: Customer,
  unit: Unit,
  company: CompanySettings
): string {
  if (company.contrat_modele) {
    return interpolateContractTemplate(company.contrat_modele, { contract, customer, unit, company });
  }

  const locataire =
    customer.type === "professionnel" && customer.siret
      ? `${customer.prenom} ${customer.nom} (SIRET ${customer.siret})`
      : `${customer.prenom} ${customer.nom}`;

  return [
    "CONTRAT DE LOCATION DE BOX DE SELF-STOCKAGE",
    "",
    `Entre ${company.nom_entreprise ?? "LG BOX"}, ${company.adresse ?? ""}, ci-après « le Loueur »,`,
    `Et ${locataire}, demeurant ${[customer.adresse, customer.code_postal, customer.ville].filter(Boolean).join(" ")}, ci-après « le Locataire ».`,
    "",
    `Box loué : n° ${unit.numero} — ${unit.taille_libelle} (${unit.type})`,
    `Date de début : ${formatDateLong(contract.date_debut)}`,
    `Durée : indéterminée, préavis de ${contract.preavis_jours} jours`,
    `Loyer mensuel : ${formatCurrency(contract.prix_mensuel)} TTC`,
    `Dépôt de garantie : ${formatCurrency(contract.depot_garantie)}`,
    `Jour de prélèvement mensuel : le ${contract.jour_prelevement_mensuel} de chaque mois`,
  ].join("\n");
}

// Texte complet (corps + CGV), utilisé pour le hash SHA-256 de preuve — la
// preuve doit couvrir l'intégralité de ce qui engage juridiquement le
// signataire, y compris les CGV, même si elles sont présentées séparément
// (via un lien) sur la page de signature.
export function renderContractFullText(
  contract: Contract,
  customer: Customer,
  unit: Unit,
  company: CompanySettings
): string {
  const body = renderContractBodyText(contract, customer, unit, company);
  return [body, "", "CONDITIONS GÉNÉRALES", company.cgv ?? DEFAULT_CGV_TEXT].join("\n");
}
