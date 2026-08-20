import Link from "next/link";
import { ChevronRight, Inbox, LogOut, Scale, TrendingUp, Warehouse } from "lucide-react";

import { BlocEnvoiFactures } from "@/components/suivi/bloc-envoi-factures";
import { Logo } from "@/components/suivi/logo";
import { BoutonFacturation } from "@/components/suivi/bouton-facturation";
import { aEnvoyer, resumeEnvoi } from "@/lib/suivi/mail";
import { labelPeriode, isPeriode, periodeCourante } from "@/lib/suivi/period";
import {
  destinatairesFactures,
  estModeDemo,
  parametresMail,
  statsTableauDeBord,
} from "@/lib/suivi/repository";

export const dynamic = "force-dynamic";

/**
 * Tableau de bord.
 *
 * Une seule chose est mise en avant — l'encaissement du mois — et tout le
 * reste vient après, à taille égale entre soi. La version précédente donnait
 * la même prééminence à cinq chiffres de natures différentes, chacun en gras
 * et dans une taille choisie au coup par coup : l'œil ne savait pas par où
 * commencer. La hiérarchie se fait ici par la taille et la couleur, jamais
 * par le gras, et toutes les tailles viennent de l'échelle de `suivi.css`.
 */
export default async function TableauDeBordPage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>;
}) {
  const { mois } = await searchParams;
  const periode = mois && isPeriode(mois) ? mois : periodeCourante();

  const [stats, parametres, destinataires] = await Promise.all([
    statsTableauDeBord(periode),
    parametresMail(),
    destinatairesFactures(periode),
  ]);

  const modeDemo = estModeDemo();
  const attendu = stats.encaisse + stats.reste;
  const progression = attendu === 0 ? 0 : Math.round((stats.encaisse / attendu) * 100);

  // Cash-flow : ce qui rentre moins ce qui sort. Le cumul annuel se compare au
  // même mois des deux côtés — `chargesCumulees` s'arrête au mois affiché,
  // comme `caAnnuel`.
  const solde = stats.encaisse - stats.chargesDuMois;
  const soldeAnnuel = stats.caAnnuel - stats.chargesCumulees;

  // L'aperçu se calcule sur le premier destinataire réel : le message montré
  // avant l'envoi est alors exactement celui qui partira.
  const premier = aEnvoyer(destinataires)[0] ?? null;

  return (
    <div className="mx-auto max-w-2xl">
      {/* La marque n'apparaît que sur l'écran d'accueil de l'app : répétée en
          tête de chaque écran, elle deviendrait du papier peint. */}
      <header className="suivi-safe-top sticky top-0 z-30 flex items-center gap-3 bg-[var(--background)]/90 px-5 pb-3 pt-4 backdrop-blur-md">
        <Logo taille={38} />
        <div className="min-w-0">
          <p className="t-etiquette">{labelPeriode(periode)}</p>
          <h1 className="t-titre mt-0.5">Tableau de bord</h1>
        </div>
      </header>

      {modeDemo && (
        <p className="t-meta mx-5 mb-3 rounded-lg bg-[var(--suivi-orange)]/10 px-3 py-2 text-[var(--suivi-orange)]">
          Mode démo — seuls les chiffres d&apos;encaissement sont réels.
        </p>
      )}

      <div className="suivi-scroll-simple space-y-3 px-5 pb-5">
        {/* Le chiffre que l'exploitant vient chercher. Seul en haut, seul de
            sa taille : c'est ce qui fait qu'on le voit sans le chercher. */}
        <Link
          href={`/suivi?mois=${periode}`}
          className="suivi-tap suivi-carte block p-5 active:bg-[var(--secondary)]/40"
        >
          <div className="flex items-center justify-between">
            <span className="t-etiquette">Encaissé ce mois</span>
            <span className="t-meta t-nombre">
              {stats.contratsRegles} / {stats.contratsTotal}
            </span>
          </div>

          {/* Vert quand quelque chose est rentré ; neutre à zéro — un zéro
              vert annoncerait une bonne nouvelle qui n'en est pas une. */}
          <p
            className="t-hero mt-2"
            style={{ color: stats.encaisse > 0 ? "var(--suivi-vert)" : "var(--foreground)" }}
          >
            {stats.encaisse.toLocaleString("fr-FR")} €
          </p>

          <div
            className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[var(--suivi-trait)]"
            role="progressbar"
            aria-valuenow={progression}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Part du mois encaissée"
          >
            <div
              className="h-full rounded-full bg-[var(--suivi-vert)] transition-[width] duration-500"
              style={{ width: `${progression}%` }}
            />
          </div>

          <p className="t-meta mt-2">
            Reste{" "}
            <span className="t-nombre font-medium text-[var(--suivi-orange)]">
              {stats.reste.toLocaleString("fr-FR")} €
            </span>{" "}
            à encaisser
          </p>
        </Link>

        {/* Les indicateurs, tous de même rang, donc tous de même taille. */}
        <div className="grid grid-cols-2 gap-3">
          <Tuile
            icone={<TrendingUp className="size-4" aria-hidden />}
            libelle={`Encaissé ${stats.annee}`}
            valeur={`${stats.caAnnuel.toLocaleString("fr-FR")} €`}
            detail="depuis le 1er janvier"
          />
          <Tuile
            href="/suivi/box"
            icone={<Warehouse className="size-4" aria-hidden />}
            libelle="Occupation"
            valeur={`${stats.tauxOccupation} %`}
            detail={`${stats.boxLoues} loués · ${stats.boxLibres} libres`}
          />
          <Tuile
            icone={<LogOut className="size-4" aria-hidden />}
            libelle="Préavis"
            valeur={String(stats.contratsEnPreavis)}
            detail={stats.contratsEnPreavis > 0 ? "box à relouer" : "aucun départ"}
            alerte={stats.contratsEnPreavis > 0}
          />
          <Tuile
            href="/suivi/demandes"
            icone={<Inbox className="size-4" aria-hidden />}
            libelle="Demandes"
            valeur={String(stats.demandesNouvelles)}
            detail={stats.demandesNouvelles > 0 ? "à rappeler" : "aucune nouvelle"}
            alerte={stats.demandesNouvelles > 0}
          />
        </div>

        {/* Ce qui reste une fois les charges payées. Placé juste après les
            recettes, parce que c'est la même question poursuivie jusqu'au
            bout : ce qui rentre, puis ce qu'il en reste. */}
        <Link
          href={`/suivi/charges?mois=${periode}`}
          className="suivi-tap suivi-carte block p-4 active:bg-[var(--secondary)]/40"
        >
          <div className="flex items-center gap-1.5 text-[var(--suivi-gris)]">
            <Scale className="size-4" aria-hidden />
            <span className="t-etiquette">Résultat du mois</span>
            <ChevronRight className="ml-auto size-3.5 opacity-50" aria-hidden />
          </div>

          <p
            className="t-chiffre mt-1.5"
            style={{ color: solde >= 0 ? "var(--suivi-vert)" : "var(--destructive)" }}
          >
            {solde >= 0 ? "+" : "−"}
            {Math.abs(solde).toLocaleString("fr-FR")} €
          </p>

          <p className="t-meta mt-0.5">
            {stats.chargesDuMois > 0 ? (
              <>
                après{" "}
                <span className="t-nombre">
                  {stats.chargesDuMois.toLocaleString("fr-FR")} €
                </span>{" "}
                de charges · {soldeAnnuel >= 0 ? "+" : "−"}
                <span className="t-nombre">
                  {Math.abs(soldeAnnuel).toLocaleString("fr-FR")} €
                </span>{" "}
                depuis janvier
              </>
            ) : (
              "aucune charge saisie — appuyer pour les renseigner"
            )}
          </p>
        </Link>

        {stats.impayesMontant > 0 && (
          <div className="suivi-carte flex items-baseline justify-between p-4">
            <span className="t-etiquette">Impayés back-office</span>
            <span className="t-nombre t-corps font-medium text-[var(--suivi-orange)]">
              {stats.impayesMontant.toLocaleString("fr-FR")} €
              <span className="t-meta ml-2">
                {`${stats.impayesClients} client${stats.impayesClients > 1 ? "s" : ""}`}
              </span>
            </span>
          </div>
        )}

        {/* Les actions du mois, séparées des chiffres : on regarde, puis on
            agit — l'écran suit cet ordre. */}
        <BoutonFacturation
          periode={periode}
          aFacturer={stats.aFacturer}
          dejaFacturees={stats.dejaFacturees}
          montant={stats.montantAFacturer}
        />

        {/* Envoi groupé — la seule action qui sorte du site. Masquée en démo :
            sans base, il n'y a ni paramétrage à régler ni destinataire. */}
        {!modeDemo && (
          <BlocEnvoiFactures
            periode={periode}
            parametres={parametres}
            resume={resumeEnvoi(destinataires)}
            apercu={premier ? { nom: premier.nom, box: premier.box, loyer: premier.loyer } : null}
          />
        )}

        <p className="t-meta pt-1 text-center">
          Contrats, documents et rapports restent dans le back-office.
        </p>
      </div>
    </div>
  );
}

/**
 * Un indicateur. Toutes les tuiles ont la même taille de chiffre : c'est ce
 * qui les rend comparables d'un coup d'œil. L'alerte se marque en couleur,
 * pas en taille ni en gras.
 */
function Tuile({
  icone,
  libelle,
  valeur,
  detail,
  alerte,
  href,
}: {
  icone: React.ReactNode;
  libelle: string;
  valeur: string;
  detail: string;
  alerte?: boolean;
  href?: string;
}) {
  const contenu = (
    <>
      <div className="flex items-center gap-1.5 text-[var(--suivi-gris)]">
        {icone}
        <span className="t-etiquette">{libelle}</span>
        {href && <ChevronRight className="ml-auto size-3.5 opacity-50" aria-hidden />}
      </div>
      <p
        className="t-chiffre mt-1.5"
        style={{ color: alerte ? "var(--suivi-orange)" : "var(--foreground)" }}
      >
        {valeur}
      </p>
      <p className="t-meta mt-0.5">{detail}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="suivi-tap suivi-carte block p-4 active:bg-[var(--secondary)]/40">
        {contenu}
      </Link>
    );
  }

  return <div className="suivi-carte p-4">{contenu}</div>;
}
