"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Inbox, Pencil, Ruler, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { BlocContact } from "@/components/suivi/bloc-contact";
import { vibre } from "@/components/suivi/bouton-encaissement";
import { FeuilleModale } from "@/components/suivi/feuille-modale";
import { Button } from "@/components/ui/button";
import {
  ajouteEnListeAttente,
  modifieDemande,
  purgeDemandesTraitees,
  supprimeDemande,
  type SaisieAttente,
} from "@/lib/actions/suivi-demandes";
import { updateReservationStatus } from "@/lib/actions/reservations";
import { formatDate } from "@/lib/format";
import { libelleRang, nombreEnAttente, rangDansFile } from "@/lib/suivi/demandes";
import { couleurPastille, initiales } from "@/lib/suivi/totals";
import {
  STATUTS_DEMANDE,
  STATUT_DEMANDE_LABELS,
  couleurStatutDemande,
  type DemandeReservation,
  type StatutDemande,
} from "@/lib/suivi/types";
import { cn } from "@/lib/utils";

type Filtre = "attente" | "liste" | "toutes";

function saisieVide(): SaisieAttente {
  return { nom: "", telephone: "", email: "", tailleSouhaitee: "", note: "" };
}

function saisieDepuis(demande: DemandeReservation): SaisieAttente {
  return {
    nom: demande.nom,
    telephone: demande.telephone ?? "",
    email: demande.email ?? "",
    tailleSouhaitee: demande.taille_souhaitee ?? "",
    note: demande.message ?? "",
  };
}

/**
 * Les demandes de réservation, à traiter depuis le téléphone.
 *
 * Même présentation que la liste des locataires — pastille d'initiales, nom,
 * une ligne de contexte — parce que le geste est le même : on ouvre, on
 * regarde, on appelle. La différence tient au statut, qui avance ici au lieu
 * d'attendre un passage par le back-office.
 *
 * L'écran porte aussi la **liste d'attente**. Le centre étant plein, la
 * plupart des appels ne peuvent pas être servis : ces personnes ne sont pas
 * refusées, elles attendent qu'un box se libère. Elles se saisissent ici, à la
 * volée, et se retrouvent numérotées dans leur ordre d'arrivée.
 */
