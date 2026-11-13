import type { NextConfig } from "next";

// Les adresses de l'ancien site lg-box.fr, redirigées une à une vers leur
// nouvelle page : les positions acquises dans Google et les liens entrants
// suivent, au lieu de tomber sur une erreur 404.
const ANCIENNES_ADRESSES: Array<[string, string]> = [
  ["/index.html", "/"],
  ["/garde-meuble-quimper-finistere-sud.html", "/garde-meuble-quimper"],
  ["/garde-meuble-box-stockage-douarnenez.html", "/garde-meuble-quimper"],
  ["/location-box-quimper-finistere.html", "/box-stockage"],
  ["/location-box-pas-cher-quimper-29.html", "/tarifs"],
  ["/location-box-quimper-adresse.html", "/contact"],
  ["/location-box-quimper-contact.html", "/contact"],
  ["/faq.html", "/faq"],
  ["/garde-meubles-quimper-avis.html", "/"],
  ["/location-box-quimper-plan-site.html", "/"],
  ["/location-box-quimper-mentions.html", "/mentions-legales"],
];

const nextConfig: NextConfig = {
  images: {
    // Photos servies depuis l'ancien site tant qu'elles ne sont pas dans
    // public/photos/ (voir lib/site/photos.ts).
    remotePatterns: [new URL("https://lg-box.fr/wa_images/**"), new URL("https://lg-box.fr/wa_p_albums/**")],
  },
  async redirects() {
    return ANCIENNES_ADRESSES.map(([source, destination]) => ({
      source,
      destination,
      permanent: true,
    }));
  },
};

export default nextConfig;
