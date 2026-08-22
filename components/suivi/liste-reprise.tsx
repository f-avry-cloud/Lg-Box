"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, MessageSquareDashed, NotebookPen, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { BlocContact } from "@/components/suivi/bloc-contact";
import { vibre } from "@/components/suivi/bouton-encaissement";
import { FeuilleModale } from "@/components/suivi/feuille-modale";
import { Button } from "@/components/ui/button";
import {
  creeLocataire,
  modifieLocataire,
  type SaisieLocataire,
} from "@/lib/actions/suivi-locataires";
import {
  enregistreNoteReprise,
  marqueContacte,
  marqueMessageLaisse,
} from "@/lib/actions/suivi-reprise";
import {
  LIBELLE_REPRISE,
  avancementReprise,
  couleurReprise,
  filtreReprise,
  sansCoordonnees,
  statutReprise,
  trieReprise,
  type FiltreReprise,
  type LocataireReprise,
} from "@/lib/suivi/reprise";
import { couleurPastille, initiales } from "@/lib/suivi/totals";
import { cn } from "@/lib/utils";

const SAISIE_VIDE: SaisieLocataire = { nom: "", societe: null, telephone: null, email: null };

/**
 * Campagne de reprise — **écran temporaire**.
 *
 * On descend une liste, on appelle, on coche. Tout est donc fait pour qu'un
 * tour de liste se mène sans réfléchir : ce qui reste à faire remonte en tête,
 * les deux gestes de suivi (contacté / message laissé) sont à un tap depuis la
 * fiche, et l'avancement reste sous les yeux.
 *
 * Les coordonnées se corrigent ici même : c'est en appelant qu'on découvre les
 * numéros faux, et devoir changer d'écran pour les réparer, c'est ne pas les
 * réparer.
 */
