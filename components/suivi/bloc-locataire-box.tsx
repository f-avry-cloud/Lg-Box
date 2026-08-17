"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Mail, MessageSquare, Phone } from "lucide-react";
import { toast } from "sonner";

import { vibre } from "@/components/suivi/bouton-encaissement";
import { Button } from "@/components/ui/button";
import { basculeReglement, detacheBoxDuContrat } from "@/lib/actions/suivi";
import { modifiePeriodicite } from "@/lib/actions/suivi-box";
import { libelleAnciennete } from "@/lib/suivi/anciennete";
import { labelPeriode, periodeCourante } from "@/lib/suivi/period";
import {
  PERIODICITE_LABELS,
  type BoxListe,
  type Periodicite,
  type ReglementStatut,
} from "@/lib/suivi/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const LIBELLE_STATUT: Record<ReglementStatut, string> = {
  paye: "Réglé",
  partiel: "Partiellement réglé",
  retard: "En retard",
  attendu: "En attente",
};

function couleurStatut(statut: ReglementStatut): string {
  if (statut === "paye") return "var(--suivi-vert)";
  if (statut === "partiel" || statut === "retard") return "var(--suivi-orange)";
  return "var(--suivi-gris)";
}

/**
 * Ce qu'on veut savoir d'un box occupé, sans quitter sa fiche : qui l'occupe,
 * ce qu'il paie, s'il est à jour, et comment le joindre.
 *
 * C'est le bloc mis en avant, avant les champs modifiables du box : le
 * parcours courant est « j'ouvre un box, je regarde son statut, j'appelle si
 * besoin » — pas « j'ouvre un box pour corriger sa surface ».
 */
