import type { Metadata, Viewport } from "next";

import { BarreOnglets } from "@/components/suivi/barre-onglets";

import "./suivi.css";

// PWA installable sur l'écran d'accueil iOS. Le manifeste est servi par une
// route dédiée (app/suivi/manifest.webmanifest/route.ts) plutôt que par le
// fichier app/manifest.ts : celui-ci vaudrait pour tout le site, alors que
// c'est bien l'app compagnon — et elle seule — qui doit s'installer avec
// /suivi comme point de départ.
export const metadata: Metadata = {
  title: "LG BOX — Mobile",
  description: "Gestion LG BOX au format téléphone : tableau de bord, box, règlements.",
  manifest: "/suivi/manifest.webmanifest",
  // Sans cette déclaration, iOS pose une capture de la page sur l'écran
  // d'accueil au lieu d'une icône : le manifeste ne suffit pas, Safari lit
  // `apple-touch-icon` et rien d'autre. Les fichiers existaient déjà mais
  // n'étaient référencés nulle part.
  icons: {
    icon: [
      { url: "/suivi/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/suivi/icone-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/suivi/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "LG BOX",
    statusBarStyle: "default",
  },
  // Un carnet d'encaissement n'a rien à faire dans un index de moteur de
  // recherche, même derrière une authentification.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#12909f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // L'app se pilote au pouce : un double-tap qui zoome au lieu de valider un
  // encaissement est une erreur de saisie, pas une fonctionnalité.
  userScalable: false,
  // Indispensable pour que env(safe-area-inset-*) renvoie autre chose que 0
  // sur les iPhone à encoche.
  viewportFit: "cover",
};

export default function SuiviLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="suivi-app">
      {children}
      <BarreOnglets />
    </div>
  );
}
