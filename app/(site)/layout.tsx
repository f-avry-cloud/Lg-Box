import type { Metadata, Viewport } from "next";

import "@fontsource-variable/archivo/wdth.css";
import "./site.css";

import { BarreMobile, Entete, Pied } from "@/components/site/entete";
import { FenetreReserver } from "@/components/site/reserver";
import { SITE } from "@/lib/site/config";
import { photo } from "@/lib/site/photos";

// Les aperçus Vercel (une URL par branche) ne doivent pas être indexés : seul
// le site en production l'est.
const indexable = process.env.VERCEL_ENV !== "preview";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Location de box et garde-meubles à Quimper (Guengat) | LG BOX",
    template: "%s | LG BOX",
  },
  description:
    "Box de stockage en dur de 2 à 20 m² à Guengat, à 10 minutes de Quimper. Accès 24h/24, vidéosurveillance, sans caution ni bail. Tarifs et disponibilités à jour.",
  applicationName: SITE.nom,
  robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: SITE.nom,
    url: SITE.url,
    images: [{ url: photo("accueil").src, alt: photo("accueil").alt }],
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: true, address: true, email: true },
  other: {
    "geo.region": "FR-29",
    "geo.placename": "Guengat",
  },
};

export const viewport: Viewport = {
  themeColor: "#10243a",
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      <a className="s-evitement" href="#contenu">
        Aller au contenu
      </a>
      <Entete />
      <main id="contenu">{children}</main>
      <Pied />
      <BarreMobile />
      <FenetreReserver />
    </div>
  );
}
