import type { MetadataRoute } from "next";

/**
 * Manifeste de l'app compagnon. Servi ici plutôt que par app/manifest.ts pour
 * que `start_url` pointe sur /suivi : l'icône posée sur l'écran d'accueil doit
 * ouvrir le carnet d'encaissement, pas la page vitrine du site.
 */
const manifest: MetadataRoute.Manifest = {
  name: "LG BOX — Règlements",
  short_name: "Règlements",
  description: "Pointage des loyers encaissés, mois par mois.",
  start_url: "/suivi",
  scope: "/suivi",
  display: "standalone",
  orientation: "portrait",
  background_color: "#f7f4ee",
  theme_color: "#12909f",
  lang: "fr",
  dir: "ltr",
  icons: [
    { src: "/suivi/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/suivi/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/suivi/icone-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};

export function GET() {
  return Response.json(manifest, {
    headers: { "content-type": "application/manifest+json" },
  });
}
