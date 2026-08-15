"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Mail, MessageSquare, Phone } from "lucide-react";
import { toast } from "sonner";

import { vibre } from "@/components/suivi/bouton-encaissement";
import {
  FeuilleEncaissement,
  type SaisieEncaissement,
} from "@/components/suivi/feuille-encaissement";
import { FeuilleRattachement } from "@/components/suivi/feuille-rattachement";
import { Button } from "@/components/ui/button";
import {
  basculeReglement,
  enregistreDetailReglement,
  sauvegardeObservations,
} from "@/lib/actions/suivi";
import { libelleAnciennete } from "@/lib/suivi/anciennete";
import { douzeDernieresPeriodes, labelMoisCourt, labelPeriode } from "@/lib/suivi/period";
import { couleurPastille, initiales } from "@/lib/suivi/totals";
import {
  BOX_A_IDENTIFIER,
  MOYEN_LABELS,
  type BoxRattachable,
  type FicheLocataire,
  type LigneMois,
  type Reglement,
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

export function FicheLocataireVue({
  fiche,
  periode,
  boxRattachables = [],
}: {
  fiche: FicheLocataire;
  periode: string;
  boxRattachables?: BoxRattachable[];
}) {
  const router = useRouter();
  const [reglements, setReglements] = useState<Reglement[]>(fiche.reglements);
  const [observations, setObservations] = useState(fiche.locataire.observations ?? "");
  const [horodatage, setHorodatage] = useState(fiche.locataire.observations_updated_at);
  const [contratEnSaisie, setContratEnSaisie] = useState<string | null>(null);
  const [contratARattacher, setContratARattacher] = useState<string | null>(null);
  const [, demarreTransition] = useTransition();

  const parContratEtPeriode = useMemo(() => {
    const index = new Map<string, Reglement>();
    for (const r of reglements) index.set(`${r.contrat_id}|${r.periode}`, r);
    return index;
  }, [reglements]);

  const reglementDe = (contratId: string, p = periode) =>
    parContratEtPeriode.get(`${contratId}|${p}`) ?? null;

  const remplace = (contratId: string, p: string, suivant: Reglement | null) => {
    setReglements((actuels) => {
      const autres = actuels.filter((r) => !(r.contrat_id === contratId && r.periode === p));
      return suivant ? [...autres, suivant] : autres;
    });
  };

  const appliqueEtEnregistre = (
    contratId: string,
    suivant: Reglement | null,
    action: () => Promise<{ success: boolean; error?: string }>
  ) => {
    const precedents = reglements;
    remplace(contratId, periode, suivant);

    demarreTransition(async () => {
      const resultat = await action();
      if (!resultat.success) {
        setReglements(precedents);
        vibre(60);
        toast.error(resultat.error ?? "Enregistrement impossible — réessayez.");
        return;
      }
      // La liste du mois affiche le même règlement : elle doit repartir du
      // serveur au retour, pas de son ancien rendu en cache.
      router.refresh();
    });
  };

  const bascule = (contratId: string) => {
    const actuel = reglementDe(contratId);
    const paye = actuel?.statut !== "paye";
    vibre();

    appliqueEtEnregistre(
      contratId,
      paye
        ? {
            id: actuel?.id ?? `optimiste-${contratId}`,
            contrat_id: contratId,
            periode,
            statut: "paye",
            montant_encaisse_eur: 0,
            date_encaissement: new Date().toISOString().slice(0, 10),
            moyen: null,
            note: null,
            updated_at: new Date().toISOString(),
          }
        : null,
      () => basculeReglement(contratId, periode, paye)
    );
  };

  const enregistreDetail = (ligne: LigneMois, saisie: SaisieEncaissement) => {
    setContratEnSaisie(null);
    const montant = saisie.montant;
    const statut: ReglementStatut | null =
      montant === 0 ? null : montant >= ligne.loyer_mensuel_eur ? "paye" : "partiel";

    appliqueEtEnregistre(
      ligne.contrat_id,
      statut
        ? {
            id: ligne.reglement?.id ?? `optimiste-${ligne.contrat_id}`,
            contrat_id: ligne.contrat_id,
            periode,
            statut,
            montant_encaisse_eur: montant,
            date_encaissement: saisie.date,
            moyen: (saisie.moyen as Reglement["moyen"]) ?? null,
            note: saisie.note,
            updated_at: new Date().toISOString(),
          }
        : null,
      () =>
        enregistreDetailReglement(ligne.contrat_id, periode, ligne.loyer_mensuel_eur, saisie)
    );
  };

  /** Sauvegarde des observations à la perte de focus, si le texte a changé. */
  const surPerteFocusObservations = () => {
    if (observations === (fiche.locataire.observations ?? "")) return;
    demarreTransition(async () => {
      const resultat = await sauvegardeObservations(fiche.locataire.id, observations);
      if (!resultat.success) {
        toast.error(resultat.error ?? "Observations non enregistrées.");
        return;
      }
      setHorodatage(new Date().toISOString());
      toast.success("Observations enregistrées.");
    });
  };

  const { locataire, contrats } = fiche;
  const plusieursBox = contrats.length > 1;

  // Statut global du mois affiché dans le badge d'en-tête : soldé seulement si
  // tous les contrats du locataire le sont.
  const statutGlobal: ReglementStatut = (() => {
    if (contrats.length === 0) return "attendu";
    const statuts = contrats.map((c) => reglementDe(c.id)?.statut ?? "attendu");
    if (statuts.every((s) => s === "paye")) return "paye";
    if (statuts.some((s) => s === "paye" || s === "partiel")) return "partiel";
    return "attendu";
  })();

  const ligneDuContrat = (contratId: string, loyer: number): LigneMois => ({
    contrat_id: contratId,
    locataire_id: locataire.id,
    nom: locataire.nom,
    societe: locataire.societe,
    box_numero: null,
    batiment: null,
    loyer_mensuel_eur: loyer,
    reglement: reglementDe(contratId),
  });

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <header className="suivi-safe-top sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/95 px-2 py-2 backdrop-blur">
        <Link
          href={`/suivi?mois=${periode}`}
          aria-label="Retour à la liste du mois"
          className="suivi-tap flex h-11 w-11 items-center justify-center rounded-full active:bg-secondary"
        >
          <ArrowLeft className="size-6" />
        </Link>
        <span className="truncate text-base font-semibold">{labelPeriode(periode)}</span>
      </header>

      {/* En-tête locataire */}
      <section className="flex items-center gap-3 px-4 py-4">
        <span
          aria-hidden
          className="flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
          style={{ backgroundColor: couleurPastille(locataire.nom) }}
        >
          {initiales(locataire.nom)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-foreground">{locataire.nom}</h1>
          {locataire.societe && (
            <p className="truncate text-sm text-[var(--suivi-gris)]">{locataire.societe}</p>
          )}
          <span
            className="mt-1 inline-block rounded-full px-2 py-0.5 text-sm font-semibold text-white"
            style={{ backgroundColor: couleurStatut(statutGlobal) }}
          >
            {LIBELLE_STATUT[statutGlobal]}
          </span>
        </div>
      </section>

      {/* Bloc box */}
      <section className="px-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--suivi-gris)]">
          {plusieursBox ? `Box (${contrats.length})` : "Box"}
        </h2>
        <div className="space-y-2">
          {contrats.map((contrat) => {
            const anciennete = libelleAnciennete(contrat.date_debut);
            return (
              <div key={contrat.id} className="rounded-xl border border-border bg-card p-3">
                <p className="text-base font-bold text-foreground">
                  {contrat.box
                    ? `Box ${contrat.box.numero}`
                    : BOX_A_IDENTIFIER.charAt(0).toUpperCase() + BOX_A_IDENTIFIER.slice(1)}
                </p>
                <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  {contrat.box?.batiment && (
                    <>
                      <dt className="text-[var(--suivi-gris)]">Bâtiment</dt>
                      <dd className="text-right font-medium">{contrat.box.batiment}</dd>
                    </>
                  )}
                  {contrat.box?.surface_m2 != null && (
                    <>
                      <dt className="text-[var(--suivi-gris)]">Surface</dt>
                      <dd className="text-right font-medium">{contrat.box.surface_m2} m²</dd>
                    </>
                  )}
                  <dt className="text-[var(--suivi-gris)]">Loyer mensuel</dt>
                  <dd className="text-right font-bold tabular-nums">
                    {contrat.loyer_mensuel_eur} €
                  </dd>
                  {contrat.date_debut && (
                    <>
                      <dt className="text-[var(--suivi-gris)]">Entrée</dt>
                      <dd className="text-right font-medium">{formatDate(contrat.date_debut)}</dd>
                    </>
                  )}
                </dl>
                {anciennete && (
                  <p className="mt-1 text-sm italic text-[var(--suivi-gris)]">{anciennete}</p>
                )}
                {contrat.remarque && (
                  <p className="mt-1 text-sm text-[var(--suivi-orange)]">{contrat.remarque}</p>
                )}

                {/* Le geste qui résout les « box à identifier » du carnet. */}
                {!contrat.box && boxRattachables.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 h-12 w-full text-base"
                    onClick={() => setContratARattacher(contrat.id)}
                  >
                    Rattacher un box
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Bloc coordonnées : les boutons les plus utiles de la fiche. */}
      <section className="px-4 pt-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--suivi-gris)]">
          Contacter
        </h2>
        {locataire.telephone || locataire.email ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              <BoutonContact
                href={locataire.telephone ? `tel:${locataire.telephone}` : null}
                icone={<Phone className="size-6" />}
                libelle="Appeler"
              />
              <BoutonContact
                href={locataire.telephone ? `sms:${locataire.telephone}` : null}
                icone={<MessageSquare className="size-6" />}
                libelle="SMS"
              />
              <BoutonContact
                href={locataire.email ? `mailto:${locataire.email}` : null}
                icone={<Mail className="size-6" />}
                libelle="E-mail"
              />
            </div>

            {/*
              iOS réserve les liens tel: et sms: à l'app d'appel par défaut du
              système (Réglages → Apps → Apps par défaut). Aucune page web ne
              peut forcer une autre app. Copier le numéro reste donc le repli
              fiable quand on veut composer depuis une app de second numéro.
            */}
            {locataire.telephone && (
              <BoutonCopier valeur={locataire.telephone} libelle="Copier le numéro" />
            )}
          </>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-3 text-sm text-[var(--suivi-gris)]">
            Aucune coordonnée renseignée.
          </p>
        )}
      </section>

      {/* Bloc règlement du mois */}
      <section className="px-4 pt-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--suivi-gris)]">
          Règlement — {labelPeriode(periode)}
        </h2>
        <div className="space-y-3">
          {contrats.map((contrat) => {
            const reglement = reglementDe(contrat.id);
            const statut = reglement?.statut ?? "attendu";
            const paye = statut === "paye";
            const montant =
              reglement?.montant_encaisse_eur ||
              (paye ? contrat.loyer_mensuel_eur : 0);

            return (
              <div key={contrat.id} className="rounded-xl border border-border bg-card p-3">
                {plusieursBox && (
                  <p className="mb-1 text-sm font-medium text-[var(--suivi-gris)]">
                    {contrat.box ? `Box ${contrat.box.numero}` : BOX_A_IDENTIFIER}
                  </p>
                )}
                <p
                  className="text-2xl font-bold"
                  style={{ color: couleurStatut(statut) }}
                >
                  {LIBELLE_STATUT[statut]}
                </p>

                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  <dt className="text-[var(--suivi-gris)]">Montant encaissé</dt>
                  <dd className="text-right font-bold tabular-nums">
                    {montant} € / {contrat.loyer_mensuel_eur} €
                  </dd>
                  <dt className="text-[var(--suivi-gris)]">Date</dt>
                  <dd className="text-right font-medium">
                    {reglement?.date_encaissement ? formatDate(reglement.date_encaissement) : "—"}
                  </dd>
                  <dt className="text-[var(--suivi-gris)]">Moyen</dt>
                  <dd className="text-right font-medium">
                    {reglement?.moyen ? MOYEN_LABELS[reglement.moyen] : "—"}
                  </dd>
                </dl>

                {reglement?.note && (
                  <p className="mt-1 text-sm text-[var(--suivi-gris)]">{reglement.note}</p>
                )}

                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    type="button"
                    variant={paye ? "outline" : "success"}
                    className="h-14 w-full text-base"
                    onClick={() => bascule(contrat.id)}
                  >
                    {paye ? "Annuler le règlement" : "Marquer comme réglé"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-12 w-full text-base"
                    onClick={() => setContratEnSaisie(contrat.id)}
                  >
                    Saisir montant, date et moyen
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Observations */}
      <section className="px-4 pt-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--suivi-gris)]">
          Observations
        </h2>
        <textarea
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          onBlur={surPerteFocusObservations}
          rows={4}
          placeholder="Relances, promesses de paiement, changement de RIB…"
          className="w-full rounded-xl border border-input bg-card p-3 text-base leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="mt-1 text-sm text-[var(--suivi-gris)]">
          {horodatage
            ? `Enregistré le ${formatDate(horodatage)}`
            : "Enregistrement automatique en quittant le champ."}
        </p>
      </section>

      {/* Historique 12 mois */}
      <section className="px-4 pt-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--suivi-gris)]">
          Douze derniers mois
        </h2>
        <div className="grid grid-cols-6 gap-2">
          {douzeDernieresPeriodes(periode).map((p) => {
            const statuts = contrats.map(
              (c) => parContratEtPeriode.get(`${c.id}|${p}`)?.statut ?? "attendu"
            );
            const statut: ReglementStatut =
              statuts.length > 0 && statuts.every((s) => s === "paye")
                ? "paye"
                : statuts.some((s) => s === "paye" || s === "partiel")
                  ? "partiel"
                  : "attendu";

            return (
              <Link
                key={p}
                href={`/suivi/locataire/${encodeURIComponent(locataire.id)}?mois=${p}`}
                aria-label={`${labelPeriode(p)} — ${LIBELLE_STATUT[statut]}`}
                aria-current={p === periode ? "true" : undefined}
                className={cn(
                  "suivi-tap flex min-h-14 flex-col items-center justify-center rounded-xl border-2 text-xs font-semibold",
                  p === periode ? "border-foreground" : "border-transparent"
                )}
                style={{
                  backgroundColor:
                    statut === "attendu" ? "var(--secondary)" : couleurStatut(statut),
                  color: statut === "attendu" ? "var(--suivi-gris)" : "#ffffff",
                }}
              >
                <span>{labelMoisCourt(p)}</span>
                <span className="opacity-80">{p.slice(2, 4)}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <FeuilleRattachement
        contratId={contratARattacher}
        boxDisponibles={boxRattachables}
        onFermer={() => setContratARattacher(null)}
      />

      {contratEnSaisie && (
        <FeuilleEncaissement
          ligne={ligneDuContrat(
            contratEnSaisie,
            contrats.find((c) => c.id === contratEnSaisie)?.loyer_mensuel_eur ?? 0
          )}
          periode={periode}
          onFermer={() => setContratEnSaisie(null)}
          onValider={(saisie) => {
            const contrat = contrats.find((c) => c.id === contratEnSaisie);
            if (contrat) {
              enregistreDetail(ligneDuContrat(contrat.id, contrat.loyer_mensuel_eur), saisie);
            }
          }}
        />
      )}
    </div>
  );
}

/** Copie dans le presse-papier, avec repli sur les navigateurs sans API. */
function BoutonCopier({ valeur, libelle }: { valeur: string; libelle: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(valeur);
          } else {
            // Safari hors contexte sécurisé : pas de presse-papier moderne.
            throw new Error("presse-papier indisponible");
          }
          vibre();
          toast.success(`${valeur} copié.`);
        } catch {
          toast.error("Copie impossible — sélectionnez le numéro à la main.");
        }
      }}
      className="suivi-tap mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold text-foreground active:bg-secondary"
    >
      <Copy className="size-4" aria-hidden />
      {libelle}
    </button>
  );
}

function BoutonContact({
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
      <span className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-sm text-[var(--suivi-gris)] opacity-60">
        {icone}
        {libelle}
      </span>
    );
  }

  return (
    <a
      href={href}
      className="suivi-tap flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-card text-sm font-semibold text-primary active:bg-secondary"
    >
      {icone}
      {libelle}
    </a>
  );
}
