import type { ReactNode } from "react";

import { lienPageContact, type Demande } from "@/lib/site/contact";

/**
 * Bouton « Réserver ». Un lien ordinaire vers la page de contact, que
 * `FenetreReserver` transforme en fenêtre à trois choix (appel, SMS, e-mail).
 */
export function BoutonReserver({
  children = "Réserver un box",
  variante,
  petit,
  ...demande
}: Demande & { children?: ReactNode; variante?: "calme" | "marine"; petit?: boolean }) {
  const classes = ["s-bouton", variante && `s-bouton--${variante}`, petit && "s-bouton--petit"]
    .filter(Boolean)
    .join(" ");
  return (
    <a
      className={classes}
      href={lienPageContact(demande)}
      data-reserver=""
      data-surface={demande.surface ?? undefined}
      data-niveau={demande.niveau ?? undefined}
      data-mode={demande.mode ?? undefined}
    >
      {children}
    </a>
  );
}
