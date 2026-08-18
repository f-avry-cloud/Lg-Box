"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { vibre } from "@/components/suivi/bouton-encaissement";
import {
  FeuilleEncaissement,
  type SaisieEncaissement,
} from "@/components/suivi/feuille-encaissement";
import { BlocContact } from "@/components/suivi/bloc-contact";
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
  facture: "Facturé",
  partiel: "Partiellement réglé",
  retard: "En retard",
  attendu: "En attente",
};

function couleurStatut(statut: ReglementStatut): string {
  if (statut === "paye") return "var(--suivi-vert)";
  if (statut === "partiel" || statut === "retard") return "var(--suivi-orange)";
  // Facturé : réclamé mais pas encore encaissé — ni vert, ni alarmant.
  if (statut === "facture") return "var(--primary)";
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
            date_facturation: null,
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
            date_facturation: null,
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
        <span className="truncate t-corps font-medium">{labelPeriode(periode)}</span>
      </header>

      {/* En-tête locataire */}
      <section className="flex items-center gap-3 px-4 py-4">
        <span
          aria-hidden
          className="flex size-14 shrink-0 items-center justify-center rounded-full t-titre text-white"
          style={{ backgroundColor: couleurPastille(locataire.nom) }}
        >
          {initiales(locataire.nom)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="t-titre truncate">{locataire.nom}</h1>
          {locataire.societe && (
            <p className="truncate t-meta">{locataire.societe}</p>
          )}
          <span
            className="t-etiquette mt-1 inline-block rounded-full px-2 py-1 text-white"
            style={{ backgroundColor: couleurStatut(statutGlobal) }}
          >
            {LIBELLE_STATUT[statutGlobal]}
          </span>
        </div>
      </section>

      {/* Bloc box */}
      <section className="px-4">
        <h2 className="mb-2 t-etiquette">
          {plusieursBox ? `Box (${contrats.length})` : "Box"}
        </h2>
        <div className="space-y-2">
          {contrats.map((contrat) => {
            const anciennete = libelleAnciennete(contrat.date_debut);
            return (
              <div key={contrat.id} className="suivi-carte p-3">
                <p className="t-corps font-bold text-foreground">
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
                    className="mt-3 h-12 w-full t-corps"
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
        <h2 className="mb-2 t-etiquette">
          Contacter
        </h2>
        {locataire.telephone || locataire.email ? (
          /*
            Le bloc partagé plutôt qu'une seconde série de boutons : appeler
            depuis la fiche et appeler depuis un box doivent passer par le même
            chemin, donc par le même raccourci Onoff. La copie qui vivait ici
            avait déjà divergé du bloc commun.
          */
          <BlocContact telephone={locataire.telephone} email={locataire.email} />
        ) : (
          <p className="rounded-xl border border-dashed border-border p-3 t-meta">
            Aucune coordonnée renseignée.
          </p>
        )}
      </section>

      {/* Bloc règlement du mois */}
      <section className="px-4 pt-5">
        <h2 className="mb-2 t-etiquette">
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
              <div key={contrat.id} className="suivi-carte p-3">
                {plusieursBox && (
                  <p className="mb-1 text-sm font-medium text-[var(--suivi-gris)]">
                    {contrat.box ? `Box ${contrat.box.numero}` : BOX_A_IDENTIFIER}
                  </p>
                )}
                <p className="t-titre" style={{ color: couleurStatut(statut) }}>
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
                  <p className="mt-1 t-meta">{reglement.note}</p>
                )}

                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    type="button"
                    variant={paye ? "outline" : "success"}
                    className="h-14 w-full t-corps"
                    onClick={() => bascule(contrat.id)}
                  >
                    {paye ? "Annuler le règlement" : "Marquer comme réglé"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-12 w-full t-corps"
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
        <h2 className="mb-2 t-etiquette">
          Observations
        </h2>
        <textarea
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          onBlur={surPerteFocusObservations}
          rows={4}
          placeholder="Relances, promesses de paiement, changement de RIB…"
          className="w-full rounded-xl border border-input bg-card p-3 t-corps leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="mt-1 t-meta">
          {horodatage
            ? `Enregistré le ${formatDate(horodatage)}`
            : "Enregistrement automatique en quittant le champ."}
        </p>
      </section>

      {/* Historique 12 mois */}
      <section className="px-4 pt-5">
        <h2 className="mb-2 t-etiquette">
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
        dateDebutContrat={contrats.find((c) => c.id === contratARattacher)?.date_debut ?? null}
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