export function BlocLocataireBox({ box }: { box: BoxListe }) {
  const router = useRouter();
  const [enCours, demarreTransition] = useTransition();
  const [periodicite, setPeriodicite] = useState<Periodicite>(
    box.detail?.periodicite ?? "mensuelle"
  );
  const [confirmeDetachement, setConfirmeDetachement] = useState(false);

  const detail = box.detail;
  if (!detail) return null;

  const periode = periodeCourante();
  const statut: ReglementStatut = detail.reglement?.statut ?? "attendu";
  const paye = statut === "paye";
  const anciennete = libelleAnciennete(detail.date_entree);

  const changePeriodicite = (valeur: Periodicite) => {
    if (!box.contrat_id || valeur === periodicite) return;
    const precedente = periodicite;
    setPeriodicite(valeur);

    demarreTransition(async () => {
      const resultat = await modifiePeriodicite(box.contrat_id!, valeur);
      if (!resultat.success) {
        setPeriodicite(precedente);
        vibre(60);
        toast.error(resultat.error ?? "Modification impossible.");
        return;
      }
      vibre();
      router.refresh();
    });
  };

  const basculePaiement = () => {
    if (!box.contrat_id) return;
    demarreTransition(async () => {
      const resultat = await basculeReglement(box.contrat_id!, periode, !paye);
      if (!resultat.success) {
        vibre(60);
        toast.error(resultat.error ?? "Enregistrement impossible.");
        return;
      }
      vibre();
      toast.success(paye ? "Règlement annulé." : "Règlement enregistré.");
      router.refresh();
    });
  };

  return (
    <section className="mb-4 rounded-2xl border border-border bg-card p-3">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-foreground">{detail.nom}</h3>
          {detail.societe && (
            <p className="truncate text-sm text-[var(--suivi-gris)]">{detail.societe}</p>
          )}
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-sm font-bold text-white"
          style={{ backgroundColor: couleurStatut(statut) }}
        >
          {LIBELLE_STATUT[statut]}
        </span>
      </div>

      {/* Les quatre chiffres du contrat, en un coup d'œil. */}
      <dl className="mb-3 grid grid-cols-2 gap-x-3 gap-y-2">
        <Donnee
          libelle="Surface louée"
          valeur={box.surface_m2 != null ? `${Number(box.surface_m2.toFixed(2))} m²` : "à mesurer"}
          alerte={box.surface_m2 == null}
        />
        <Donnee libelle="Loyer" valeur={`${detail.loyer_mensuel_eur} €`} />
        <Donnee
          libelle="Date d'entrée"
          valeur={detail.date_entree ? formatDate(detail.date_entree) : "—"}
          detail={anciennete ?? undefined}
        />
        <Donnee libelle="Règlement" valeur={labelPeriode(periode)} detail={LIBELLE_STATUT[statut]} />
      </dl>

      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--suivi-gris)]">
        Périodicité
      </span>
      <div className="mb-3 flex gap-2">
        {(["mensuelle", "trimestrielle"] as const).map((valeur) => (
          <button
            key={valeur}
            type="button"
            disabled={enCours || !box.contrat_id}
            onClick={() => changePeriodicite(valeur)}
            aria-pressed={periodicite === valeur}
            className={cn(
              "suivi-tap min-h-12 flex-1 rounded-xl border text-sm font-semibold",
              periodicite === valeur
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background active:bg-secondary"
            )}
          >
            {PERIODICITE_LABELS[valeur]}
          </button>
        ))}
      </div>

      {/* Joindre le locataire : la raison la plus fréquente d'ouvrir un box. */}
      <div className="mb-2 grid grid-cols-3 gap-2">
        <Contact
          href={detail.telephone ? `tel:${detail.telephone}` : null}
          icone={<Phone className="size-5" />}
          libelle="Appeler"
        />
        <Contact
          href={detail.telephone ? `sms:${detail.telephone}` : null}
          icone={<MessageSquare className="size-5" />}
          libelle="SMS"
        />
        <Contact
          href={detail.email ? `mailto:${detail.email}` : null}
          icone={<Mail className="size-5" />}
          libelle="E-mail"
        />
      </div>

      {detail.telephone && (
        // iOS réserve tel: et sms: à l'app d'appel par défaut du système ;
        // copier reste le repli pour composer depuis une app de second numéro.
        <button
          type="button"
          onClick={async () => {
            try {
              if (!navigator.clipboard?.writeText) throw new Error("indisponible");
              await navigator.clipboard.writeText(detail.telephone!);
              vibre();
              toast.success(`${detail.telephone} copié.`);
            } catch {
              toast.error("Copie impossible — sélectionnez le numéro à la main.");
            }
          }}
          className="suivi-tap mb-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold active:bg-secondary"
        >
          <Copy className="size-4" aria-hidden />
          Copier le numéro
        </button>
      )}

      <Button
        type="button"
        variant={paye ? "outline" : "success"}
        className="h-14 w-full text-base"
        disabled={enCours || !box.contrat_id}
        onClick={basculePaiement}
      >
        {paye ? "Annuler le règlement" : `Marquer réglé — ${labelPeriode(periode)}`}
      </Button>

      {/* Détacher est une opération rare et structurante : discrète, et
          confirmée, plutôt qu'à portée de pouce distrait. */}
      {confirmeDetachement ? (
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1"
            onClick={() => setConfirmeDetachement(false)}
          >
            Non, garder
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-12 flex-1"
            disabled={enCours}
            onClick={() => {
              if (!box.contrat_id) return;
              demarreTransition(async () => {
                const resultat = await detacheBoxDuContrat(box.contrat_id!);
                if (!resultat.success) {
                  vibre(60);
                  toast.error(resultat.error ?? "Détachement impossible.");
                  return;
                }
                vibre();
                toast.success(`${detail.nom} détaché du box.`);
                router.refresh();
              });
            }}
          >
            Détacher
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmeDetachement(true)}
          className="suivi-tap mt-3 min-h-11 w-full text-sm font-medium text-destructive"
        >
          Détacher ce locataire du box
        </button>
      )}
    </section>
  );
}

function Donnee({
  libelle,
  valeur,
  detail,
  alerte,
}: {
  libelle: string;
  valeur: string;
  detail?: string;
  alerte?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--suivi-gris)]">
        {libelle}
      </dt>
      <dd
        className="text-base font-bold tabular-nums"
        style={{ color: alerte ? "var(--suivi-orange)" : "var(--foreground)" }}
      >
        {valeur}
      </dd>
      {detail && <dd className="text-xs text-[var(--suivi-gris)]">{detail}</dd>}
    </div>
  );
}

function Contact({
  href,
  icone,
  libelle,
}: {
  href: string | null;
  icone: React.ReactNode;
  libelle: string;
}) {
  if (!href) {
    return (
      <span className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-border text-xs text-[var(--suivi-gris)] opacity-60">
        {icone}
        {libelle}
      </span>
    );
  }

  return (
    <a
      href={href}
      className="suivi-tap flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border border-border bg-background text-xs font-semibold text-primary active:bg-secondary"
    >
      {icone}
      {libelle}
    </a>
  );
}
