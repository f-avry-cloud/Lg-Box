"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { vibre } from "@/components/suivi/bouton-encaissement";
import { FeuilleModale } from "@/components/suivi/feuille-modale";
import { Button } from "@/components/ui/button";
import { annuleFacturationDuMois, factureLeMois } from "@/lib/actions/suivi-facturation";
import { dePeriode } from "@/lib/suivi/period";

/**
 * « Passer le mois en facturé », en un tap et une confirmation.
 *
 * La confirmation n'est pas une politesse : le geste touche une soixantaine de
 * lignes d'un coup. Elle annonce donc le nombre exact de locataires et le
 * montant réclamé, avant. Et comme l'erreur reste possible, elle se défait —
 * l'annulation ne retire que les lignes restées « facturé », jamais un loyer
 * rentré entre-temps.
 */
export function BoutonFacturation({
  periode,
  aFacturer,
  dejaFacturees,
  montant,
}: {
  periode: string;
  aFacturer: number;
  dejaFacturees: number;
  montant: number;
}) {
  const router = useRouter();
  const [enCours, demarreTransition] = useTransition();
  const [confirmation, setConfirmation] = useState<"facturer" | "annuler" | null>(null);

  const lance = (quoi: "facturer" | "annuler") => {
    demarreTransition(async () => {
      const resultat =
        quoi === "facturer" ? await factureLeMois(periode) : await annuleFacturationDuMois(periode);

      if (!resultat.success) {
        vibre(60);
        toast.error(resultat.error ?? "Opération impossible.");
        return;
      }

      vibre();
      setConfirmation(null);
      const n = resultat.factures ?? 0;
      toast.success(
        quoi === "facturer"
          ? n === 0
            ? "Rien à facturer : le mois est déjà à jour."
            : `${n} loyer${n > 1 ? "s" : ""} passé${n > 1 ? "s" : ""} en facturé.`
          : `Facturation annulée sur ${n} loyer${n > 1 ? "s" : ""}.`
      );
      router.refresh();
    });
  };

  return (
    <section className="suivi-carte p-4">
      <div className="flex items-center gap-1.5 text-[var(--suivi-gris)]">
        <FileText className="size-4" aria-hidden />
        <span className="t-etiquette">Facturation du mois</span>
      </div>

      <p className="t-corps mt-1.5">
        {aFacturer > 0 ? (
          <>
            <span className="t-nombre font-medium">{aFacturer}</span>
            {` loyer${aFacturer > 1 ? "s" : ""} à réclamer · `}
            <span className="t-nombre font-medium">{montant.toLocaleString("fr-FR")} €</span>
          </>
        ) : (
          <span className="text-[var(--suivi-gris-clair)]">
            {`Tous les loyers ${dePeriode(periode)} sont réclamés ou réglés.`}
          </span>
        )}
      </p>

      {dejaFacturees > 0 && (
        <p className="t-meta mt-0.5">{`${dejaFacturees} déjà en attente de règlement.`}</p>
      )}

      <Button
        type="button"
        className="mt-3 h-12 w-full"
        disabled={enCours || aFacturer === 0}
        onClick={() => setConfirmation("facturer")}
      >
        Passer le mois en facturé
      </Button>

      {dejaFacturees > 0 && (
        <button
          type="button"
          disabled={enCours}
          onClick={() => setConfirmation("annuler")}
          className="suivi-tap t-meta mt-2 flex min-h-11 w-full items-center justify-center gap-1.5"
        >
          <Undo2 className="size-4" aria-hidden />
          Annuler la facturation du mois
        </button>
      )}

      <FeuilleModale
        ouverte={confirmation !== null}
        titre={confirmation === "annuler" ? "Annuler la facturation" : "Confirmer la facturation"}
        onFermer={() => setConfirmation(null)}
      >
        {confirmation === "annuler" ? (
          <p className="t-corps mb-4">
            {`Retirer la mention « facturé » sur ${dejaFacturees} loyer${
              dejaFacturees > 1 ? "s" : ""
            } ${dePeriode(periode)} ? Les règlements déjà encaissés ne sont pas touchés.`}
          </p>
        ) : (
          <p className="t-corps mb-4">
            {`Marquer comme facturés ${aFacturer} loyer${
              aFacturer > 1 ? "s" : ""
            } ${dePeriode(periode)}, pour ${montant.toLocaleString(
              "fr-FR"
            )} € ? Les loyers déjà réglés gardent leur statut.`}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1"
            onClick={() => setConfirmation(null)}
          >
            Non
          </Button>
          <Button
            type="button"
            variant={confirmation === "annuler" ? "destructive" : "default"}
            className="h-12 flex-1"
            disabled={enCours}
            onClick={() => lance(confirmation === "annuler" ? "annuler" : "facturer")}
          >
            {confirmation === "annuler" ? "Annuler" : "Confirmer"}
          </Button>
        </div>
      </FeuilleModale>
    </section>
  );
}
