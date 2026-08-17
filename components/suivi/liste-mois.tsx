"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { BarreTotaux } from "@/components/suivi/barre-totaux";
import { vibre } from "@/components/suivi/bouton-encaissement";
import {
  FeuilleEncaissement,
  type SaisieEncaissement,
} from "@/components/suivi/feuille-encaissement";
import { LigneLocataire } from "@/components/suivi/ligne-locataire";
import { NavigationMois } from "@/components/suivi/navigation-mois";
import { basculeReglement, enregistreDetailReglement } from "@/lib/actions/suivi";
import { shiftPeriode } from "@/lib/suivi/period";
import { calculeTotaux, filtreLignes, statutLigne, trieLignes, type FiltreMois } from "@/lib/suivi/totals";
import type { LigneMois, Reglement } from "@/lib/suivi/types";
import { cn } from "@/lib/utils";

const ONGLETS: Array<{ cle: FiltreMois; libelle: string }> = [
  { cle: "tous", libelle: "Tous" },
  { cle: "regles", libelle: "Réglés" },
  { cle: "attente", libelle: "En attente" },
];

/** Distance minimale d'un balayage horizontal pour changer de mois. */
const SEUIL_BALAYAGE = 70;

export function ListeMois({
  periode,
  lignesInitiales,
  modeDemo,
}: {
  periode: string;
  lignesInitiales: LigneMois[];
  modeDemo: boolean;
}) {
  const router = useRouter();
  const [lignes, setLignes] = useState(lignesInitiales);
  const [filtre, setFiltre] = useState<FiltreMois>("tous");
  const [recherche, setRecherche] = useState("");
  const [ligneEnSaisie, setLigneEnSaisie] = useState<LigneMois | null>(null);
  const [, demarreTransition] = useTransition();

  // L'ordre est figé au montage du mois : si la liste se retriait à chaque
  // tap, la ligne suivante remonterait sous le pouce et l'exploitant pointerait
  // la mauvaise personne. Les 63 encaissements se font donc en 63 taps sans
  // que rien ne bouge (critère d'acceptation n°1). Le composant est remonté à
  // chaque changement de mois (key={periode} côté page), ce qui recalcule
  // l'ordre pour le nouveau mois.
  const [ordreInitial] = useState(() =>
    trieLignes(lignesInitiales).map((l) => l.contrat_id)
  );

  const affichees = useMemo(() => {
    const parId = new Map(lignes.map((l) => [l.contrat_id, l]));
    const ordonnees = ordreInitial
      .map((id) => parId.get(id))
      .filter((l): l is LigneMois => l !== undefined);
    return filtreLignes(ordonnees, filtre, recherche);
  }, [lignes, ordreInitial, filtre, recherche]);

  const totaux = useMemo(() => calculeTotaux(lignes), [lignes]);

  /** Applique un changement en local, puis le confirme côté serveur. */
  const appliqueEtEnregistre = (
    contratId: string,
    suivant: Reglement | null,
    action: () => Promise<{ success: boolean; error?: string }>
  ) => {
    const precedentes = lignes;
    setLignes((actuelles) =>
      actuelles.map((l) => (l.contrat_id === contratId ? { ...l, reglement: suivant } : l))
    );

    demarreTransition(async () => {
      const resultat = await action();
      if (!resultat.success) {
        // Retour à l'état d'avant : le pointage doit refléter la base, pas
        // l'intention. On prévient explicitement, l'exploitant est souvent
        // dans un local sans réseau.
        setLignes(precedentes);
        vibre(60);
        toast.error(resultat.error ?? "Enregistrement impossible — réessayez.");
      }
    });
  };

  const bascule = (ligne: LigneMois) => {
    const paye = statutLigne(ligne) !== "paye";
    vibre();

    const suivant: Reglement | null = paye
      ? {
          id: `optimiste-${ligne.contrat_id}`,
          contrat_id: ligne.contrat_id,
          periode,
          statut: "paye",
          montant_encaisse_eur: 0,
          date_encaissement: new Date().toISOString().slice(0, 10),
          date_facturation: null,
          moyen: null,
          note: null,
          updated_at: new Date().toISOString(),
        }
      : null;

    appliqueEtEnregistre(ligne.contrat_id, suivant, () =>
      basculeReglement(ligne.contrat_id, periode, paye)
    );
  };

  const enregistreDetail = (ligne: LigneMois, saisie: SaisieEncaissement) => {
    setLigneEnSaisie(null);

    const montant = saisie.montant;
    const statut = montant === 0 ? null : montant >= ligne.loyer_mensuel_eur ? "paye" : "partiel";

    const suivant: Reglement | null = statut
      ? {
          id: ligne.reglement?.id ?? `optimiste-${ligne.contrat_id}`,
          contrat_id: ligne.contrat_id,
          periode,
          statut,
          montant_encaisse_eur: montant,
          date_encaissement: saisie.date,
          date_facturation: null,
          moyen: (saisie.moyen as Reglement["moyen"]) ?? null,
          note: saisie.note,
          updated_at: new Date().toISOString(),
        }
      : null;

    appliqueEtEnregistre(ligne.contrat_id, suivant, () =>
      enregistreDetailReglement(ligne.contrat_id, periode, ligne.loyer_mensuel_eur, saisie)
    );
  };

  // Balayage horizontal pour changer de mois.
  const depart = useRef<{ x: number; y: number } | null>(null);

  const surDebutTouche = (e: React.TouchEvent) => {
    const t = e.touches[0];
    depart.current = { x: t.clientX, y: t.clientY };
  };

  const surFinTouche = (e: React.TouchEvent) => {
    const origine = depart.current;
    depart.current = null;
    if (!origine) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - origine.x;
    const dy = t.clientY - origine.y;
    // Un défilement vertical franc ne doit jamais être pris pour un balayage.
    if (Math.abs(dx) < SEUIL_BALAYAGE || Math.abs(dx) < Math.abs(dy) * 2) return;

    router.push(`/suivi?mois=${shiftPeriode(periode, dx < 0 ? 1 : -1)}`, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <header className="suivi-safe-top sticky top-0 z-30 border-b border-border bg-background/95 px-3 pb-2 pt-2 backdrop-blur">
        <NavigationMois periode={periode} />

        <div className="mt-2 flex items-center gap-2">
          <div className="flex gap-1 rounded-full bg-secondary p-1">
            {ONGLETS.map((onglet) => (
              <button
                key={onglet.cle}
                type="button"
                onClick={() => setFiltre(onglet.cle)}
                aria-pressed={filtre === onglet.cle}
                className={cn(
                  "suivi-tap h-9 rounded-full px-3 text-sm font-semibold",
                  filtre === onglet.cle
                    ? "bg-card text-foreground shadow-sm"
                    : "text-[var(--suivi-gris)]"
                )}
              >
                {onglet.libelle}
              </button>
            ))}
          </div>

          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-[var(--suivi-gris)]"
              aria-hidden
            />
            <input
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Nom ou box"
              aria-label="Rechercher un locataire ou un box"
              className="h-9 w-full rounded-full border border-input bg-card pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      </header>

      {modeDemo && (
        <p className="border-b border-[var(--suivi-orange)]/30 bg-[var(--suivi-orange)]/10 px-4 py-2 text-sm font-medium text-[var(--suivi-orange)]">
          Mode démo — les règlements pointés ne sont pas enregistrés en base.
        </p>
      )}

      <ul
        className="suivi-scroll"
        onTouchStart={surDebutTouche}
        onTouchEnd={surFinTouche}
      >
        {affichees.map((ligne) => (
          <LigneLocataire
            key={ligne.contrat_id}
            ligne={ligne}
            periode={periode}
            onBascule={() => bascule(ligne)}
            onAppuiLong={() => setLigneEnSaisie(ligne)}
          />
        ))}

        {affichees.length === 0 && (
          <li className="px-4 py-12 text-center text-base text-[var(--suivi-gris)]">
            {recherche
              ? `Aucun locataire ne correspond à « ${recherche} ».`
              : filtre === "regles"
                ? "Aucun règlement pointé sur ce mois."
                : "Tout est réglé sur ce mois."}
          </li>
        )}
      </ul>

      <BarreTotaux totaux={totaux} />

      <FeuilleEncaissement
        ligne={ligneEnSaisie}
        periode={periode}
        onFermer={() => setLigneEnSaisie(null)}
        onValider={(saisie) => {
          if (ligneEnSaisie) enregistreDetail(ligneEnSaisie, saisie);
        }}
      />
    </div>
  );
}
