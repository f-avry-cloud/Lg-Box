"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Search, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { BlocContact } from "@/components/suivi/bloc-contact";
import { vibre } from "@/components/suivi/bouton-encaissement";
import { FeuilleModale } from "@/components/suivi/feuille-modale";
import { Button } from "@/components/ui/button";
import {
  creeContratSansBox,
  creeLocataire,
  modifieLocataire,
  type SaisieLocataire,
} from "@/lib/actions/suivi-locataires";
import { creeLocataireAvecContrat } from "@/lib/actions/suivi";
import { formatDate } from "@/lib/format";
import { labelPeriode, periodeCourante, shiftPeriode } from "@/lib/suivi/period";
import {
  chercheLocataires,
  etatLocataire,
  filtreParEtat,
  type FiltreLocataires,
  type LocataireAnnuaire,
} from "@/lib/suivi/locataires";
import { couleurPastille, initiales } from "@/lib/suivi/totals";
import { cn } from "@/lib/utils";

const SAISIE_VIDE: SaisieLocataire = { nom: "", societe: null, telephone: null, email: null };

function saisieDepuis(locataire: LocataireAnnuaire): SaisieLocataire {
  return {
    nom: locataire.nom,
    societe: locataire.societe,
    telephone: locataire.telephone,
    email: locataire.email,
  };
}

/**
 * L'annuaire des locataires.
 *
 * Rien de neuf dans les données : le nom, le box et le loyer se lisaient déjà
 * depuis la liste du mois, la fiche d'un box ou le plan. Ce qui manquait,
 * c'était le chemin — pouvoir partir d'un nom quand c'est tout ce qu'on a en
 * tête, plutôt que de se rappeler dans quel box la personne se trouve.
 *
 * L'écran ne duplique donc pas la fiche : chaque ligne y mène. Il ne garde en
 * propre que ce qui doit se faire sans naviguer — chercher, appeler, corriger
 * un numéro.
 */
