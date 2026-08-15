"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { vibre } from "@/components/suivi/bouton-encaissement";
import { FeuilleModale } from "@/components/suivi/feuille-modale";
import { rattacheBoxAuContrat } from "@/lib/actions/suivi";
import { estBatimentATraiter, type BoxRattachable } from "@/lib/suivi/types";
import { cn } from "@/lib/utils";

/**
 * Choix d'un box à rattacher à un contrat, dans le référentiel de l'app.
 *
 * Les box déjà pris restent visibles mais non sélectionnables : les masquer
 * ferait chercher en vain un box qu'on croit libre. On dit qui l'occupe.
 */
export function FeuilleRattachement({
  contratId,
  boxDisponibles,
  onFermer,
}: {
  contratId: string | null;
  boxDisponibles: BoxRattachable[];
  onFermer: () => void;
}) {
  const router = useRouter();
  const [recherche, setRecherche] = useState("");
  const [enCours, demarreTransition] = useTransition();

  const groupes = useMemo(() => {
    const terme = recherche.trim().toLocaleLowerCase("fr");
    const filtres = terme
      ? boxDisponibles.filter((b) =>
          `${b.numero} ${b.batiment ?? ""}`.toLocaleLowerCase("fr").includes(terme)
        )
      : boxDisponibles;

    const parBatiment = new Map<string, BoxRattachable[]>();
    for (const b of filtres) {
      const cle = b.batiment?.trim() || "Sans bâtiment";
      const liste = parBatiment.get(cle);
      if (liste) liste.push(b);
      else parBatiment.set(cle, [b]);
    }

    return [...parBatiment.entries()]
      .map(([batiment, box]) => ({
        batiment,
        box: box.sort((a, b) =>
          a.numero.localeCompare(b.numero, "fr", { numeric: true, sensitivity: "base" })
        ),
      }))
      .sort((a, b) => {
        const aT = estBatimentATraiter(a.batiment);
        const bT = estBatimentATraiter(b.batiment);
        if (aT !== bT) return aT ? 1 : -1;
        return a.batiment.localeCompare(b.batiment, "fr", { numeric: true });
      });
  }, [boxDisponibles, recherche]);

  if (!contratId) return null;

  const rattache = (box: BoxRattachable) => {
    demarreTransition(async () => {
      const resultat = await rattacheBoxAuContrat(contratId, box.box_id);
      if (!resultat.success) {
        vibre(60);
        toast.error(resultat.error ?? "Rattachement impossible.");
        return;
      }
      vibre();
      toast.success(`Box ${box.numero} rattaché.`);
      onFermer();
      router.refresh();
    });
  };

  return (
    <FeuilleModale ouverte titre="Rattacher un box" onFermer={onFermer}>
      <div className="relative mb-3">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--suivi-gris)]"
          aria-hidden
        />
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Numéro ou bâtiment"
          aria-label="Rechercher un box"
          className="h-12 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {groupes.length === 0 && (
        <p className="py-8 text-center text-base text-[var(--suivi-gris)]">
          {recherche ? `Aucun box ne correspond à « ${recherche} ».` : "Aucun box disponible."}
        </p>
      )}

      {groupes.map((groupe) => (
        <section key={groupe.batiment} className="mb-3">
          <h3
            className={cn(
              "mb-1 text-sm font-bold",
              estBatimentATraiter(groupe.batiment)
                ? "text-[var(--suivi-orange)]"
                : "text-[var(--suivi-gris)]"
            )}
          >
            {groupe.batiment}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {groupe.box.map((box) => {
              const pris = box.dejaRattacheA !== null;
              return (
                <button
                  key={box.box_id}
                  type="button"
                  disabled={pris || enCours}
                  onClick={() => rattache(box)}
                  title={pris ? `Déjà rattaché à ${box.dejaRattacheA}` : undefined}
                  className={cn(
                    "suivi-tap flex min-h-16 flex-col items-center justify-center rounded-xl border px-1 text-sm font-semibold",
                    pris
                      ? "border-dashed border-border bg-secondary/60 text-[var(--suivi-gris)] opacity-70"
                      : "border-border bg-background text-foreground active:bg-secondary"
                  )}
                >
                  <span>{box.numero}</span>
                  <span className="text-xs font-normal">
                    {pris
                      ? "pris"
                      : box.surface_m2 != null
                        ? `${Number(box.surface_m2.toFixed(2))} m²`
                        : "—"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <p className="mt-2 text-center text-sm text-[var(--suivi-gris)]">
        Le rattachement ne touche que les données de l&apos;application.
      </p>
    </FeuilleModale>
  );
}
