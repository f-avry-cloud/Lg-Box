"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Repeat, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { vibre } from "@/components/suivi/bouton-encaissement";
import { FeuilleModale } from "@/components/suivi/feuille-modale";
import { Button } from "@/components/ui/button";
import {
  creeCharge,
  modifieCharge,
  supprimeCharge,
  type SaisieCharge,
} from "@/lib/actions/suivi-charges";
import {
  CATEGORIES_CHARGE,
  LIBELLE_CATEGORIE,
  chargesCumulees,
  chargesDuMois,
  parCategorie,
  cashFlow,
  totalCharges,
  trieCharges,
  type CategorieCharge,
  type Charge,
} from "@/lib/suivi/charges";
import { dePeriode, labelPeriode, periodeCourante, shiftPeriode } from "@/lib/suivi/period";
import { cn } from "@/lib/utils";

function saisieVide(periode: string): SaisieCharge {
  return {
    libelle: "",
    montant: 0,
    categorie: "autre",
    recurrente: true,
    periodeDebut: periode,
    periodeFin: null,
  };
}

/**
 * Les charges du centre, et le résultat qu'elles produisent.
 *
 * L'écran est construit autour d'un seul chiffre — le solde du mois — parce
 * que c'est la question qui amène ici : est-ce que le mois rapporte, et
 * combien. La liste des charges vient après, comme la justification de ce
 * chiffre.
 */