export function ListeReprise({ lignes }: { lignes: LocataireReprise[] }) {
  const router = useRouter();
  const [enCours, demarreTransition] = useTransition();
  const [filtre, setFiltre] = useState<FiltreReprise>("a_faire");
  const [recherche, setRecherche] = useState("");
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [creation, setCreation] = useState(false);

  const avancement = avancementReprise(lignes);
  const visibles = useMemo(
    () => trieReprise(filtreReprise(lignes, filtre, recherche)),
    [lignes, filtre, recherche]
  );

  const ligneOuverte = lignes.find((l) => l.locataire_id === ouverte) ?? null;

  const agit = async (action: Promise<{ success: boolean; error?: string }>, message: string) => {
    const resultat = await action;
    if (!resultat.success) {
      vibre(60);
      toast.error(resultat.error ?? "Enregistrement impossible.");
      return false;
    }
    vibre();
    toast.success(message);
    router.refresh();
    return true;
  };

  return (
    <>
      <div className="suivi-safe-top sticky top-0 z-30 bg-[var(--background)]/90 px-5 pb-3 pt-4 backdrop-blur-md">
        <p className="t-etiquette">Campagne temporaire</p>
        <h1 className="t-titre mt-0.5">Reprise du centre</h1>

        {/* L'avancement sous les yeux : c'est ce qui donne envie de finir. */}
        <div className="mt-3 flex items-baseline justify-between">
          <span className="t-corps">
            <span className="t-nombre font-medium">{avancement.contactes}</span>
            <span className="text-[var(--suivi-gris-clair)]">
              {` / ${avancement.total} prévenus`}
            </span>
          </span>
          <span className="t-meta t-nombre">{avancement.pourcentage} %</span>
        </div>
        <div
          className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[var(--suivi-trait)]"
          role="progressbar"
          aria-valuenow={avancement.pourcentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Part des locataires prévenus"
        >
          <div
            className="h-full rounded-full bg-[var(--suivi-vert)] transition-[width] duration-300"
            style={{ width: `${avancement.pourcentage}%` }}
          />
        </div>
        {avancement.messages > 0 && (
          <p className="t-meta mt-1">
            {`${avancement.messages} message${avancement.messages > 1 ? "s" : ""} laissé${
              avancement.messages > 1 ? "s" : ""
            }, sans réponse`}
          </p>
        )}

        <div className="mt-3 flex gap-2">
          {(
            [
              ["a_faire", "À contacter"],
              ["tous", "Tous"],
            ] as const
          ).map(([valeur, libelle]) => (
            <button
              key={valeur}
              type="button"
              aria-pressed={filtre === valeur}
              onClick={() => setFiltre(valeur)}
              className={cn(
                "suivi-tap t-corps min-h-10 flex-1 rounded-full border font-medium",
                filtre === valeur
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-[var(--suivi-trait)] bg-card active:bg-secondary"
              )}
            >
              {libelle}
            </button>
          ))}
        </div>

        <div className="relative mt-2">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--suivi-gris-clair)]"
            aria-hidden
          />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Nom, box ou numéro"
            aria-label="Rechercher un locataire"
            className="t-corps h-11 w-full rounded-full border border-[var(--suivi-trait)] bg-card pl-9 pr-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="suivi-scroll-simple px-5 pb-5">
        {visibles.length === 0 && (
          <p className="t-corps py-16 text-center text-[var(--suivi-gris-clair)]">
            {recherche
              ? `Aucun locataire ne correspond à « ${recherche} ».`
              : "Tout le monde a été prévenu."}
          </p>
        )}

        <div className="space-y-2">
          {visibles.map((l) => {
            const statut = statutReprise(l.etat);
            return (
              <button
                key={l.locataire_id}
                type="button"
                onClick={() => setOuverte(l.locataire_id)}
                className="suivi-tap suivi-carte flex w-full items-center gap-3 p-3 text-left active:bg-[var(--secondary)]/40"
              >
                <span
                  aria-hidden
                  className="t-corps flex size-10 shrink-0 items-center justify-center rounded-full font-medium text-white"
                  style={{ backgroundColor: couleurPastille(l.nom) }}
                >
                  {initiales(l.nom)}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="t-corps block truncate font-medium">{l.nom}</span>
                  <span className="t-meta block truncate">
                    {[
                      l.box.length > 0 ? `Box ${l.box.join(", ")}` : "sans box",
                      sansCoordonnees(l) ? "aucune coordonnée" : l.telephone,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>

                {statut === "contacte" && (
                  <Check
                    className="size-5 shrink-0 text-[var(--suivi-vert)]"
                    aria-label="Prévenu"
                  />
                )}
                {statut === "message" && (
                  <span
                    className="t-etiquette shrink-0 rounded-full px-2 py-1 text-white"
                    style={{ backgroundColor: couleurReprise(statut) }}
                  >
                    Message
                  </span>
                )}
                {statut === "a_faire" && l.etat.note && (
                  <NotebookPen
                    className="size-4 shrink-0 text-[var(--suivi-gris-clair)]"
                    aria-label="Note présente"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Quelqu'un occupe un box sans figurer dans le fichier repris : il
            faut pouvoir le noter tout de suite. */}
        <button
          type="button"
          onClick={() => setCreation(true)}
          className="suivi-tap t-corps mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--input)] font-medium active:bg-secondary"
        >
          <UserPlus className="size-4" aria-hidden />
          Ajouter un locataire non renseigné
        </button>
      </div>

      {ligneOuverte && (
        <FicheReprise
          key={ligneOuverte.locataire_id}
          ligne={ligneOuverte}
          enCours={enCours}
          onFermer={() => setOuverte(null)}
          onAgir={(action, message) => {
            demarreTransition(async () => {
              await agit(action, message);
            });
          }}
        />
      )}

      {creation && (
        <FormulaireLocataire
          titre="Locataire non renseigné"
          saisieInitiale={SAISIE_VIDE}
          enCours={enCours}
          libelleValidation="Ajouter"
          onFermer={() => setCreation(false)}
          onValider={(saisie) =>
            demarreTransition(async () => {
              const fait = await agit(
                creeLocataire(saisie),
                `${saisie.nom.trim()} ajouté à la liste.`
              );
              if (fait) setCreation(false);
            })
          }
        />
      )}
    </>
  );
}

/** La fiche d'appel : joindre, cocher, noter. */
function FicheReprise({
  ligne,
  enCours,
  onFermer,
  onAgir,
}: {
  ligne: LocataireReprise;
  enCours: boolean;
  onFermer: () => void;
  onAgir: (action: Promise<{ success: boolean; error?: string }>, message: string) => void;
}) {
  const [note, setNote] = useState(ligne.etat.note ?? "");
  const [edition, setEdition] = useState(false);

  const statut = statutReprise(ligne.etat);

  if (edition) {
    return (
      <FormulaireLocataire
        titre="Corriger les coordonnées"
        saisieInitiale={{
          nom: ligne.nom,
          societe: ligne.societe,
          telephone: ligne.telephone,
          email: ligne.email,
        }}
        enCours={enCours}
        libelleValidation="Enregistrer"
        onFermer={() => setEdition(false)}
        onValider={(saisie) => {
          onAgir(modifieLocataire(ligne.locataire_id, saisie), "Coordonnées mises à jour.");
          setEdition(false);
        }}
      />
    );
  }

  return (
    <FeuilleModale ouverte titre={ligne.nom} onFermer={onFermer}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="t-meta">
          {ligne.box.length > 0 ? `Box ${ligne.box.join(", ")}` : "Aucun box rattaché"}
          {ligne.societe ? ` · ${ligne.societe}` : ""}
        </span>
        <span
          className="t-etiquette shrink-0 rounded-full px-2 py-1 text-white"
          style={{ backgroundColor: couleurReprise(statut) }}
        >
          {LIBELLE_REPRISE[statut]}
        </span>
      </div>

      {sansCoordonnees(ligne) ? (
        <p className="t-meta mb-3 rounded-lg bg-[var(--suivi-orange)]/10 px-3 py-2 text-[var(--suivi-orange)]">
          Aucun numéro ni e-mail — corrigez les coordonnées pour pouvoir le joindre.
        </p>
      ) : (
        <BlocContact telephone={ligne.telephone} email={ligne.email} className="mb-3" />
      )}

      <button
        type="button"
        onClick={() => setEdition(true)}
        className="suivi-tap t-corps mb-4 min-h-11 w-full rounded-xl border border-[var(--suivi-trait)] font-medium active:bg-secondary"
      >
        Modifier les coordonnées
      </button>

      {/* Les deux gestes de la campagne. Non exclusifs : on laisse un message,
          puis on finit par avoir la personne. */}
      <span className="t-etiquette mb-1.5 block">Suivi de l&apos;appel</span>
      <div className="mb-4 space-y-2">
        <BoutonSuivi
          actif={ligne.etat.contacte}
          icone={<Check className="size-4" aria-hidden />}
          libelle="Prévenu du changement"
          couleur="var(--suivi-vert)"
          desactive={enCours}
          onClick={() =>
            onAgir(
              marqueContacte(ligne.locataire_id, !ligne.etat.contacte),
              ligne.etat.contacte ? "Marqué non prévenu." : `${ligne.nom} prévenu.`
            )
          }
        />
        <BoutonSuivi
          actif={ligne.etat.message_laisse}
          icone={<MessageSquareDashed className="size-4" aria-hidden />}
          libelle="Message laissé"
          couleur="var(--primary)"
          desactive={enCours}
          onClick={() =>
            onAgir(
              marqueMessageLaisse(ligne.locataire_id, !ligne.etat.message_laisse),
              ligne.etat.message_laisse ? "Message retiré." : "Message laissé, noté."
            )
          }
        />
      </div>

      <label className="t-etiquette mb-1.5 block" htmlFor="note-reprise">
        Observations
      </label>
      <textarea
        id="note-reprise"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => {
          if (note === (ligne.etat.note ?? "")) return;
          onAgir(enregistreNoteReprise(ligne.locataire_id, note), "Note enregistrée.");
        }}
        rows={4}
        placeholder="Rappeler samedi, a demandé un courrier…"
        className="t-corps mb-4 w-full rounded-xl border border-input bg-background p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <Button type="button" variant="outline" className="h-12 w-full" onClick={onFermer}>
        Fermer
      </Button>
    </FeuilleModale>
  );
}

function BoutonSuivi({
  actif,
  icone,
  libelle,
  couleur,
  desactive,
  onClick,
}: {
  actif: boolean;
  icone: React.ReactNode;
  libelle: string;
  couleur: string;
  desactive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      disabled={desactive}
      onClick={onClick}
      className={cn(
        "suivi-tap t-corps flex min-h-12 w-full items-center gap-2.5 rounded-xl border px-3 font-medium",
        actif ? "border-transparent text-white" : "border-[var(--suivi-trait)] active:bg-secondary"
      )}
      style={actif ? { backgroundColor: couleur } : undefined}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          actif ? "border-white/60 bg-white/20" : "border-[var(--input)]"
        )}
      >
        {actif && icone}
      </span>
      {libelle}
    </button>
  );
}

/** Saisie des coordonnées — servant à la création comme à la correction. */
function FormulaireLocataire({
  titre,
  saisieInitiale,
  enCours,
  libelleValidation,
  onFermer,
  onValider,
}: {
  titre: string;
  saisieInitiale: SaisieLocataire;
  enCours: boolean;
  libelleValidation: string;
  onFermer: () => void;
  onValider: (saisie: SaisieLocataire) => void;
}) {
  const [saisie, setSaisie] = useState(saisieInitiale);

  return (
    <FeuilleModale ouverte titre={titre} onFermer={onFermer}>
      <Champ
        libelle="Nom"
        valeur={saisie.nom}
        onChange={(v) => setSaisie({ ...saisie, nom: v })}
        placeholder="NOM Prénom"
      />
      <Champ
        libelle="Société (facultatif)"
        valeur={saisie.societe ?? ""}
        onChange={(v) => setSaisie({ ...saisie, societe: v })}
      />
      <Champ
        libelle="Téléphone"
        type="tel"
        valeur={saisie.telephone ?? ""}
        onChange={(v) => setSaisie({ ...saisie, telephone: v })}
        placeholder="+336…"
      />
      <Champ
        libelle="E-mail"
        type="email"
        valeur={saisie.email ?? ""}
        onChange={(v) => setSaisie({ ...saisie, email: v })}
      />

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="h-12 flex-1" onClick={onFermer}>
          Annuler
        </Button>
        <Button
          type="button"
          className="h-12 flex-1"
          disabled={enCours || saisie.nom.trim() === ""}
          onClick={() => onValider(saisie)}
        >
          {libelleValidation}
        </Button>
      </div>
    </FeuilleModale>
  );
}

function Champ({
  libelle,
  valeur,
  onChange,
  type = "text",
  placeholder,
}: {
  libelle: string;
  valeur: string;
  onChange: (valeur: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="mb-3 block">
      <span className="t-etiquette mb-1 block">{libelle}</span>
      <input
        type={type}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoCapitalize={type === "email" ? "none" : undefined}
        autoCorrect="off"
        className="t-corps h-12 w-full rounded-xl border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}
