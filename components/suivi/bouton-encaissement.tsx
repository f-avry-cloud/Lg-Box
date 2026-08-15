"use client";

import { useCallback, useEffect, useRef } from "react";
import { Check, Circle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ReglementStatut } from "@/lib/suivi/types";

const DUREE_APPUI_LONG = 450;

/**
 * Le bouton d'encaissement : 56×56 px (au-delà du minimum de 44), séparé de la
 * zone cliquable de la ligne.
 *
 * Tap = bascule payé/non payé. Appui long = feuille de saisie détaillée.
 * Les deux gestes partagent le même pointeur, d'où la mécanique ci-dessous :
 * un minuteur armé à la pression, désarmé au relâchement. Si le minuteur a
 * déjà tiré, le relâchement ne doit surtout pas basculer le statut par-dessus.
 */
export function BoutonEncaissement({
  statut,
  montantEncaisse,
  onBascule,
  onAppuiLong,
  libelle,
}: {
  statut: ReglementStatut;
  montantEncaisse: number;
  onBascule: () => void;
  onAppuiLong: () => void;
  libelle: string;
}) {
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appuiLongDeclenche = useRef(false);

  const annule = useCallback(() => {
    if (minuteur.current) {
      clearTimeout(minuteur.current);
      minuteur.current = null;
    }
  }, []);

  useEffect(() => annule, [annule]);

  const surPression = () => {
    appuiLongDeclenche.current = false;
    annule();
    minuteur.current = setTimeout(() => {
      appuiLongDeclenche.current = true;
      vibre(15);
      onAppuiLong();
    }, DUREE_APPUI_LONG);
  };

  const surRelachement = () => {
    annule();
    if (appuiLongDeclenche.current) return;
    onBascule();
  };

  const paye = statut === "paye";
  const partiel = statut === "partiel";

  return (
    <button
      type="button"
      aria-label={libelle}
      aria-pressed={paye}
      onPointerDown={surPression}
      onPointerUp={surRelachement}
      onPointerLeave={annule}
      onPointerCancel={annule}
      // Le menu contextuel iOS s'ouvre sur appui long et volerait le geste.
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "suivi-tap flex h-14 min-w-14 shrink-0 items-center justify-center gap-1 rounded-full border-2 px-2 text-sm font-semibold transition-colors",
        paye && "border-[var(--suivi-vert)] bg-[var(--suivi-vert)] text-white",
        partiel && "border-[var(--suivi-orange)] bg-background text-[var(--suivi-orange)]",
        !paye && !partiel && "border-[var(--suivi-gris)]/45 bg-background text-[var(--suivi-gris)]"
      )}
    >
      {paye ? (
        <Check className="size-7" strokeWidth={3} />
      ) : partiel ? (
        <span className="tabular-nums">{montantEncaisse} €</span>
      ) : (
        <Circle className="size-6" strokeWidth={2} />
      )}
    </button>
  );
}

/** Retour haptique léger, silencieux là où l'API n'existe pas (iOS Safari). */
export function vibre(duree = 12): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(duree);
  }
}
