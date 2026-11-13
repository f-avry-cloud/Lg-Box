// Données structurées (schema.org) : ce que Google, Bing et les assistants IA
// lisent pour répondre « combien coûte un box à Quimper » sans deviner.

import { SITE } from "@/lib/site/config";
import type { Question } from "@/lib/site/faq";
import { formatSurface, type Offre } from "@/lib/site/offre";
import { photo } from "@/lib/site/photos";

function absolu(src: string): string {
  return src.startsWith("http") ? src : SITE.url + src;
}

export function schemaEtablissement(offre: Offre) {
  return {
    "@context": "https://schema.org",
    "@type": "SelfStorage",
    "@id": `${SITE.url}/#etablissement`,
    name: SITE.nom,
    legalName: SITE.raisonSociale,
    description:
      "Location de box de stockage et garde-meubles en dur, de 2 à 20 m², à Guengat près de Quimper. Accès 24h/24 et 7j/7, vidéosurveillance, sans caution ni bail.",
    url: SITE.url,
    telephone: SITE.telephoneE164,
    email: SITE.email,
    logo: `${SITE.url}/logo/lg-box-fond-blanc.png`,
    image: [absolu(photo("album01").src), absolu(photo("album04").src)],
    foundingDate: String(SITE.anneeCreation),
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.adresse.rue,
      postalCode: SITE.adresse.codePostal,
      addressLocality: SITE.adresse.ville,
      addressRegion: SITE.adresse.region,
      addressCountry: "FR",
    },
    areaServed: SITE.villesDesservies.map((v) => ({ "@type": "City", name: v.nom })),
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
      ],
      opens: "00:00",
      closes: "23:59",
    },
    ...(offre.prixMin !== null && offre.prixMax !== null
      ? { priceRange: `${offre.prixMin} € – ${offre.prixMax} € par mois` }
      : {}),
    currenciesAccepted: "EUR",
    amenityFeature: [
      "Accès 24h/24 et 7j/7",
      `Vidéosurveillance (${SITE.cameras} caméras)`,
      "Alarme et détection incendie",
      "Étagères dans chaque box",
      "Chariot et diable prêtés",
      "Grand parking de déchargement",
    ].map((name) => ({ "@type": "LocationFeatureSpecification", name, value: true })),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Location de box de stockage",
      itemListElement: offre.lignes.map((l) => ({
        "@type": "Offer",
        name: `Box de ${formatSurface(l.surface)} ${
          l.niveau === "etage" ? "à l'étage" : "au rez-de-chaussée"
        }`,
        price: l.prix,
        priceCurrency: "EUR",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: l.prix,
          priceCurrency: "EUR",
          unitCode: "MON",
          billingDuration: 1,
        },
        ...(l.etat === "inconnu"
          ? {}
          : {
              availability:
                l.etat === "libre" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
            }),
        url: `${SITE.url}/tarifs`,
      })),
    },
  };
}

export function schemaFaq(liste: Question[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: liste.map(({ q, r }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: r },
    })),
  };
}

export function schemaFil(etapes: Array<{ nom: string; chemin: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ nom: "Accueil", chemin: "/" }, ...etapes].map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: e.nom,
      item: SITE.url + (e.chemin === "/" ? "" : e.chemin),
    })),
  };
}
