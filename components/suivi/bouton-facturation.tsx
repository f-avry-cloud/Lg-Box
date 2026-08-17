"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { vibre } from "@/components/suivi/bouton-encaissement";
import { FeuilleModale } from "@/components/suivi/feuille-modale";
import { Button } from "@/components/ui/button";
import { annuleFacturationDuMois, factureLeMois } from "@/lib/actions/suivi-facturation";
import { labelPeriode } from "@/lib/suivi/period";

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
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[var(--suivi-gris)]">
        <FileText className="size-5" aria-hidden />
        <span className="text-sm font-semibold uppercase tracking-wide">Facturation du mois</span>
      </div>

      <p className="mt-1 text-base text-[var(--suivi-gris)]">
        {aFacturer > 0 ? (
          <>
            <strong className="text-foreground tabular-nums">{aFacturer}</strong>
            {` loyer${aFacturer > 1 ? "s" : ""} à réclamer · `}
            <strong className="text-foreground tabular-nums">
              {montant.toLocaleString("fr-FR")} €
            </strong>
          </>
        ) : (
          `Tous les loyers de ${labelPeriode(periode)} sont réclamés ou réglés.`
        )}
      </p>

      {dejaFacturees > 0 && (
        <p className="mt-0.5 text-sm text-[var(--suivi-gris)]">
          {`${dejaFacturees} déjà en attente de règlement.`}
        </p>
      )}

      <Button
        type="button"
        className="mt-3 h-14 w-full text-base"
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
          className="suivi-tap mt-2 flex min-h-11 w-full items-center justify-center gap-2 text-sm font-medium text-[var(--suivi-gris)]"
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
          <p className="mb-4 text-base">
            {`Retirer la mention « facturé » sur ${dejaFacturees} loyer${
              dejaFacturees > 1 ? "s" : ""
            } de ${labelPeriode(periode)} ? Les règlements déjà encaissés ne sont pas touchés.`}
          </p>
        ) : (
          <p className="mb-4 text-base">
            {`Marquer comme facturés ${aFacturer} loyer${
              aFacturer > 1 ? "s" : ""
            } de ${labelPeriode(periode)}, pour ${montant.toLocaleString(
              "fr-FR"
            )} € ? Les loyers déjà réglés gardent leur statut.`}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-14 flex-1"
            onClick={() => setConfirmation(null)}
          >
            Non
          </Button>
          <Button
            type="button"
            variant={confirmation === "annuler" ? "destructive" : "default"}
            className="h-14 flex-1"
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
