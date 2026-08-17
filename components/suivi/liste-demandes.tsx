"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Inbox, Ruler } from "lucide-react";
import { toast } from "sonner";

import { BlocContact } from "@/components/suivi/bloc-contact";
import { vibre } from "@/components/suivi/bouton-encaissement";
import { FeuilleModale } from "@/components/suivi/feuille-modale";
import { updateReservationStatus } from "@/lib/actions/reservations";
import { formatDate } from "@/lib/format";
import { couleurPastille, initiales } from "@/lib/suivi/totals";
import {
  STATUTS_DEMANDE,
  STATUT_DEMANDE_LABELS,
  couleurStatutDemande,
  type DemandeReservation,
  type StatutDemande,
} from "@/lib/suivi/types";
import { cn } from "@/lib/utils";

/**
 * Les demandes de réservation, à traiter depuis le téléphone.
 *
 * Même présentation que la liste des locataires — pastille d'initiales, nom,
 * une ligne de contexte — parce que le geste est le même : on ouvre, on
 * regarde, on appelle. La différence tient au statut, qui avance ici au lieu
 * d'attendre un passage par le back-office.
 */
export function ListeDemandes({ demandes }: { demandes: DemandeReservation[] }) {
  const router = useRouter();
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<"attente" | "toutes">("attente");
  const [enCours, demarreTransition] = useTransition();

  const nouvelles = demandes.filter((d) => d.statut === "nouvelle").length;

  const visibles = useMemo(
    () => (filtre === "attente" ? demandes.filter((d) => d.statut === "nouvelle") : demandes),
    [demandes, filtre]
  );

  const demande = demandes.find((d) => d.id === ouverte) ?? null;

  const changeStatut = (id: string, statut: StatutDemande) => {
    demarreTransition(async () => {
      const resultat = await updateReservationStatus(id, statut);
      if (!resultat.success) {
        vibre(60);
        toast.error(resultat.error ?? "Modification impossible.");
        return;
      }
      vibre();
      toast.success(`Demande ${STATUT_DEMANDE_LABELS[statut].toLocaleLowerCase("fr")}.`);
      router.refresh();
    });
  };

  return (
    <>
      <div className="suivi-safe-top sticky top-0 z-30 border-b border-border bg-background/95 px-4 pb-2 pt-3 backdrop-blur">
        <h1 className="t-titre">Demandes de réservation</h1>
        <p className="t-meta">
          {nouvelles > 0
            ? `${nouvelles} nouvelle${nouvelles > 1 ? "s" : ""} à rappeler`
            : "Aucune demande en attente"}
        </p>

        <div className="mt-2 flex gap-2">
          {(
            [
              ["attente", "À traiter"],
              ["toutes", "Toutes"],
            ] as const
          ).map(([valeur, libelle]) => (
            <button
              key={valeur}
              type="button"
              aria-pressed={filtre === valeur}
              onClick={() => setFiltre(valeur)}
              className={cn(
                "suivi-tap min-h-10 flex-1 rounded-full border text-sm font-semibold",
                filtre === valeur
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card active:bg-secondary"
              )}
            >
              {libelle}
            </button>
          ))}
        </div>
      </div>

      <div className="suivi-scroll-simple p-3">
        {visibles.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Inbox className="size-10 text-[var(--suivi-gris)]" aria-hidden />
            <p className="t-corps text-[var(--suivi-gris)]">
              {filtre === "attente"
                ? "Toutes les demandes ont été traitées."
                : "Aucune demande reçue pour l'instant."}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {visibles.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setOuverte(d.id)}
              className="suivi-tap flex w-full items-center gap-3 suivi-carte p-3 text-left active:bg-secondary/60"
            >
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: couleurPastille(d.nom) }}
                aria-hidden
              >
                {initiales(d.nom)}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate t-corps font-medium">{d.nom}</span>
                <span className="block truncate t-meta">
                  {[
                    d.taille_souhaitee,
                    d.date_souhaitee ? `pour le ${formatDate(d.date_souhaitee)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || formatDate(d.created_at)}
                </span>
              </span>

              <span
                className="t-etiquette shrink-0 rounded-full px-2 py-1 text-white"
                style={{ backgroundColor: couleurStatutDemande(d.statut) }}
              >
                {STATUT_DEMANDE_LABELS[d.statut]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <FeuilleModale
        ouverte={demande !== null}
        titre={demande?.nom ?? ""}
        onFermer={() => setOuverte(null)}
      >
        {demande && (
          <>
            <p className="mb-3 t-meta">
              {`Reçue le ${formatDate(demande.created_at)}`}
            </p>

            <dl className="mb-3 grid grid-cols-2 gap-x-3 gap-y-2">
              <Donnee
                icone={<Ruler className="size-4" aria-hidden />}
                libelle="Taille souhaitée"
                valeur={demande.taille_souhaitee ?? "non précisée"}
              />
              <Donnee
                icone={<CalendarDays className="size-4" aria-hidden />}
                libelle="Date souhaitée"
                valeur={demande.date_souhaitee ? formatDate(demande.date_souhaitee) : "non précisée"}
              />
            </dl>

            {demande.message && (
              <p className="mb-3 whitespace-pre-wrap rounded-xl border border-border bg-secondary/40 p-3 text-sm">
                {demande.message}
              </p>
            )}

            <BlocContact
              telephone={demande.telephone}
              email={demande.email}
              className="mb-4"
            />

            <span className="mb-1 block t-etiquette">
              Suivi de la demande
            </span>
            <div className="grid grid-cols-2 gap-2">
              {STATUTS_DEMANDE.map((statut) => (
                <button
                  key={statut}
                  type="button"
                  disabled={enCours || statut === demande.statut}
                  aria-pressed={statut === demande.statut}
                  onClick={() => changeStatut(demande.id, statut)}
                  className={cn(
                    "suivi-tap min-h-12 rounded-xl border text-sm font-semibold",
                    statut === demande.statut
                      ? "border-transparent text-white"
                      : "border-border bg-background active:bg-secondary"
                  )}
                  style={
                    statut === demande.statut
                      ? { backgroundColor: couleurStatutDemande(statut) }
                      : undefined
                  }
                >
                  {STATUT_DEMANDE_LABELS[statut]}
                </button>
              ))}
            </div>
          </>
        )}
      </FeuilleModale>
    </>
  );
}

function Donnee({
  icone,
  libelle,
  valeur,
}: {
  icone: React.ReactNode;
  libelle: string;
  valeur: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1 t-etiquette">
        {icone}
        {libelle}
      </dt>
      <dd className="t-corps font-medium">{valeur}</dd>
    </div>
  );
}
