// Les trois façons de joindre le centre depuis un bouton « Réserver » : appel,
// SMS, e-mail. Le SMS et l'e-mail partent pré-remplis avec la surface choisie,
// pour que la demande soit exploitable sans échange supplémentaire.

import { LIBELLE_NIVEAU, SITE, type Niveau } from "@/lib/site/config";

export type Demande = {
  /** Surface en m², absente pour une demande générale. */
  surface?: string | null;
  niveau?: Niveau | null;
  /** `prevenir` : la taille est complète, on s'inscrit pour la suivante. */
  mode?: "reserver" | "prevenir";
};

function designation({ surface, niveau }: Demande): string | null {
  if (!surface) return null;
  const s = surface.replace(".", ",");
  return niveau ? `${s} m² (${LIBELLE_NIVEAU[niveau].toLowerCase()})` : `${s} m²`;
}

export function titreDemande(d: Demande): string {
  const box = designation(d);
  if (d.mode === "prevenir") {
    return box ? `Être prévenu pour un box de ${box}` : "Être prévenu dès qu'un box se libère";
  }
  return box ? `Réserver un box de ${box}` : "Réserver un box";
}

export function messageDemande(d: Demande): string {
  const box = designation(d);
  if (d.mode === "prevenir") {
    return `Bonjour, je souhaite être prévenu(e) dès qu'un box${box ? ` de ${box}` : ""} se libère chez LG BOX. Mon nom : `;
  }
  return box
    ? `Bonjour, je souhaite réserver un box de ${box} chez LG BOX. Mon nom : `
    : "Bonjour, je souhaite réserver un box chez LG BOX. Surface recherchée : … Mon nom : ";
}

export function liensDemande(d: Demande) {
  const message = messageDemande(d);
  return {
    appel: `tel:${SITE.telephoneE164}`,
    // « ?&body= » : la seule écriture comprise à la fois par iOS et Android.
    sms: `sms:${SITE.telephoneE164}?&body=${encodeURIComponent(message)}`,
    email: `mailto:${SITE.email}?subject=${encodeURIComponent(
      `${titreDemande(d)} — LG BOX`
    )}&body=${encodeURIComponent(message)}`,
  };
}

/** Lien de repli, utilisé quand JavaScript ne s'exécute pas. */
export function lienPageContact(d: Demande): string {
  const p = new URLSearchParams();
  if (d.surface) p.set("surface", d.surface);
  if (d.niveau) p.set("niveau", d.niveau);
  if (d.mode === "prevenir") p.set("mode", "prevenir");
  const q = p.toString();
  return `/contact${q ? `?${q}` : ""}#reserver`;
}
