"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { vibre } from "@/components/suivi/bouton-encaissement";
import { FeuilleModale } from "@/components/suivi/feuille-modale";
import { Button } from "@/components/ui/button";
import {
  envoieFacturesDuMois,
  sauvegardeParametresMail,
  type SaisieParametresMail,
} from "@/lib/actions/suivi-mail";
import {
  VARIABLES_MAIL,
  interpoleMail,
  parametrageIncomplet,
  phraseEnvoi,
  type ParametresMail,
  type ResumeEnvoi,
} from "@/lib/suivi/mail";
import { labelPeriode } from "@/lib/suivi/period";

const MODELE_PAR_DEFAUT: SaisieParametresMail = {
  expediteur_nom: "LG BOX",
  expediteur_email: "",
  repondre_a: null,
  copie_email: null,
  objet: "Loyer {mois} — LG BOX",
  corps:
    "Bonjour {nom},\n\nVeuillez trouver ci-dessous le montant de votre loyer pour {mois} :\n\nBox {box} — {loyer} €\n\nNous vous remercions de votre règlement.\n\nLG BOX",
};

/**
 * Envoi groupé des factures du mois, et paramétrage du message.
 *
 * L'envoi sort du site : il écrit à de vraies personnes, et rien ne se
 * rattrape. L'écran le traite comme tel — il annonce le nombre exact de
 * destinataires, montre le message tel qu'il partira (variables remplacées
 * sur le premier destinataire), et n'envoie qu'après confirmation. Les
 * locataires déjà servis ce mois-ci ne sont pas relancés.
 */
