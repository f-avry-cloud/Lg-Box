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