export function ListeDemandes({ demandes }: { demandes: DemandeReservation[] }) {
  const router = useRouter();
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("attente");
  const [enCours, demarreTransition] = useTransition();

  // `null` = feuille fermée ; `{ id: null }` = ajout ; `{ id }` = correction.
  const [saisie, setSaisie] = useState<{ id: string | null; valeurs: SaisieAttente } | null>(null);

  // Les deux suppressions demandent confirmation sur place : une feuille de
  // dialogue par-dessus une feuille de dialogue serait pire que le risque.
  const [confirmeSuppression, setConfirmeSuppression] = useState(false);
  const [confirmePurge, setConfirmePurge] = useState(false);

  const nouvelles = demandes.filter((d) => d.statut === "nouvelle").length;
  const enAttente = nombreEnAttente(demandes);
  const closes = demandes.filter(
    (d) => d.statut === "convertie" || d.statut === "refusee"
  ).length;

  const visibles = useMemo(() => {
    if (filtre === "attente") return demandes.filter((d) => d.statut === "nouvelle");
    if (filtre === "liste") return demandes.filter((d) => d.statut === "liste_attente");
    return demandes;
  }, [demandes, filtre]);

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

  const supprime = (id: string) => {
    demarreTransition(async () => {
      const resultat = await supprimeDemande(id);
      if (!resultat.success) {
        vibre(60);
        toast.error(resultat.error ?? "Suppression impossible.");
        return;
      }
      vibre();
      toast.success("Demande supprimée.");
      setConfirmeSuppression(false);
      setOuverte(null);
      router.refresh();
    });
  };

  const purge = () => {
    demarreTransition(async () => {
      const resultat = await purgeDemandesTraitees();
      if (!resultat.success) {
        vibre(60);
        toast.error(resultat.error);
        return;
      }
      vibre();
      toast.success(
        resultat.supprimees === 0
          ? "Rien à supprimer."
          : `${resultat.supprimees} demande${resultat.supprimees > 1 ? "s" : ""} supprimée${
              resultat.supprimees > 1 ? "s" : ""
            }.`
      );
      setConfirmePurge(false);
      router.refresh();
    });
  };

  const enregistre = () => {
    if (!saisie) return;
    demarreTransition(async () => {
      const resultat = saisie.id
        ? await modifieDemande(saisie.id, saisie.valeurs)
        : await ajouteEnListeAttente(saisie.valeurs);

      if (!resultat.success) {
        vibre(60);
        toast.error(resultat.error ?? "Enregistrement impossible.");
        return;
      }
      vibre();
      toast.success(saisie.id ? "Coordonnées mises à jour." : "Ajouté à la liste d'attente.");
      setSaisie(null);
      // Une inscription se voit tout de suite : sans quoi on la ressaisit,
      // persuadé qu'elle n'est pas passée.
      if (!saisie.id) setFiltre("liste");
      router.refresh();
    });
  };

  return (
    <>
      <div className="suivi-safe-top sticky top-0 z-30 border-b border-border bg-background/95 px-4 pb-2 pt-3 backdrop-blur">
        <h1 className="t-titre">Demandes de réservation</h1>
        <p className="t-meta">
          {[
            nouvelles > 0 ? `${nouvelles} nouvelle${nouvelles > 1 ? "s" : ""} à rappeler` : null,
            enAttente > 0 ? `${enAttente} en liste d'attente` : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Aucune demande en attente"}
        </p>

        <div className="mt-2 flex gap-2">
          {(
            [
              ["attente", "À traiter"],
              ["liste", "Liste d'attente"],
              ["toutes", "Toutes"],
            ] as const
          ).map(([valeur, libelle]) => (
            <button
              key={valeur}
              type="button"
              aria-pressed={filtre === valeur}
              onClick={() => {
                setFiltre(valeur);
                setConfirmePurge(false);
              }}
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
            <Inbox className="size-10 text-[var(--suivi-gris)]" aria-hidden />
            <p className="t-corps text-[var(--suivi-gris)]">
              {filtre === "attente"
                ? "Toutes les demandes ont été traitées."
                : filtre === "liste"
                  ? "Personne en liste d'attente."
                  : "Aucune demande reçue pour l'instant."}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {visibles.map((d) => {
            const rang = d.statut === "liste_attente" ? rangDansFile(demandes, d.id) : null;

            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setOuverte(d.id)}
                className="suivi-tap suivi-carte flex w-full items-center gap-3 p-3 text-left active:bg-secondary/60"
              >
                {/* Sur la liste d'attente, le rang remplace les initiales : ce
                    qu'on cherche d'abord, c'est qui rappeler en premier. */}
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{
                    backgroundColor: rang ? "var(--suivi-bleu)" : couleurPastille(d.nom),
                  }}
                  aria-hidden
                >
                  {rang ? `${rang}` : initiales(d.nom)}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="t-corps block truncate font-medium">{d.nom}</span>
                  <span className="t-meta block truncate">
                    {[
                      d.taille_souhaitee,
                      d.statut === "liste_attente"
                        ? `depuis le ${formatDate(d.created_at)}`
                        : d.date_souhaitee
                          ? `pour le ${formatDate(d.date_souhaitee)}`
                          : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || formatDate(d.created_at)}
                  </span>
                </span>

                {/* Sur le filtre « Liste d'attente », toutes les lignes portent
                    le même statut : la pastille n'apprend rien et prend la
                    place de la date, qui, elle, se lit. */}
                {filtre !== "liste" && (
                  <span
                    className="t-etiquette shrink-0 rounded-full px-2 py-1 text-white"
                    style={{ backgroundColor: couleurStatutDemande(d.statut) }}
                  >
                    {STATUT_DEMANDE_LABELS[d.statut]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Le centre est plein : la plupart des appels finissent ici plutôt
            qu'en contrat. Le bouton reste donc visible quel que soit le filtre. */}
        <button
          type="button"
          onClick={() => setSaisie({ id: null, valeurs: saisieVide() })}
          className="suivi-tap suivi-carte mt-3 flex w-full items-center justify-center gap-2 p-4 text-[var(--primary)] active:bg-secondary/60"
        >
          <UserPlus className="size-5" aria-hidden />
          <span className="t-corps font-medium">Ajouter à la liste d&apos;attente</span>
        </button>

        {/* Le ménage. Ne s'affiche que sur « Toutes », le seul filtre où l'on
            voit ce qu'on s'apprête à supprimer — proposer un balayage de
            lignes invisibles serait demander une confiance qu'on n'a pas à
            demander. */}
        {filtre === "toutes" &&
          closes > 0 &&
          (confirmePurge ? (
            <div className="suivi-carte mt-2 p-4">
              <p className="t-corps">
                Supprimer définitivement {closes} demande{closes > 1 ? "s" : ""} convertie
                {closes > 1 ? "s" : ""} ou refusée{closes > 1 ? "s" : ""} ?
              </p>
              <p className="t-meta mt-1">
                Les nouvelles et la liste d&apos;attente ne sont pas touchées.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 flex-1"
                  onClick={() => setConfirmePurge(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-12 flex-1"
                  disabled={enCours}
                  onClick={purge}
                >
                  Supprimer
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmePurge(true)}
              className="suivi-tap mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-[var(--suivi-gris)] active:bg-secondary"
            >
              <Trash2 className="size-4" aria-hidden />
              {closes > 1
                ? `Supprimer les ${closes} demandes traitées`
                : "Supprimer la demande traitée"}
            </button>
          ))}
      </div>

      <FeuilleModale
        ouverte={demande !== null}
        titre={demande?.nom ?? ""}
        onFermer={() => {
          setOuverte(null);
          setConfirmeSuppression(false);
        }}
      >
        {demande && (
          <>
            <p className="t-meta mb-3">
              {demande.origine === "manuelle"
                ? `Notée le ${formatDate(demande.created_at)}`
                : `Reçue le ${formatDate(demande.created_at)}`}
              {demande.statut === "liste_attente" &&
                (() => {
                  const rang = rangDansFile(demandes, demande.id);
                  return rang ? ` · ${libelleRang(rang)}` : "";
                })()}
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

            <BlocContact telephone={demande.telephone} email={demande.email} className="mb-3" />

            {/* C'est en rappelant qu'on découvre les numéros faux : les
                corriger doit se faire ici, pas dans un autre écran. */}
            <button
              type="button"
              onClick={() => setSaisie({ id: demande.id, valeurs: saisieDepuis(demande) })}
              className="suivi-tap mb-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium active:bg-secondary"
            >
              <Pencil className="size-4" aria-hidden />
              Modifier les coordonnées
            </button>

            <span className="t-etiquette mb-1 block">Suivi de la demande</span>
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

            {/* Une demande traitée ou devenue sans objet n'a pas à encombrer la
                liste. La suppression est définitive, d'où la confirmation en
                deux temps, comme pour une charge. */}
            {confirmeSuppression ? (
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 flex-1"
                  onClick={() => setConfirmeSuppression(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-12 flex-1"
                  disabled={enCours}
                  onClick={() => supprime(demande.id)}
                >
                  Supprimer définitivement
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmeSuppression(true)}
                className="suivi-tap mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-[var(--destructive)] active:bg-secondary"
              >
                <Trash2 className="size-4" aria-hidden />
                Supprimer cette demande
              </button>
            )}
          </>
        )}
      </FeuilleModale>

      <FeuilleModale
        ouverte={saisie !== null}
        titre={saisie?.id ? "Modifier les coordonnées" : "Ajouter à la liste d'attente"}
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
              libelle="Téléphone"
              type="tel"
              valeur={saisie.valeurs.telephone}
              placeholder="06 12 34 56 78"
              onChange={(telephone) =>
                setSaisie({ ...saisie, valeurs: { ...saisie.valeurs, telephone } })
              }
            />
            <Champ
              libelle="E-mail (facultatif)"
              type="email"
              valeur={saisie.valeurs.email}
              placeholder="marie.dupont@exemple.fr"
              onChange={(email) => setSaisie({ ...saisie, valeurs: { ...saisie.valeurs, email } })}
            />
            <Champ
              libelle="Taille souhaitée"
              valeur={saisie.valeurs.tailleSouhaitee}
              placeholder="10 m², un box au sol…"
              onChange={(tailleSouhaitee) =>
                setSaisie({ ...saisie, valeurs: { ...saisie.valeurs, tailleSouhaitee } })
              }
            />

            <label className="mb-4 block">
              <span className="t-etiquette mb-1 block">Observations</span>
              <textarea
                rows={3}
                value={saisie.valeurs.note}
                onChange={(e) =>
                  setSaisie({ ...saisie, valeurs: { ...saisie.valeurs, note: e.target.value } })
                }
                placeholder="Ce qu'il faudra se rappeler au moment de rappeler…"
                className="t-corps w-full rounded-xl border border-input bg-background p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1"
                onClick={() => setSaisie(null)}
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

            {!saisie.id && (
              <p className="t-meta mt-3">
                La personne rejoint la file dans son ordre d&apos;arrivée, et apparaît aussi dans le
                back-office.
              </p>
            )}
          </>
        )}
      </FeuilleModale>
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
      <dt className="t-etiquette flex items-center gap-1">
        {icone}
        {libelle}
      </dt>
      <dd className="t-corps font-medium">{valeur}</dd>
    </div>
  );
}
