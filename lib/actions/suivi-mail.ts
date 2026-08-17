"use server";

// Envoi groupé des factures du mois, par mail.
//
// C'est la seule action de l'app qui sorte du site : elle écrit à des vrais
// gens, et un mail parti ne se rattrape pas. D'où quatre garde-fous, tous
// nécessaires :
//
//  1. rien ne part sans paramétrage complet (expéditeur, objet, corps) ;
//  2. rien ne part sans que l'exploitant ait confirmé, avec sous les yeux le
//     nombre exact de destinataires et l'aperçu du message ;
//  3. seuls les loyers passés en « facturé » sont concernés — envoyer la
//     facture est le second temps du geste, après l'avoir réclamée ;
//  4. chaque envoi est journalisé (`sr_envois_facture`), et un contrat déjà
//     servi pour la période est écarté : rejouer le bouton ne relance
//     personne deux fois.

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { FROM_EMAIL, getResend } from "@/lib/email/resend";
import { createClient } from "@/lib/supabase/server";
import { isPeriode } from "@/lib/suivi/period";
import { destinatairesFactures, estModeDemo, parametresMail } from "@/lib/suivi/repository";
import {
  aEnvoyer,
  expediteurComplet,
  interpoleMail,
  parametrageIncomplet,
  type ParametresMail,
} from "@/lib/suivi/mail";

async function autorise(): Promise<ActionResult | null> {
  if (estModeDemo()) return fail("Envoi indisponible en mode démo.");
  await requireStaff();
  return null;
}

export type SaisieParametresMail = {
  expediteur_nom: string;
  expediteur_email: string;
  repondre_a: string | null;
  copie_email: string | null;
  objet: string;
  corps: string;
};

// Validation volontairement large : elle sert à écarter la faute de frappe
// évidente, pas à rejouer la RFC 5322.
function adresseValide(valeur: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valeur.trim());
}

export async function sauvegardeParametresMail(
  saisie: SaisieParametresMail
): Promise<ActionResult> {
  try {
    const refus = await autorise();
    if (refus) return refus;

    const expediteur = saisie.expediteur_email.trim();
    if (!adresseValide(expediteur)) return fail("L'adresse d'expédition n'est pas valide.");

    for (const [champ, valeur] of [
      ["L'adresse de réponse", saisie.repondre_a],
      ["L'adresse en copie", saisie.copie_email],
    ] as const) {
      if (valeur && valeur.trim() && !adresseValide(valeur)) {
        return fail(`${champ} n'est pas valide.`);
      }
    }

    if (!saisie.objet.trim()) return fail("L'objet du message ne peut pas être vide.");
    if (!saisie.corps.trim()) return fail("Le corps du message ne peut pas être vide.");

    const supabase = await createClient();
    const { error } = await supabase
      .from("sr_mail_parametres")
      .update({
        expediteur_nom: saisie.expediteur_nom.trim(),
        expediteur_email: expediteur,
        repondre_a: saisie.repondre_a?.trim() || null,
        copie_email: saisie.copie_email?.trim() || null,
        objet: saisie.objet.trim(),
        corps: saisie.corps,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);

    if (error) return fail(error.message);

    revalidatePath("/suivi/tableau-de-bord");
    return ok;
  } catch (erreur) {
    return fail(erreur instanceof Error ? erreur.message : "Enregistrement impossible.");
  }
}

export type ResultatEnvoi = ActionResult & { envoyes?: number; echecs?: number };

/**
 * Envoie leur facture aux locataires facturés du mois qui ne l'ont pas encore
 * reçue. Séquentiel plutôt que parallèle : soixante appels d'un coup se font
 * limiter par le fournisseur, et un envoi à la fois permet de journaliser
 * chaque issue et de continuer après un échec isolé.
 */
export async function envoieFacturesDuMois(periode: string): Promise<ResultatEnvoi> {
  if (!isPeriode(periode)) return fail(`Période invalide : ${periode}`);

  try {
    const refus = await autorise();
    if (refus) return refus;

    if (!process.env.RESEND_API_KEY) {
      return fail(
        "RESEND_API_KEY non configurée dans les variables d'environnement — impossible d'envoyer."
      );
    }

    const parametres = await parametresMail();
    const manques = parametrageIncomplet(parametres);
    if (manques.length > 0 || !parametres) {
      return fail(`Paramétrage incomplet : il manque ${manques.join(", ")}.`);
    }

    const destinataires = aEnvoyer(await destinatairesFactures(periode));
    if (destinataires.length === 0) {
      return { ...ok, envoyes: 0, echecs: 0 };
    }

    const supabase = await createClient();
    const resend = getResend();
    const journal: Array<{
      contrat_id: string;
      periode: string;
      destinataire: string;
      statut: "envoye" | "echec";
      erreur: string | null;
    }> = [];

    let envoyes = 0;
    let echecs = 0;

    for (const destinataire of destinataires) {
      const adresse = destinataire.email!;
      let erreur: string | null = null;

      try {
        const reponse = await resend.emails.send({
          from: expediteurComplet(parametres as ParametresMail) || FROM_EMAIL,
          to: adresse,
          replyTo: parametres.repondre_a ?? undefined,
          bcc: parametres.copie_email ?? undefined,
          subject: interpoleMail(parametres.objet, destinataire, periode),
          text: interpoleMail(parametres.corps, destinataire, periode),
        });
        if (reponse.error) erreur = reponse.error.message;
      } catch (e) {
        erreur = e instanceof Error ? e.message : "Envoi refusé.";
      }

      if (erreur) echecs += 1;
      else envoyes += 1;

      journal.push({
        contrat_id: destinataire.contrat_id,
        periode,
        destinataire: adresse,
        statut: erreur ? "echec" : "envoye",
        erreur,
      });
    }

    // Le journal s'écrit même si tout a échoué : c'est la trace de la
    // tentative, et c'est elle qui dira pourquoi.
    const { error } = await supabase.from("sr_envois_facture").insert(journal);
    if (error) {
      return fail(
        `${envoyes} mail(s) envoyé(s), mais le journal n'a pas pu être écrit : ${error.message}`
      );
    }

    revalidatePath("/suivi/tableau-de-bord");
    return { ...ok, envoyes, echecs };
  } catch (erreur) {
    return fail(erreur instanceof Error ? erreur.message : "Envoi impossible.");
  }
}
