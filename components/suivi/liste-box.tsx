"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";

import { FeuilleBox } from "@/components/suivi/feuille-box";
import { couleurPastille } from "@/lib/suivi/totals";
import {
  estBatimentATraiter,
  type BoxListe,
  type ContratSansBox,
  type GroupeBatiment,
} from "@/lib/suivi/types";
import { cn } from "@/lib/utils";

const LIBELLE_STATUT: Record<BoxListe["statut"], string> = {
  libre: "Libre",
  loue: "Loué",
  reserve: "Réservé",
  hors_service: "Hors service",
};

function couleurStatut(statut: BoxListe["statut"]): string {
  if (statut === "loue") return "var(--suivi-vert)";
  if (statut === "reserve") return "var(--suivi-orange)";
  if (statut === "hors_service") return "var(--destructive)";
  return "var(--suivi-gris)";
}

/**
 * Listing des box façon carnet de contacts : en-têtes de section par bâtiment
 * qui restent collés en haut pendant le défilement, comme les lettres d'un
 * répertoire téléphonique.
 */
export function ListeBox({
  groupes,
  modifiable,
  batiments,
  contratsSansBox,
}: {
  groupes: GroupeBatiment[];
  modifiable: boolean;
  batiments: string[];
  contratsSansBox: ContratSansBox[];
}) {
  const [recherche, setRecherche] = useState("");
  const [boxEnEdition, setBoxEnEdition] = useState<BoxListe | null>(null);
  const [creation, setCreation] = useState(false);

  const affiches = useMemo(() => {
    const terme = recherche.trim().toLocaleLowerCase("fr");
    if (!terme) return groupes;

    return groupes
      .map((g) => ({
        ...g,
        box: g.box.filter((b) =>
          [b.numero, b.batiment ?? "", b.locataire ?? ""]
            .join(" ")
            .toLocaleLowerCase("fr")
            .includes(terme)
        ),
      }))
      .filter((g) => g.box.length > 0);
  }, [groupes, recherche]);

  const total = groupes.reduce((n, g) => n + g.box.length, 0);
  const affiche = affiches.reduce((n, g) => n + g.box.length, 0);
  const surfaceConnue = groupes.reduce((s, g) => s + g.surface_totale, 0);
  const sansSurface = groupes.reduce(
    (n, g) => n + g.box.filter((b) => b.surface_m2 == null).length,
    0
  );

  return (
    <div className="mx-auto max-w-2xl">
      <header className="suivi-safe-top sticky top-0 z-30 border-b border-border bg-background/95 px-3 pb-2 pt-2 backdrop-blur">
        <div className="flex items-baseline justify-between gap-2 px-1">
          <h1 className="text-lg font-semibold">Box</h1>
          <span className="text-sm tabular-nums text-[var(--suivi-gris)]">
            {recherche ? `${affiche} / ${total}` : `${total} box`}
          </span>
        </div>

        <div className="relative mt-2">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-[var(--suivi-gris)]"
            aria-hidden
          />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Numéro, bâtiment ou locataire"
            aria-label="Rechercher un box"
            className="h-9 w-full rounded-full border border-input bg-card pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </header>

      {modifiable && (
        // Bouton flottant plutôt qu'en tête d'écran : ajouter un box est un
        // geste occasionnel, mais il doit rester atteignable au pouce.
        <button
          type="button"
          onClick={() => setCreation(true)}
          aria-label="Ajouter un box"
          className="suivi-tap fixed bottom-[calc(var(--suivi-onglets-h)+env(safe-area-inset-bottom,0px)+1rem)] right-4 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        >
          <Plus className="size-7" />
        </button>
      )}

      {!modifiable && (
        <p className="border-b border-[var(--suivi-orange)]/30 bg-[var(--suivi-orange)]/10 px-4 py-2 text-sm font-medium text-[var(--suivi-orange)]">
          Mode démo — liste reconstituée depuis le CSV, édition indisponible.
        </p>
      )}

      {/*
        Le rapprochement locataire ↔ box était invisible : il fallait deviner
        qu'il se cachait dans la fiche d'un locataire. On annonce le travail
        restant là où il se fait, sur l'écran Box.
      */}
      {contratsSansBox.length > 0 && (
        <p className="border-b border-[var(--suivi-orange)]/30 bg-[var(--suivi-orange)]/10 px-4 py-2 text-sm font-medium text-[var(--suivi-orange)]">
          {/*
            Phrase construite en une seule expression : coupée sur plusieurs
            lignes de JSX, l'espace de début de ligne est supprimé et « s » se
            collait à « sans » (« 24 locatairessans box »).
          */}
          {`${contratsSansBox.length} locataire${
            contratsSansBox.length > 1 ? "s" : ""
          } sans box — ouvrez un box pour l'affecter.`}
        </p>
      )}

      <div className="suivi-scroll-simple">
        {affiches.map((groupe) => (
          <section key={groupe.batiment}>
            <h2
              className={cn(
                "sticky z-20 flex items-baseline justify-between border-y border-border bg-secondary px-4 py-1.5 text-sm font-bold",
                "top-[calc(env(safe-area-inset-top,0px)+5.25rem)]",
                estBatimentATraiter(groupe.batiment) && "text-[var(--suivi-orange)]"
              )}
            >
              <span>{groupe.batiment}</span>
              <span className="text-xs font-medium tabular-nums text-[var(--suivi-gris)]">
                {groupe.box.length} box
                {groupe.surface_totale > 0 &&
                  ` · ${Number(groupe.surface_totale.toFixed(2))} m²`}
              </span>
            </h2>

            <ul>
              {groupe.box.map((box) => (
                <li key={box.id}>
                  <button
                    type="button"
                    disabled={!modifiable}
                    onClick={() => setBoxEnEdition(box)}
                    className="suivi-tap flex min-h-[4.5rem] w-full items-center gap-3 border-b border-border/70 bg-card px-3 py-2 text-left active:bg-secondary/60 disabled:active:bg-card"
                  >
                    <span
                      aria-hidden
                      className="flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                      style={{ backgroundColor: couleurPastille(box.numero + groupe.batiment) }}
                    >
                      {box.numero}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-bold text-foreground">
                        Box {box.numero}
                      </span>
                      <span className="block truncate text-sm text-[var(--suivi-gris)]">
                        {box.locataire ?? LIBELLE_STATUT[box.statut]}
                      </span>
                    </span>

                    <span className="shrink-0 text-right">
                      <span
                        className={cn(
                          "block text-base font-semibold tabular-nums",
                          box.surface_m2 == null
                            ? "text-[var(--suivi-orange)]"
                            : "text-foreground"
                        )}
                      >
                        {box.surface_m2 != null
                          ? `${Number(box.surface_m2.toFixed(2))} m²`
                          : "à mesurer"}
                      </span>
                      <span
                        className="block text-sm font-medium"
                        style={{ color: couleurStatut(box.statut) }}
                      >
                        {LIBELLE_STATUT[box.statut]}
                      </span>
                    </span>

                    {modifiable && (
                      <Pencil className="size-5 shrink-0 text-[var(--suivi-gris)]" aria-hidden />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {affiches.length === 0 && (
          <p className="px-4 py-12 text-center text-base text-[var(--suivi-gris)]">
            {recherche
              ? `Aucun box ne correspond à « ${recherche} ».`
              : "Aucun box enregistré."}
          </p>
        )}

        {affiches.length > 0 && (
          <p className="px-4 py-4 text-center text-sm text-[var(--suivi-gris)]">
            Surface connue : {Number(surfaceConnue.toFixed(2))} m²
            {sansSurface > 0 && ` · ${sansSurface} box sans surface renseignée`}
          </p>
        )}
      </div>

      {(boxEnEdition || creation) && (
        <FeuilleBox
          box={boxEnEdition}
          creation={creation}
          batiments={batiments}
          contratsSansBox={contratsSansBox}
          onFermer={() => {
            setBoxEnEdition(null);
            setCreation(false);
          }}
        />
      )}
    </div>
  );
}
