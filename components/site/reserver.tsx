"use client";

import { useEffect, useRef, useState } from "react";

import { Canaux } from "@/components/site/canaux";
import { titreDemande, type Demande } from "@/lib/site/contact";
import type { Niveau } from "@/lib/site/config";

/**
 * La fenêtre « Réserver », montée une seule fois pour tout le site.
 *
 * Les boutons sont de simples liens vers /contact, rendus côté serveur et
 * marqués `data-reserver` : sans JavaScript ils mènent à la page de contact,
 * avec lui ce composant intercepte le clic et ouvre la fenêtre sur place.
 */
export function FenetreReserver() {
  const ref = useRef<HTMLDialogElement>(null);
  const [demande, setDemande] = useState<Demande>({});

  useEffect(() => {
    function surClic(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const lien = (e.target as Element | null)?.closest<HTMLElement>("[data-reserver]");
      if (!lien || !ref.current) return;
      e.preventDefault();
      setDemande({
        surface: lien.dataset.surface || null,
        niveau: (lien.dataset.niveau as Niveau | undefined) || null,
        mode: lien.dataset.mode === "prevenir" ? "prevenir" : "reserver",
      });
      ref.current.showModal();
    }
    document.addEventListener("click", surClic);
    return () => document.removeEventListener("click", surClic);
  }, []);

  return (
    <dialog
      ref={ref}
      className="s-fenetre"
      aria-labelledby="s-fenetre-titre"
      onClick={(e) => {
        // Un clic sur le voile (l'élément <dialog> lui-même) ferme la fenêtre.
        if (e.target === ref.current) ref.current?.close();
      }}
    >
      <div className="s-fenetre__tete">
        <div>
          <h2 id="s-fenetre-titre">{titreDemande(demande)}</h2>
          <p>
            {demande.mode === "prevenir"
              ? "Cette surface est prise. Laissez-nous un mot : vous serez le premier averti."
              : "Choisissez le moyen qui vous arrange. Sans paiement en ligne."}
          </p>
        </div>
        <form method="dialog">
          <button className="s-fenetre__fermer" aria-label="Fermer">
            ×
          </button>
        </form>
      </div>
      <div className="s-fenetre__corps">
        <Canaux demande={demande} />
        <p>
          Vous préférez un formulaire ?{" "}
          <a href="/contact#demande" style={{ textDecoration: "underline" }}>
            Laisser une demande écrite
          </a>
        </p>
      </div>
    </dialog>
  );
}