export function BlocEnvoiFactures({
  periode,
  parametres,
  resume,
  apercu,
}: {
  periode: string;
  parametres: ParametresMail | null;
  resume: ResumeEnvoi;
  /** Premier destinataire, pour montrer le message tel qu'il partira. */
  apercu: { nom: string; box: string | null; loyer: number } | null;
}) {
  const router = useRouter();
  const [enCours, demarreTransition] = useTransition();
  const [reglages, setReglages] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [saisie, setSaisie] = useState<SaisieParametresMail>(
    parametres
      ? {
          expediteur_nom: parametres.expediteur_nom,
          expediteur_email: parametres.expediteur_email,
          repondre_a: parametres.repondre_a,
          copie_email: parametres.copie_email,
          objet: parametres.objet,
          corps: parametres.corps,
        }
      : MODELE_PAR_DEFAUT
  );

  const manques = parametrageIncomplet(parametres);
  const pretAEnvoyer = manques.length === 0 && resume.aEnvoyer > 0;

  const enregistre = () => {
    demarreTransition(async () => {
      const resultat = await sauvegardeParametresMail(saisie);
      if (!resultat.success) {
        vibre(60);
        toast.error(resultat.error ?? "Enregistrement impossible.");
        return;
      }
      vibre();
      toast.success("Paramètres du mail enregistrés.");
      setReglages(false);
      router.refresh();
    });
  };

  const envoie = () => {
    demarreTransition(async () => {
      const resultat = await envoieFacturesDuMois(periode);
      if (!resultat.success) {
        vibre(60);
        toast.error(resultat.error ?? "Envoi impossible.");
        return;
      }
      vibre();
      setConfirmation(false);
      const n = resultat.envoyes ?? 0;
      const echecs = resultat.echecs ?? 0;
      toast.success(
        echecs > 0
          ? `${n} facture${n > 1 ? "s" : ""} envoyée${n > 1 ? "s" : ""}, ${echecs} en échec.`
          : `${n} facture${n > 1 ? "s" : ""} envoyée${n > 1 ? "s" : ""}.`
      );
      router.refresh();
    });
  };

  return (
    <section className="suivi-carte p-4">
      <div className="flex items-center gap-1.5 text-[var(--suivi-gris)]">
        <Send className="size-4" aria-hidden />
        <span className="t-etiquette">Factures par mail</span>
      </div>

      <p className="t-corps mt-1.5">
        {resume.aEnvoyer > 0 ? (
          <>
            <span className="t-nombre font-medium">{resume.aEnvoyer}</span>
            {` facture${resume.aEnvoyer > 1 ? "s" : ""} prête${
              resume.aEnvoyer > 1 ? "s" : ""
            } à partir`}
          </>
        ) : (
          <span className="text-[var(--suivi-gris-clair)]">
            Aucune facture en attente d&apos;envoi.
          </span>
        )}
      </p>

      {(resume.dejaEnvoyes > 0 || resume.sansEmail > 0) && (
        <p className="t-meta mt-0.5">
          {[
            resume.dejaEnvoyes > 0 ? `${resume.dejaEnvoyes} déjà envoyée(s)` : null,
            resume.sansEmail > 0 ? `${resume.sansEmail} sans adresse mail` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      {manques.length > 0 && (
        <p className="t-meta mt-2 rounded-lg bg-[var(--suivi-orange)]/10 px-2.5 py-1.5 text-[var(--suivi-orange)]">
          {`Mail à paramétrer : il manque ${manques.join(", ")}.`}
        </p>
      )}

      <Button
        type="button"
        className="mt-3 h-12 w-full"
        disabled={enCours || !pretAEnvoyer}
        onClick={() => setConfirmation(true)}
      >
        Envoyer les factures du mois
      </Button>

      <button
        type="button"
        onClick={() => setReglages(true)}
        className="suivi-tap t-meta mt-2 flex min-h-11 w-full items-center justify-center gap-1.5"
      >
        <Settings2 className="size-4" aria-hidden />
        Paramétrer le mail
      </button>

      {/* Confirmation d'envoi : le seul écran d'où part quelque chose. */}
      <FeuilleModale
        ouverte={confirmation}
        titre="Envoyer les factures"
        onFermer={() => setConfirmation(false)}
      >
        <p className="t-corps mb-3">{phraseEnvoi(resume.aEnvoyer, periode)}</p>

        {parametres && apercu && (
          <div className="mb-4 rounded-xl bg-[var(--secondary)]/60 p-3">
            <p className="t-etiquette mb-1.5">{`Aperçu — ${apercu.nom}`}</p>
            <p className="t-corps font-medium">
              {interpoleMail(parametres.objet, apercu, periode)}
            </p>
            <p className="t-meta mt-1 whitespace-pre-wrap">
              {interpoleMail(parametres.corps, apercu, periode)}
            </p>
          </div>
        )}

        <p className="t-meta mb-4">
          Un mail parti ne se rattrape pas. Les locataires déjà servis ce mois-ci ne seront pas
          relancés.
        </p>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1"
            onClick={() => setConfirmation(false)}
          >
            Non
          </Button>
          <Button type="button" className="h-12 flex-1" disabled={enCours} onClick={envoie}>
            Envoyer
          </Button>
        </div>
      </FeuilleModale>

      {/* Paramétrage */}
      <FeuilleModale
        ouverte={reglages}
        titre="Paramétrer le mail de facture"
        onFermer={() => setReglages(false)}
      >
        <Champ
          libelle="Nom de l'expéditeur"
          valeur={saisie.expediteur_nom}
          onChange={(v) => setSaisie({ ...saisie, expediteur_nom: v })}
          placeholder="LG BOX"
        />
        <Champ
          libelle="Adresse d'expédition"
          type="email"
          valeur={saisie.expediteur_email}
          onChange={(v) => setSaisie({ ...saisie, expediteur_email: v })}
          placeholder="contact@lg-box.fr"
          aide="Le domaine doit être vérifié chez le fournisseur d'envoi."
        />
        <Champ
          libelle="Répondre à (facultatif)"
          type="email"
          valeur={saisie.repondre_a ?? ""}
          onChange={(v) => setSaisie({ ...saisie, repondre_a: v })}
        />
        <Champ
          libelle="Copie cachée (facultatif)"
          type="email"
          valeur={saisie.copie_email ?? ""}
          onChange={(v) => setSaisie({ ...saisie, copie_email: v })}
          aide="Pour garder une copie de chaque facture envoyée."
        />
        <Champ
          libelle="Objet"
          valeur={saisie.objet}
          onChange={(v) => setSaisie({ ...saisie, objet: v })}
        />

        <label className="t-etiquette mb-1 block">Message</label>
        <textarea
          value={saisie.corps}
          onChange={(e) => setSaisie({ ...saisie, corps: e.target.value })}
          rows={9}
          className="mb-1 w-full rounded-xl border border-input bg-background p-3 t-corps outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="t-meta mb-3">
          {`Variables remplacées à l'envoi : ${VARIABLES_MAIL.join(" ")}`}
        </p>

        {apercu && (
          <div className="mb-3 rounded-xl bg-[var(--secondary)]/60 p-3">
            <p className="t-etiquette mb-1.5">
              {`Aperçu sur ${apercu.nom} — ${labelPeriode(periode)}`}
            </p>
            <p className="t-corps font-medium">{interpoleMail(saisie.objet, apercu, periode)}</p>
            <p className="t-meta mt-1 whitespace-pre-wrap">
              {interpoleMail(saisie.corps, apercu, periode)}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1"
            onClick={() => setReglages(false)}
          >
            Annuler
          </Button>
          <Button type="button" className="h-12 flex-1" disabled={enCours} onClick={enregistre}>
            Enregistrer
          </Button>
        </div>
      </FeuilleModale>
    </section>
  );
}

function Champ({
  libelle,
  valeur,
  onChange,
  type = "text",
  placeholder,
  aide,
}: {
  libelle: string;
  valeur: string;
  onChange: (valeur: string) => void;
  type?: string;
  placeholder?: string;
  aide?: string;
}) {
  return (
    <label className="mb-3 block">
      <span className="t-etiquette mb-1 block">{libelle}</span>
      <input
        type={type}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect="off"
        className="h-12 w-full rounded-xl border border-input bg-background px-3 t-corps outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {aide && <span className="t-meta mt-1 block">{aide}</span>}
    </label>
  );
}
