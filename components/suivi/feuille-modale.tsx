"use client";

import { useEffect } from "react";

import { cn } from "@/lib/utils";

/**
 * Feuille modale montant du bas. Remplace les menus déroulants natifs et les
 * boîtes de dialogue centrées : sur un téléphone tenu d'une main, le bas de
 * l'écran est la seule zone atteignable au pouce.
 */
export function FeuilleModale({
  ouverte,
  titre,
  onFermer,
  children,
  className,
}: {
  ouverte: boolean;
  titre: string;
  onFermer: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  // Bloque le défilement de la liste derrière la feuille, sinon le pouce
  // fait bouger le fond au lieu d'agir dans le formulaire.
  useEffect(() => {
    if (!ouverte) return;
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = precedent;
    };
  }, [ouverte]);

  useEffect(() => {
    if (!ouverte) return;
    const surEchap = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    window.addEventListener("keydown", surEchap);
    return () => window.removeEventListener("keydown", surEchap);
  }, [ouverte, onFermer]);

  if (!ouverte) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-black/40"
        onClick={onFermer}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        className={cn(
          "suivi-feuille suivi-safe-bottom relative max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-card px-4 pb-4 pt-3 shadow-2xl",
          className
        )}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" aria-hidden />
        <h2 className="mb-3 text-base font-semibold text-foreground">{titre}</h2>
        {children}
      </div>
    </div>
  );
}