export function ListeLocataires({
  locataires,
  modifiable,
}: {
  locataires: LocataireAnnuaire[];
  modifiable: boolean;
}) {
  const router = useRouter();
  const [enCours, demarreTransition] = useTransition();
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<FiltreLocataires>("actifs");
  const [ouvert, setOuvert] = useState<string | null>(null);

  // `null` = feuille fermée ; `{ id: null }` = création ; `{ id }` = correction.
  const [saisie, setSaisie] = useState<{ id: string | null; valeurs: SaisieLocataire } | null>(
    null
  );

  // Contrat saisi en même temps que le locataire. Facultatif : on note souvent
  // quelqu'un avant de connaître son loyer, et l'exiger ferait perdre la fiche.
  const [loyer, setLoyer] = useState("");
  const [periodeEffet, setPeriodeEffet] = useState(periodeCourante());

  // Contrat donné après coup à un locataire qui n'en a pas.
  const [contratPour, setContratPour] = useState<LocataireAnnuaire | null>(null);

  const archives = useMemo(
    () => filtreParEtat(locataires, "archives").length,
    [locataires]
  );

  const visibles = useMemo(
    () => chercheLocataires(filtreParEtat(locataires, filtre), recherche),
    [locataires, filtre, recherche]
  );

  const locataire = locataires.find((l) => l.id === ouvert) ?? null;

  const champsContrat = { loyer, setLoyer, periodeEffet, setPeriodeEffet };

  const montant = Number(loyer);
  const loyerValide = loyer.trim() !== "" && Number.isFinite(montant) && montant > 0;

  const enregistre = () => {
    if (!saisie) return;
    demarreTransition(async () => {
      // Trois chemins, et c'est le loyer qui décide : corriger une fiche,
      // créer un locataire seul, ou le créer avec son contrat d'emblée.
      const resultat = saisie.id
        ? await modifieLocataire(saisie.id, saisie.valeurs)
        : loyerValide
          ? await creeLocataireAvecContrat({
              ...saisie.valeurs,
              loyer: montant,
              periodeEffet,
              boxId: null,
            })
          : await creeLocataire(saisie.valeurs);

      if (!resultat.success) {
        vibre(60);
        toast.error(resultat.error ?? "Enregistrement impossible.");
        return;
      }
      vibre();
      toast.success(
        saisie.id
          ? "Coordonnées mises à jour."
          : loyerValide
            ? "Locataire et contrat créés."
            : "Locataire ajouté, sans contrat."
      );
      ferme();
      router.refresh();
    });
  };

  const ferme = () => {
    setSaisie(null);
    setOuvert(null);
    setContratPour(null);
    setLoyer("");
    setPeriodeEffet(periodeCourante());
  };

  const ajouteContrat = () => {
    if (!contratPour || !loyerValide) return;
    demarreTransition(async () => {
      const resultat = await creeContratSansBox({
        locataireId: contratPour.id,
        loyer: montant,
        periodeEffet,
      });

      if (!resultat.success) {
        vibre(60);
        toast.error(resultat.error ?? "Création impossible.");
        return;
      }
      vibre();
      toast.success("Contrat créé. Le box se rattache depuis l'écran Box.");
      ferme();
      router.refresh();
    });
  };

  return (
    <>
      <div className="suivi-safe-top sticky top-0 z-30 border-b border-border bg-background/95 px-4 pb-2 pt-3 backdrop-blur">
        <h1 className="t-titre">Locataires</h1>
        <p className="t-meta">
          {`${locataires.length} au carnet`}
          {archives > 0 ? ` · ${archives} archivé${archives > 1 ? "s" : ""}` : ""}
        </p>

        <label className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-input bg-background px-3">
          <Search className="size-4 shrink-0 text-[var(--suivi-gris)]" aria-hidden />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Nom, société, numéro, box…"
            className="t-corps w-full bg-transparent outline-none"
            aria-label="Rechercher un locataire"
          />
        </label>

        <div className="mt-2 flex gap-2">
          {(
            [
              ["actifs", "Actifs"],
              ["archives", "Archivés"],
              ["tous", "Tous"],
            ] as const
          ).map(([valeur, libelle]) => (
            <button
              key={valeur}
              type="button"
              aria-pressed={filtre === valeur}
              onClick={() => setFiltre(valeur)}
              className={cn(
                "suivi-tap min-h-10 flex-1 rounded-full border px-1 text-xs font-semibold",
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
            <Users className="size-10 text-[var(--suivi-gris)]" aria-hidden />
            <p className="t-corps text-[var(--suivi-gris)]">
              {recherche.trim()
                ? `Aucun locataire ne correspond à « ${recherche.trim()} ».`
                : filtre === "archives"
                  ? "Aucun locataire archivé — personne n'est encore parti."
                  : "Aucun locataire."}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {visibles.map((l) => {
            const etat = etatLocataire(l);

            return (
              <button
                key={l.id}
                type="button"
                onClick={() => setOuvert(l.id)}
                className="suivi-tap suivi-carte flex w-full items-center gap-3 p-3 text-left active:bg-secondary/60"
              >
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{
                    // Un locataire parti sort de la palette : la liste des
                    // archives doit se distinguer d'un coup d'œil de celle des
                    // gens en place, sans avoir à lire les pastilles.
                    backgroundColor:
                      etat === "archive" ? "var(--suivi-gris-clair)" : couleurPastille(l.nom),
                  }}
                  aria-hidden
                >
                  {initiales(l.nom)}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="t-corps block truncate font-medium">{l.nom}</span>
                  <span className="t-meta block truncate">
                    {etat === "actif"
                      ? [
                          l.box.length > 0 ? `Box ${l.box.join(", ")}` : "Box à identifier",
                          `${l.loyer.toLocaleString("fr-FR")} €`,
                        ].join(" · ")
                      : etat === "sans_contrat"
                        ? "Aucun contrat"
                        : l.partiLe
                          ? `Parti le ${formatDate(l.partiLe)}`
                          : "Plus de contrat en cours"}
                  </span>
                </span>

                {/* Pas de pastille pour le box manquant : le sous-titre dit
                    déjà « Box à identifier », et 21 lignes sur 62 en portent
                    une — une alerte qui touche un tiers de la liste n'alerte
                    plus personne. L'absence de contrat, elle, est rare et
                    demande vraiment un geste. */}
                {etat === "sans_contrat" && (
                  <span
                    className="t-etiquette shrink-0 rounded-full px-2 py-1 text-white"
                    style={{ backgroundColor: "var(--suivi-orange)" }}
                  >
                    Sans contrat
                  </span>
                )}

                <ChevronRight className="size-4 shrink-0 opacity-40" aria-hidden />
              </button>
            );
          })}
        </div>

        {modifiable && (
          <button
            type="button"
            onClick={() => setSaisie({ id: null, valeurs: { ...SAISIE_VIDE, nom: recherche.trim() } })}
            className="suivi-tap suivi-carte mt-3 flex w-full items-center justify-center gap-2 p-4 text-[var(--primary)] active:bg-secondary/60"
          >
            <UserPlus className="size-5" aria-hidden />
            <span className="t-corps font-medium">
              {/* Reprendre la recherche évite de retaper un nom qu'on vient de
                  chercher en vain — c'est exactement à ce moment-là qu'on
                  s'aperçoit qu'il manque. */}
              {recherche.trim() ? `Créer « ${recherche.trim()} »` : "Ajouter un locataire"}
            </span>
          </button>
        )}

        {!modifiable && <p className="t-meta mt-3 text-center">Saisie indisponible en mode démo.</p>}
      </div>

      <FeuilleModale
        ouverte={locataire !== null}
        titre={locataire?.nom ?? ""}
        onFermer={() => setOuvert(null)}
      >
        {locataire && (
          <>
            {locataire.societe && <p className="t-corps mb-2">{locataire.societe}</p>}

            <dl className="mb-3 grid grid-cols-2 gap-x-3 gap-y-2">
              <Donnee
                libelle={locataire.box.length > 1 ? "Box loués" : "Box"}
                valeur={
                  locataire.box.length > 0
                    ? locataire.box.join(", ")
                    : locataire.enCours > 0
                      ? "à identifier"
                      : "aucun"
                }
              />
              <Donnee
                libelle="Loyer mensuel"
                valeur={
                  locataire.loyer > 0 ? `${locataire.loyer.toLocaleString("fr-FR")} €` : "—"
                }
              />
              <Donnee
                libelle="Depuis"
                valeur={locataire.depuis ? formatDate(locataire.depuis) : "non renseigné"}
              />
              {locataire.partiLe && (
                <Donnee libelle="Parti le" valeur={formatDate(locataire.partiLe)} />
              )}
            </dl>

            <BlocContact
              telephone={locataire.telephone}
              email={locataire.email}
              className="mb-3"
            />

            {modifiable && (
              <Button
                type="button"
                variant="outline"
                className="mb-2 h-12 w-full"
                onClick={() => setSaisie({ id: locataire.id, valeurs: saisieDepuis(locataire) })}
              >
                Modifier les coordonnées
              </Button>
            )}

            {/* Un locataire sans contrat ne rapporte rien et n'apparaît dans
                aucun mois : c'est le seul manque qui appelle un geste depuis
                cet écran. */}
            {modifiable && locataire.contrats === 0 && (
              <Button
                type="button"
                variant="outline"
                className="mb-2 h-12 w-full"
                onClick={() => {
                  setContratPour(locataire);
                  setOuvert(null);
                }}
              >
                Créer un contrat
              </Button>
            )}

            {/* Le reste vit dans la fiche — règlements, contrats, sortie. La
                dupliquer ici en ferait deux à tenir à jour. */}
            <Link
              href={`/suivi/locataire/${locataire.id}`}
              className="suivi-tap flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground active:opacity-90"
            >
              Ouvrir la fiche complète
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </>
        )}
      </FeuilleModale>

      <FeuilleModale
        ouverte={saisie !== null}
        titre={saisie?.id ? "Modifier les coordonnées" : "Nouveau locataire"}
        onFermer={() => setSaisie(null)}
      >
        {saisie && (
          <>
            <Champ
              libelle="Nom"
              valeur={saisie.valeurs.nom}
              placeholder="DUPONT Marie"
              onChange={(nom) => setSaisie({ ...saisie, valeurs: { ...saisie.valeurs, nom } })}
            />
            <Champ
              libelle="Société (facultatif)"
              valeur={saisie.valeurs.societe ?? ""}
              placeholder="SARL DUPONT"
              onChange={(societe) =>
                setSaisie({ ...saisie, valeurs: { ...saisie.valeurs, societe } })
              }
            />
            <Champ
              libelle="Téléphone"
              type="tel"
              valeur={saisie.valeurs.telephone ?? ""}
              placeholder="06 12 34 56 78"
              onChange={(telephone) =>
                setSaisie({ ...saisie, valeurs: { ...saisie.valeurs, telephone } })
              }
            />
            <Champ
              libelle="E-mail"
              type="email"
              valeur={saisie.valeurs.email ?? ""}
              placeholder="marie.dupont@exemple.fr"
              onChange={(email) => setSaisie({ ...saisie, valeurs: { ...saisie.valeurs, email } })}
            />

            {/* Le contrat se saisit ici, sans box : le rattachement viendra
                plus tard. Facultatif, parce qu'on note souvent quelqu'un avant
                de connaître son loyer — l'exiger ferait perdre la fiche. */}
            {!saisie.id && <BlocContrat {...champsContrat} />}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1"
                onClick={ferme}
              >
                Annuler
              </Button>
              <Button
                type="button"
                className="h-12 flex-1"
                disabled={enCours || saisie.valeurs.nom.trim() === ""}
                onClick={enregistre}
              >
                {saisie.id ? "Enregistrer" : "Ajouter"}
              </Button>
            </div>

            {!saisie.id && !loyerValide && (
              <p className="t-meta mt-3">
                Sans loyer, le locataire est créé seul : il faudra lui donner un contrat plus tard
                pour qu&apos;il apparaisse dans les mois.
              </p>
            )}
          </>
        )}
      </FeuilleModale>

      <FeuilleModale
        ouverte={contratPour !== null}
        titre={contratPour ? `Contrat de ${contratPour.nom}` : ""}
        onFermer={ferme}
      >
        {contratPour && (
          <>
            <BlocContrat {...champsContrat} obligatoire />

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="h-12 flex-1" onClick={ferme}>
                Annuler
              </Button>
              <Button
                type="button"
                className="h-12 flex-1"
                disabled={enCours || !loyerValide}
                onClick={ajouteContrat}
              >
                Créer le contrat
              </Button>
            </div>

            <p className="t-meta mt-3">
              Le contrat naît sans box. Le rattachement se fait depuis l&apos;écran Box, qui sait
              vérifier qu&apos;il n&apos;est pas déjà pris.
            </p>
          </>
        )}
      </FeuilleModale>
    </>
  );
}

/**
 * Loyer et mois d'effet — les deux seules choses qu'un contrat exige quand on
 * ne lui donne pas de box.
 */
function BlocContrat({
  loyer,
  setLoyer,
  periodeEffet,
  setPeriodeEffet,
  obligatoire,
}: {
  loyer: string;
  setLoyer: (v: string) => void;
  periodeEffet: string;
  setPeriodeEffet: (v: string) => void;
  obligatoire?: boolean;
}) {
  return (
    <>
      <label className="mb-3 block">
        <span className="t-etiquette mb-1 block">
          {obligatoire ? "Loyer mensuel (€)" : "Loyer mensuel (€) — facultatif"}
        </span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step="10"
          value={loyer}
          onChange={(e) => setLoyer(e.target.value)}
          placeholder="140"
          className="t-corps h-12 w-full rounded-xl border border-input bg-background px-3 tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <span className="t-etiquette mb-1 block">Premier mois dû</span>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {[-1, 0, 1].map((decalage) => {
          const cible = shiftPeriode(periodeCourante(), decalage);
          return (
            <button
              key={cible}
              type="button"
              aria-pressed={periodeEffet === cible}
              onClick={() => setPeriodeEffet(cible)}
              className={cn(
                "suivi-tap min-h-11 rounded-xl border text-xs font-medium",
                periodeEffet === cible
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-[var(--suivi-trait)] bg-background active:bg-secondary"
              )}
            >
              {labelPeriode(cible)}
            </button>
          );
        })}
      </div>
    </>
  );
}

function Champ({
  libelle,
  valeur,
  placeholder,
  type = "text",
  onChange,
}: {
  libelle: string;
  valeur: string;
  placeholder?: string;
  type?: string;
  onChange: (valeur: string) => void;
}) {
  return (
    <label className="mb-3 block">
      <span className="t-etiquette mb-1 block">{libelle}</span>
      <input
        type={type}
        value={valeur}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="t-corps h-12 w-full rounded-xl border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}

function Donnee({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div>
      <dt className="t-etiquette">{libelle}</dt>
      <dd className="t-corps font-medium">{valeur}</dd>
    </div>
  );
}
