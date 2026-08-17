import Link from "next/link";
import { AlertTriangle, Inbox, LogOut, TrendingUp, Warehouse } from "lucide-react";

import { BoutonFacturation } from "@/components/suivi/bouton-facturation";

import { labelPeriode, isPeriode, periodeCourante } from "@/lib/suivi/period";
import { estModeDemo, statsTableauDeBord } from "@/lib/suivi/repository";

export const dynamic = "force-dynamic";

export default async function TableauDeBordPage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>;
}) {
  const { mois } = await searchParams;
  const periode = mois && isPeriode(mois) ? mois : periodeCourante();

  const stats = await statsTableauDeBord(periode);
  const modeDemo = estModeDemo();
  const attendu = stats.encaisse + stats.reste;
  const progression = attendu === 0 ? 0 : Math.round((stats.encaisse / attendu) * 100);

  return (
    <div className="mx-auto max-w-2xl">
      <header className="suivi-safe-top sticky top-0 z-30 border-b border-border bg-background/95 px-4 pb-2 pt-3 backdrop-blur">
        <h1 className="text-lg font-semibold">Tableau de bord</h1>
        <p className="text-sm text-[var(--suivi-gris)]">{labelPeriode(periode)}</p>
      </header>

      {modeDemo && (
        <p className="border-b border-[var(--suivi-orange)]/30 bg-[var(--suivi-orange)]/10 px-4 py-2 text-sm font-medium text-[var(--suivi-orange)]">
          Mode démo — seuls les chiffres d&apos;encaissement sont réels.
        </p>
      )}

      <div className="suivi-scroll-simple space-y-3 p-3">
        {/* Encaissement du mois : le chiffre que l'exploitant vient chercher. */}
        <Link
          href={`/suivi?mois=${periode}`}
          className="suivi-tap block rounded-2xl border border-border bg-card p-4 active:bg-secondary/60"
        >
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold uppercase tracking-wide text-[var(--suivi-gris)]">
              Encaissé ce mois
            </span>
            <span className="text-sm tabular-nums text-[var(--suivi-gris)]">
              {stats.contratsRegles} / {stats.contratsTotal}
            </span>
          </div>
          <p className="mt-1 text-3xl font-bold tabular-nums text-[var(--suivi-vert)]">
            {stats.encaisse.toLocaleString("fr-FR")} €
          </p>
          <div
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-valuenow={progression}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Part du mois encaissée"
          >
            <div
              className="h-full rounded-full bg-[var(--suivi-vert)]"
              style={{ width: `${progression}%` }}
            />
          </div>
          <p className="mt-2 text-base font-semibold tabular-nums text-[var(--suivi-orange)]">
            Reste {stats.reste.toLocaleString("fr-FR")} € à encaisser
          </p>
        </Link>

        {/* Chiffre d'affaires encaissé depuis le 1er janvier : le cumul de
            l'exercice, à côté du mois qui, seul, ne dit pas où l'on en est. */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-[var(--suivi-gris)]">
            <TrendingUp className="size-5" aria-hidden />
            <span className="text-sm font-semibold uppercase tracking-wide">
              {`Encaissé depuis le 1er janvier ${stats.annee}`}
            </span>
          </div>
          <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">
            {stats.caAnnuel.toLocaleString("fr-FR")} €
          </p>
          <p className="mt-0.5 text-sm text-[var(--suivi-gris)]">
            {`Cumul des règlements pointés sur l'année ${stats.annee}`}
          </p>
        </div>

        {/* Facturation groupée du mois */}
        <BoutonFacturation
          periode={periode}
          aFacturer={stats.aFacturer}
          dejaFacturees={stats.dejaFacturees}
          montant={stats.montantAFacturer}
        />

        {/* Occupation */}
        <Link
          href="/suivi/box"
          className="suivi-tap block rounded-2xl border border-border bg-card p-4 active:bg-secondary/60"
        >
          <div className="flex items-center gap-2">
            <Warehouse className="size-5 text-primary" aria-hidden />
            <span className="text-sm font-semibold uppercase tracking-wide text-[var(--suivi-gris)]">
              Occupation
            </span>
          </div>
          <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">
            {stats.tauxOccupation} %
          </p>
          <p className="mt-1 text-base text-[var(--suivi-gris)]">
            <strong className="text-foreground">{stats.boxLoues}</strong> loués ·{" "}
            <strong className="text-foreground">{stats.boxLibres}</strong> libres · {stats.boxTotal}{" "}
            box
          </p>
        </Link>

        {/* Points d'attention */}
        <div className="grid grid-cols-1 gap-3">
          <Tuile
            icone={<AlertTriangle className="size-5" aria-hidden />}
            libelle="Impayés"
            valeur={`${stats.impayesMontant.toLocaleString("fr-FR")} €`}
            detail={
              stats.impayesClients > 0
                ? `${stats.impayesClients} client${stats.impayesClients > 1 ? "s" : ""} concerné${
                    stats.impayesClients > 1 ? "s" : ""
                  }`
                : "Aucune facture en attente"
            }
            alerte={stats.impayesMontant > 0}
          />

          <Tuile
            icone={<LogOut className="size-5" aria-hidden />}
            libelle="Contrats en préavis"
            valeur={String(stats.contratsEnPreavis)}
            detail={
              stats.contratsEnPreavis > 0
                ? "Box à relouer prochainement"
                : "Aucun départ annoncé"
            }
            alerte={stats.contratsEnPreavis > 0}
          />

          <Link href="/suivi/demandes" className="suivi-tap block active:opacity-80">
            <Tuile
              icone={<Inbox className="size-5" aria-hidden />}
              libelle="Demandes de réservation"
              valeur={String(stats.demandesNouvelles)}
              detail={
                stats.demandesNouvelles > 0
                  ? "À rappeler — toucher pour ouvrir"
                  : "Aucune nouvelle demande"
              }
              alerte={stats.demandesNouvelles > 0}
            />
          </Link>
        </div>

        <p className="px-1 pt-1 text-center text-sm text-[var(--suivi-gris)]">
          Contrats, documents et rapports restent dans le back-office.
        </p>
      </div>
    </div>
  );
}

function Tuile({
  icone,
  libelle,
  valeur,
  detail,
  alerte,
}: {
  icone: React.ReactNode;
  libelle: string;
  valeur: string;
  detail: string;
  alerte: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div
        className="flex items-center gap-2"
        style={{ color: alerte ? "var(--suivi-orange)" : "var(--suivi-gris)" }}
      >
        {icone}
        <span className="text-sm font-semibold uppercase tracking-wide">{libelle}</span>
      </div>
      <p
        className="mt-1 text-2xl font-bold tabular-nums"
        style={{ color: alerte ? "var(--suivi-orange)" : "var(--foreground)" }}
      >
        {valeur}
      </p>
      <p className="mt-0.5 text-sm text-[var(--suivi-gris)]">{detail}</p>
    </div>
  );
}