export function ListeCharges({
  charges,
  periode,
  encaisseDuMois,
  encaisseCumule,
  modifiable,
}: {
  charges: Charge[];
  periode: string;
  encaisseDuMois: number;
  encaisseCumule: number;
  modifiable: boolean;
}) {
  const router = useRouter();
  const [enCours, demarreTransition] = useTransition();
  const [saisie, setSaisie] = useState<SaisieCharge | null>(null);
  const [enEdition, setEnEdition] = useState<string | null>(null);
  const [confirmeSuppression, setConfirmeSuppression] = useState(false);

  const duMois = useMemo(() => trieCharges(chargesDuMois(charges, periode)), [charges, periode]);
  const totalMois = totalCharges(duMois);
  const totalCumule = chargesCumulees(charges, periode);

  const mois = cashFlow(encaisseDuMois, totalMois);
  const annee = cashFlow(encaisseCumule, totalCumule);
  const postes = parCategorie(duMois);

  // Raccourci de saisie : une charge récurrente court le plus souvent depuis
  // le début de l'exercice affiché, et c'est le seul début qui rende le cumul
  // « depuis janvier » juste.
  const janvier = `${periode.slice(0, 4)}-01`;

  const ouvre = (charge: Charge | null) => {
    if (charge) {
      setEnEdition(charge.id);
      setSaisie({
        libelle: charge.libelle,
        montant: charge.montant_eur,
        categorie: charge.categorie,
        recurrente: charge.recurrente,
        periodeDebut: charge.periode_debut,
        periodeFin: charge.periode_fin,
      });
    } else {
      setEnEdition(null);
      setSaisie(saisieVide(periode));
    }
    setConfirmeSuppression(false);
  };

  const ferme = () => {
    setSaisie(null);
    setEnEdition(null);
    setConfirmeSuppression(false);
  };

  const enregistre = () => {
    if (!saisie) return;
    demarreTransition(async () => {
      const resultatAction = enEdition
        ? await modifieCharge(enEdition, saisie)
        : await creeCharge(saisie);

      if (!resultatAction.success) {
        vibre(60);
        toast.error(resultatAction.error ?? "Enregistrement impossible.");
        return;
      }
      vibre();
      toast.success(enEdition ? "Charge modifiée." : "Charge ajoutée.");
      ferme();
      router.refresh();
    });
  };

  const supprime = () => {
    if (!enEdition) return;
    demarreTransition(async () => {
      const resultatAction = await supprimeCharge(enEdition);
      if (!resultatAction.success) {
        vibre(60);
        toast.error(resultatAction.error ?? "Suppression impossible.");
        return;
      }
      vibre();
      toast.success("Charge supprimée.");
      ferme();
      router.refresh();
    });
  };

  return (
    <>
      <header className="suivi-safe-top sticky top-0 z-30 bg-[var(--background)]/90 px-5 pb-3 pt-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Link
            href={`/suivi/tableau-de-bord?mois=${periode}`}
            aria-label="Retour au tableau de bord"
            className="suivi-tap -ml-2 flex size-9 items-center justify-center rounded-full active:bg-secondary"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0">
            <p className="t-etiquette">{labelPeriode(periode)}</p>
            <h1 className="t-titre mt-0.5">Charges</h1>
          </div>
        </div>
      </header>

      <div className="suivi-scroll-simple space-y-3 px-5 pb-5">
        {/* Le solde du mois : la raison d'être de l'écran. « Cash-flow » et
            non « résultat » : les entrées sont ce qui est pointé au carnet, pas
            ce qui est facturé, et rien ici n'amortit quoi que ce soit. */}
        <section className="suivi-carte p-5">
          <span className="t-etiquette">Cash-flow {dePeriode(periode)}</span>
          <p
            className="t-hero mt-2"
            style={{
              color: mois.solde >= 0 ? "var(--suivi-vert)" : "var(--destructive)",
            }}
          >
            {mois.solde >= 0 ? "+" : "−"}
            {Math.abs(mois.solde).toLocaleString("fr-FR")} €
          </p>
          <dl className="mt-3 space-y-1">
            <Ligne libelle="Encaissé" montant={mois.entrees} />
            <Ligne libelle="Charges payées" montant={-mois.sorties} />
          </dl>
        </section>

        {/* Le cumul de l'exercice, arrêté au même mois que les encaissements. */}
        <section className="suivi-carte p-4">
          <span className="t-etiquette">Cash-flow cumulé depuis janvier</span>
          <p
            className="t-chiffre mt-1.5"
            style={{ color: annee.solde >= 0 ? "var(--suivi-vert)" : "var(--destructive)" }}
          >
            {annee.solde >= 0 ? "+" : "−"}
            {Math.abs(annee.solde).toLocaleString("fr-FR")} €
          </p>
          <dl className="mt-2 space-y-1">
            <Ligne libelle="Encaissé" montant={annee.entrees} />
            <Ligne libelle="Charges payées" montant={-annee.sorties} />
          </dl>
          <p className="t-meta mt-2">
            Encaissements et charges s&apos;arrêtent au même mois : comparer une année entière
            de charges à des encaissements partiels donnerait un chiffre faux.
          </p>
          {/* Dit une fois, en bas de l'écran : ce n'est pas un résultat
              comptable, et personne ne doit le prendre pour tel. */}
          <p className="t-meta mt-2">
            Trésorerie, pas résultat comptable : on compte l&apos;argent entré et sorti, non
            les loyers facturés ni les amortissements.
          </p>
        </section>

        {postes.length > 0 && (
          <section className="suivi-carte p-4">
            <span className="t-etiquette">Répartition du mois</span>
            <div className="mt-2 space-y-2">
              {postes.map((poste) => (
                <div key={poste.categorie}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="t-corps">
                      {LIBELLE_CATEGORIE[poste.categorie as CategorieCharge] ?? poste.categorie}
                    </span>
                    <span className="t-corps t-nombre font-medium">
                      {poste.montant.toLocaleString("fr-FR")} €
                    </span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--suivi-trait)]">
                    <div
                      className="h-full rounded-full bg-[var(--suivi-gris)]"
                      style={{
                        width: `${totalMois === 0 ? 0 : (poste.montant / totalMois) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="flex items-baseline justify-between pt-1">
          <span className="t-etiquette">{`Charges ${dePeriode(periode)}`}</span>
          <span className="t-meta t-nombre">{totalMois.toLocaleString("fr-FR")} €</span>
        </div>

        {duMois.length === 0 && (
          <p className="t-corps py-8 text-center text-[var(--suivi-gris-clair)]">
            Aucune charge saisie pour ce mois.
          </p>
        )}

        <div className="space-y-2">
          {duMois.map((charge) => (
            <button
              key={charge.id}
              type="button"
              disabled={!modifiable}
              onClick={() => ouvre(charge)}
              className="suivi-tap suivi-carte flex w-full items-center gap-3 p-3 text-left active:bg-[var(--secondary)]/40 disabled:active:bg-card"
            >
              <span className="min-w-0 flex-1">
                <span className="t-corps block truncate font-medium">{charge.libelle}</span>
                <span className="t-meta flex items-center gap-1.5">
                  {charge.recurrente && <Repeat className="size-3" aria-label="Récurrente" />}
                  {LIBELLE_CATEGORIE[charge.categorie as CategorieCharge] ?? charge.categorie}
                  {charge.recurrente && charge.periode_fin && (
                    <span>{` · jusqu'à ${labelPeriode(charge.periode_fin).toLocaleLowerCase("fr")}`}</span>
                  )}
                  {!charge.recurrente && <span>· ponctuelle</span>}
                </span>
              </span>
              <span className="t-corps t-nombre shrink-0 font-medium">
                {charge.montant_eur.toLocaleString("fr-FR")} €
              </span>
            </button>
          ))}
        </div>

        {modifiable && (
          <button
            type="button"
            onClick={() => ouvre(null)}
            className="suivi-tap t-corps mt-1 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--input)] font-medium active:bg-secondary"
          >
            <Plus className="size-4" aria-hidden />
            Ajouter une charge
          </button>
        )}

        {!modifiable && (
          <p className="t-meta text-center">Saisie indisponible en mode démo.</p>
        )}
      </div>

      {saisie && (
        <FeuilleModale
          ouverte
          titre={enEdition ? "Modifier la charge" : "Nouvelle charge"}
          onFermer={ferme}
        >
          <label className="mb-3 block">
            <span className="t-etiquette mb-1 block">Libellé</span>
            <input
              type="text"
              value={saisie.libelle}
              onChange={(e) => setSaisie({ ...saisie, libelle: e.target.value })}
              placeholder="Loyer du terrain, assurance…"
              className="t-corps h-12 w-full rounded-xl border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <label className="mb-3 block">
            {/* « Mensuel » sur une récurrente : la somme se saisit par mois,
                pas pour l'année. Sur une ponctuelle, la précision serait fausse. */}
            <span className="t-etiquette mb-1 block">
              {saisie.recurrente ? "Montant mensuel (€)" : "Montant (€)"}
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={saisie.montant === 0 ? "" : saisie.montant}
              onChange={(e) => setSaisie({ ...saisie, montant: Number(e.target.value) })}
              className="t-corps h-12 w-full rounded-xl border border-input bg-background px-3 tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <span className="t-etiquette mb-1 block">Catégorie</span>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {CATEGORIES_CHARGE.map((categorie) => (
              <button
                key={categorie}
                type="button"
                aria-pressed={saisie.categorie === categorie}
                onClick={() => setSaisie({ ...saisie, categorie })}
                className={cn(
                  "suivi-tap min-h-11 rounded-xl border px-1 text-xs font-medium",
                  saisie.categorie === categorie
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-[var(--suivi-trait)] bg-background active:bg-secondary"
                )}
              >
                {LIBELLE_CATEGORIE[categorie]}
              </button>
            ))}
          </div>

          <span className="t-etiquette mb-1 block">Nature</span>
          <div className="mb-3 flex gap-2">
            {(
              [
                [true, "Tous les mois"],
                [false, "Une seule fois"],
              ] as const
            ).map(([valeur, libelle]) => (
              <button
                key={String(valeur)}
                type="button"
                aria-pressed={saisie.recurrente === valeur}
                onClick={() =>
                  setSaisie({
                    ...saisie,
                    recurrente: valeur,
                    // Une ponctuelle n'a pas d'échéance à choisir.
                    periodeFin: valeur ? saisie.periodeFin : null,
                  })
                }
                className={cn(
                  "suivi-tap t-corps min-h-11 flex-1 rounded-xl border font-medium",
                  saisie.recurrente === valeur
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-[var(--suivi-trait)] bg-background active:bg-secondary"
                )}
              >
                {libelle}
              </button>
            ))}
          </div>

          {/* Un sélecteur de mois plutôt que trois pastilles M-1/M/M+1 : une
              charge récurrente court souvent depuis le début de l'exercice, et
              la borner au mois courant fausserait le cumul depuis janvier.
              `input type="month"` rend exactement une chaîne « AAAA-MM », soit
              la forme des périodes, et ouvre le sélecteur natif sur iPhone. */}
          <span className="t-etiquette mb-1 block">
            {saisie.recurrente ? "À partir de" : "Mois concerné"}
          </span>
          <input
            type="month"
            value={saisie.periodeDebut}
            onChange={(e) =>
              e.target.value && setSaisie({ ...saisie, periodeDebut: e.target.value })
            }
            className="t-corps mb-2 h-12 w-full rounded-xl border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="mb-3 flex gap-2">
            {[-1, 0].map((decalage) => {
              const cible = shiftPeriode(periodeCourante(), decalage);
              return (
                <button
                  key={cible}
                  type="button"
                  aria-pressed={saisie.periodeDebut === cible}
                  onClick={() => setSaisie({ ...saisie, periodeDebut: cible })}
                  className={cn(
                    "suivi-tap min-h-10 flex-1 rounded-xl border text-xs font-medium",
                    saisie.periodeDebut === cible
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-[var(--suivi-trait)] bg-background active:bg-secondary"
                  )}
                >
                  {labelPeriode(cible)}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={saisie.periodeDebut === janvier}
              onClick={() =>
                setSaisie({ ...saisie, periodeDebut: janvier })
              }
              className={cn(
                "suivi-tap min-h-10 flex-1 rounded-xl border text-xs font-medium",
                saisie.periodeDebut === janvier
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-[var(--suivi-trait)] bg-background active:bg-secondary"
              )}
            >
              {labelPeriode(janvier)}
            </button>
          </div>

          {/* Arrêter une charge récurrente sans effacer les mois qu'elle a
              déjà pesés : c'est une fin, pas une suppression. */}
          {saisie.recurrente && (
            <>
              <span className="t-etiquette mb-1 block">Fin (facultatif)</span>
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  aria-pressed={saisie.periodeFin === null}
                  onClick={() => setSaisie({ ...saisie, periodeFin: null })}
                  className={cn(
                    "suivi-tap t-corps min-h-11 flex-1 rounded-xl border font-medium",
                    saisie.periodeFin === null
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-[var(--suivi-trait)] bg-background active:bg-secondary"
                  )}
                >
                  Sans fin
                </button>
                <button
                  type="button"
                  aria-pressed={saisie.periodeFin !== null}
                  onClick={() =>
                    setSaisie({
                      ...saisie,
                      periodeFin: periode < saisie.periodeDebut ? saisie.periodeDebut : periode,
                    })
                  }
                  className={cn(
                    "suivi-tap t-corps min-h-11 flex-1 rounded-xl border font-medium",
                    saisie.periodeFin !== null
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-[var(--suivi-trait)] bg-background active:bg-secondary"
                  )}
                >
                  Arrêter
                </button>
              </div>

              {saisie.periodeFin !== null && (
                <label className="mb-4 block">
                  <span className="t-etiquette mb-1 block">Dernier mois dû</span>
                  <input
                    type="month"
                    value={saisie.periodeFin}
                    min={saisie.periodeDebut}
                    onChange={(e) =>
                      e.target.value && setSaisie({ ...saisie, periodeFin: e.target.value })
                    }
                    className="t-corps h-12 w-full rounded-xl border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
              )}
            </>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-12 flex-1" onClick={ferme}>
              Annuler
            </Button>
            <Button
              type="button"
              className="h-12 flex-1"
              disabled={enCours || saisie.libelle.trim() === "" || !(saisie.montant > 0)}
              onClick={enregistre}
            >
              Enregistrer
            </Button>
          </div>

          {enEdition &&
            (confirmeSuppression ? (
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 flex-1"
                  onClick={() => setConfirmeSuppression(false)}
                >
                  Non, garder
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-12 flex-1"
                  disabled={enCours}
                  onClick={supprime}
                >
                  Supprimer
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmeSuppression(true)}
                className="suivi-tap t-meta mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 text-destructive"
              >
                <Trash2 className="size-3.5" aria-hidden />
                Supprimer — efface aussi les mois passés
              </button>
            ))}
        </FeuilleModale>
      )}
    </>
  );
}

function Ligne({ libelle, montant }: { libelle: string; montant: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="t-meta">{libelle}</dt>
      <dd className="t-corps t-nombre">
        {montant < 0 ? "−" : ""}
        {Math.abs(montant).toLocaleString("fr-FR")} €
      </dd>
    </div>
  );
}
