// Charges du centre, et résultat mensuel.
//
// Le carnet savait ce qui rentre. Sans ce qui sort, il ne pouvait rien dire du
// résultat — le seul chiffre qui compte vraiment.
//
// Deux natures de charge, et la distinction n'est pas cosmétique : l'essentiel
// des charges d'un centre est récurrent (loyer, assurance, électricité), et
// devoir les ressaisir chaque mois serait le meilleur moyen qu'elles cessent
// de l'être. Une charge récurrente se saisit une fois et court jusqu'à ce
// qu'on l'arrête.

import { formatPeriode, parsePeriode } from "@/lib/suivi/period";

export type Charge = {
  id: string;
  libelle: string;
  montant_eur: number;
  categorie: string;
  recurrente: boolean;
  /** Premier mois dû. */
  periode_debut: string;
  /** Dernier mois dû. Null sur une récurrente = sans échéance connue. */
  periode_fin: string | null;
  note: string | null;
};

export const CATEGORIES_CHARGE = [
  "loyer",
  "assurance",
  "energie",
  "entretien",
  "taxes",
  "abonnements",
  "personnel",
  "autre",
] as const;

export type CategorieCharge = (typeof CATEGORIES_CHARGE)[number];

export const LIBELLE_CATEGORIE: Record<CategorieCharge, string> = {
  loyer: "Loyer / crédit",
  assurance: "Assurance",
  energie: "Énergie",
  entretien: "Entretien",
  taxes: "Taxes",
  abonnements: "Abonnements",
  personnel: "Personnel",
  autre: "Autre",
};

/**
 * Cette charge pèse-t-elle sur ce mois ?
 *
 * Même forme que `contratDuPour` côté recettes, et pour la même raison : les
 * périodes sont des textes `AAAA-MM` de largeur fixe, donc comparables tels
 * quels. Une ponctuelle ne pèse que sur son mois ; une récurrente pèse de son
 * début à sa fin, et indéfiniment si elle n'en a pas.
 */
export function chargeDuePour(periode: string, charge: Charge): boolean {
  if (periode < charge.periode_debut) return false;
  if (!charge.recurrente) return periode === charge.periode_debut;
  if (charge.periode_fin !== null && periode > charge.periode_fin) return false;
  return true;
}

export function chargesDuMois(charges: Charge[], periode: string): Charge[] {
  return charges.filter((c) => chargeDuePour(periode, c));
}

export function totalCharges(charges: Charge[]): number {
  return charges.reduce((somme, c) => somme + c.montant_eur, 0);
}

/**
 * Charges cumulées de janvier au mois affiché, ce dernier compris.
 *
 * **Pas l'année entière**, et c'est le point délicat : le cumul des recettes
 * s'arrête au mois affiché, puisqu'on ne peut pas encaisser l'avenir. Compter
 * douze mois de charges contre huit mois de recettes donnerait un résultat
 * faux, et faux dans le sens qui inquiète.
 */
export function chargesCumulees(charges: Charge[], periode: string): number {
  const { annee, mois } = parsePeriode(periode);
  let total = 0;

  for (let m = 1; m <= mois; m += 1) {
    total += totalCharges(chargesDuMois(charges, formatPeriode(annee, m)));
  }

  return total;
}

export type Resultat = {
  recettes: number;
  charges: number;
  /** Recettes moins charges. Négatif quand le mois coûte plus qu'il ne rapporte. */
  solde: number;
};

export function resultat(recettes: number, charges: number): Resultat {
  return { recettes, charges, solde: recettes - charges };
}

/** Un poste du récapitulatif par catégorie. */
export type PosteCharge = {
  categorie: string;
  montant: number;
  nombre: number;
};

/**
 * Récapitulatif par catégorie, du plus lourd au plus léger : c'est dans cet
 * ordre qu'on regarde où passe l'argent.
 */
export function parCategorie(charges: Charge[]): PosteCharge[] {
  const postes = new Map<string, PosteCharge>();

  for (const charge of charges) {
    const poste = postes.get(charge.categorie);
    if (poste) {
      poste.montant += charge.montant_eur;
      poste.nombre += 1;
    } else {
      postes.set(charge.categorie, {
        categorie: charge.categorie,
        montant: charge.montant_eur,
        nombre: 1,
      });
    }
  }

  return [...postes.values()].sort((a, b) => b.montant - a.montant);
}

/**
 * Tri d'affichage : les récurrentes d'abord — elles constituent le socle —
 * puis les ponctuelles, et à l'intérieur de chaque groupe, du plus lourd au
 * plus léger.
 */
export function trieCharges(charges: Charge[]): Charge[] {
  return [...charges].sort((a, b) => {
    if (a.recurrente !== b.recurrente) return a.recurrente ? -1 : 1;
    if (b.montant_eur !== a.montant_eur) return b.montant_eur - a.montant_eur;
    return a.libelle.localeCompare(b.libelle, "fr", { sensitivity: "base" });
  });
}

/**
 * Une charge récurrente arrêtée dans le passé n'a plus à encombrer la liste,
 * mais reste dans les cumuls des mois qu'elle a pesés.
 */
export function estTerminee(charge: Charge, periode: string): boolean {
  if (!charge.recurrente) return periode > charge.periode_debut;
  return charge.periode_fin !== null && periode > charge.periode_fin;
}
