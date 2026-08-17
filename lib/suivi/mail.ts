// Modèle du mail de facture : interpolation et choix des destinataires.
// Fonctions pures — elles servent à l'aperçu affiché avant l'envoi comme au
// texte réellement expédié, qui doivent être le même à la virgule près.

import { dePeriode, labelPeriode } from "@/lib/suivi/period";

export type ParametresMail = {
  expediteur_nom: string;
  expediteur_email: string;
  repondre_a: string | null;
  copie_email: string | null;
  objet: string;
  corps: string;
};

/** Un locataire à facturer, réduit à ce que le mail a besoin de savoir. */
export type DestinataireFacture = {
  contrat_id: string;
  nom: string;
  email: string | null;
  box: string | null;
  loyer: number;
  /** Déjà expédié pour cette période : on ne relance pas sans le vouloir. */
  dejaEnvoye: boolean;
};

export const VARIABLES_MAIL = ["{nom}", "{mois}", "{box}", "{loyer}"] as const;

/**
 * Remplace les variables du modèle. Une variable inconnue est laissée telle
 * quelle : mieux vaut un « {loyerr} » visible dans l'aperçu qu'un trou
 * silencieux dans un mail parti à soixante personnes.
 */
export function interpoleMail(
  modele: string,
  destinataire: Pick<DestinataireFacture, "nom" | "box" | "loyer">,
  periode: string
): string {
  const valeurs: Record<string, string> = {
    "{nom}": destinataire.nom,
    "{mois}": labelPeriode(periode).toLocaleLowerCase("fr"),
    "{box}": destinataire.box ?? "—",
    "{loyer}": String(destinataire.loyer),
  };

  return Object.entries(valeurs).reduce(
    (texte, [variable, valeur]) => texte.replaceAll(variable, valeur),
    modele
  );
}

export type ResumeEnvoi = {
  /** Prêts à partir : facturés, avec une adresse, pas encore expédiés. */
  aEnvoyer: number;
  /** Facturés mais sans adresse : à relancer autrement. */
  sansEmail: number;
  /** Déjà expédiés pour cette période. */
  dejaEnvoyes: number;
};

export function resumeEnvoi(destinataires: DestinataireFacture[]): ResumeEnvoi {
  let aEnvoyer = 0;
  let sansEmail = 0;
  let dejaEnvoyes = 0;

  for (const d of destinataires) {
    if (d.dejaEnvoye) dejaEnvoyes += 1;
    else if (!d.email) sansEmail += 1;
    else aEnvoyer += 1;
  }

  return { aEnvoyer, sansEmail, dejaEnvoyes };
}

export function aEnvoyer(destinataires: DestinataireFacture[]): DestinataireFacture[] {
  return destinataires.filter((d) => !d.dejaEnvoye && d.email);
}

/**
 * Ce qui manque pour pouvoir envoyer. Vide = paramétrage complet.
 *
 * L'expéditeur est le seul champ vraiment bloquant : sans lui, Resend refuse
 * l'envoi, et un modèle vide reste un mail valide (l'objet suffit à prévenir).
 */
export function parametrageIncomplet(parametres: ParametresMail | null): string[] {
  if (!parametres) return ["l'adresse d'expédition"];

  const manques: string[] = [];
  if (!parametres.expediteur_email.trim()) manques.push("l'adresse d'expédition");
  if (!parametres.objet.trim()) manques.push("l'objet du message");
  if (!parametres.corps.trim()) manques.push("le corps du message");
  return manques;
}

/** L'en-tête `from` attendu par Resend : « LG BOX <contact@lg-box.fr> ». */
export function expediteurComplet(parametres: ParametresMail): string {
  const nom = parametres.expediteur_nom.trim();
  const email = parametres.expediteur_email.trim();
  return nom ? `${nom} <${email}>` : email;
}

/** Phrase d'annonce de l'envoi, pour la confirmation. */
export function phraseEnvoi(nombre: number, periode: string): string {
  if (nombre === 0) return `Aucune facture ${dePeriode(periode)} n'est prête à partir.`;
  return `Envoyer ${nombre} facture${nombre > 1 ? "s" : ""} ${dePeriode(periode)} par mail ?`;
}
