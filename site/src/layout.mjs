/* =========================================================================
   Gabarits et composants : chaque fonction rend une chaîne HTML.
   ========================================================================= */
import { site, nav, navSecondaire, photos } from "./content.mjs";

/* ---------- Utilitaires ---------- */
export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

let rid = 0;
const delay = () => `style="--i:${rid++ % 6}"`;
export const resetDelay = () => (rid = 0);

/* ---------- Pictogrammes (tracés inline, aucune requête réseau) ---------- */
export const icons = {
  shield: '<path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8-8"/><path d="m17 6 2 2"/><path d="m14 9 2 2"/>',
  camera: '<path d="M14.5 4h-5L8 7H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-4l-1.5-3Z"/><circle cx="12" cy="13" r="3.5"/>',
  box: '<path d="M3 8 12 3l9 5v8l-9 5-9-5V8Z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/>',
  free: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/><path d="M12 8v8"/>',
  truck: '<path d="M2 7h11v9H2z"/><path d="M13 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  phone: '<path d="M6 3h3l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3Z"/>',
  mail: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  pin: '<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
};

export const ico = (name, cls = "") =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;

/* ---------- Photo (avec repli élégant si le fichier n’est pas déposé) ---------- */
export const shot = (key, mod = "") => {
  const p = photos[key];
  return `<figure class="shot ${mod} reveal" ${delay()}>
      <img src="images/${p.file}" alt="${esc(p.alt)}" loading="lazy" decoding="async" width="1200" height="900">
      <figcaption>${esc(p.legende)}</figcaption>
    </figure>`;
};

/* ---------- Tête de document ---------- */
const jsonLd = (page) => {
  const business = {
    "@context": "https://schema.org",
    "@type": "SelfStorage",
    "@id": `${site.origin}/#lgbox`,
    name: site.nom,
    description:
      "Location de box de stockage et garde-meubles à Guengat, à 10 minutes de Quimper : 65 box de 2 m² à 20 m², accès 24h/24, bâtiment sécurisé et sans humidité.",
    url: `${site.origin}/`,
    telephone: site.tel,
    email: site.email,
    priceRange: `${site.prixMin}€ - ${site.prixMax}€`,
    address: {
      "@type": "PostalAddress",
      streetAddress: site.adresse,
      postalCode: site.cp,
      addressLocality: site.ville,
      addressRegion: "Bretagne",
      addressCountry: "FR",
    },
    geo: { "@type": "GeoCoordinates", latitude: site.lat, longitude: site.lon },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "00:00",
      closes: "23:59",
    },
    areaServed: ["Quimper", "Douarnenez", "Guengat", "Pluguffan", "Plonéis", "Finistère sud"],
  };

  const blocks = [business];

  if (page.faq) {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.r },
      })),
    });
  }

  if (page.url !== "index.html") {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: `${site.origin}/` },
        { "@type": "ListItem", position: 2, name: page.h1 || page.titreCourt, item: `${site.origin}/${page.url}` },
      ],
    });
  }

  return blocks
    .map((b) => `<script type="application/ld+json">${JSON.stringify(b)}</script>`)
    .join("\n  ");
};

export const head = (page) => `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(page.title)}</title>
  <meta name="description" content="${esc(page.description)}">
  <link rel="canonical" href="${site.origin}/${page.url === "index.html" ? "" : page.url}">
  <meta name="theme-color" content="#0a1a2b">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${site.nom}">
  <meta property="og:locale" content="fr_FR">
  <meta property="og:title" content="${esc(page.title)}">
  <meta property="og:description" content="${esc(page.description)}">
  <meta property="og:url" content="${site.origin}/${page.url === "index.html" ? "" : page.url}">
  <meta property="og:image" content="${site.origin}/images/${photos.batiment.file}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="geo.placename" content="${site.ville}">
  <meta name="geo.position" content="${site.lat};${site.lon}">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Inter:wght@400;500;600;700&display=swap">
  <link rel="stylesheet" href="assets/style.css">
  <script src="assets/app.js" defer></script>
  ${jsonLd(page)}
</head>
<body>
<a class="skip" href="#contenu">Aller au contenu</a>`;

/* ---------- En-tête ---------- */
const logo = (cls = "") => `<a class="logo ${cls}" href="index.html" aria-label="${site.nom}, accueil">
      <span class="logo__mark">${ico("box")}</span>
      <span>
        <span class="logo__txt">LG <span>BOX</span></span>
        <span class="logo__sub">Guengat · Quimper</span>
      </span>
    </a>`;

export const header = (page) => `
<header class="hdr">
  <div class="wrap hdr__in">
    ${logo()}
    <button class="burger" aria-expanded="false" aria-controls="menu" aria-label="Ouvrir le menu"><span></span></button>
    <nav class="nav" id="menu" aria-label="Navigation principale">
      ${nav
        .map(
          (n) =>
            `<a href="${n.url}"${n.url === page.url ? ' aria-current="page"' : ""}>${esc(n.court)}</a>`
        )
        .join("\n      ")}
    </nav>
    <a class="btn btn--sun hdr__cta" href="${site.telHref}">${ico("phone")} ${site.tel}</a>
  </div>
</header>`;

/* ---------- Pied de page ---------- */
export const footer = () => `
<footer class="ftr">
  <div class="wrap">
    <div class="ftr__grid">
      <div class="ftr__brand">
        ${logo()}
        <p style="margin-top:16px;max-width:36ch">Près de ${site.nbBox} box de 2 m² à 20 m² sur l’ancienne base de la Marine nationale, à 10 minutes de Quimper. Sain, sec, sécurisé, sans engagement.</p>
      </div>
      <div>
        <h4>Le centre</h4>
        <ul>
          ${nav.slice(1).map((n) => `<li><a href="${n.url}">${esc(n.titre)}</a></li>`).join("\n          ")}
        </ul>
      </div>
      <div>
        <h4>Nous joindre</h4>
        <ul>
          <li><a href="${site.telHref}">${site.tel}</a></li>
          <li><a href="mailto:${site.email}">${site.email}</a></li>
          <li>${site.adresse}<br>${site.cp} ${site.ville}</li>
          <li>Accès 24h/24 · 7j/7</li>
        </ul>
      </div>
    </div>
    <div class="ftr__bottom">
      <span>© <span data-year>2026</span> ${site.entite} — tous droits réservés.</span>
      <span>${navSecondaire.map((n) => `<a href="${n.url}">${esc(n.court)}</a>`).join(" · ")}</span>
    </div>
  </div>
</footer>

<div class="dock">
  <a class="btn btn--sun" href="${site.telHref}">${ico("phone")} Appeler</a>
  <a class="btn btn--sea" href="mailto:${site.email}">${ico("mail")} Écrire</a>
</div>
</body>
</html>`;

/* ---------- Blocs réutilisables ---------- */
export const marquee = (items) => `
<div class="marquee" aria-hidden="true">
  <div class="marquee__track">
    ${[...items, ...items].map((t) => `<span>${esc(t)}</span>`).join("")}
  </div>
</div>`;

export const pageHero = ({ h1, lede, tag }) => `
<section class="hero">
  <div class="wrap">
    ${tag ? `<p class="tag reveal"><span class="pulse"></span> ${tag}</p>` : ""}
    <h1 class="reveal" ${delay()}>${h1}</h1>
    <p class="lede reveal" ${delay()}>${lede}</p>
    <div class="btn-row reveal" ${delay()} style="margin-top:34px">
      <a class="btn btn--sun" href="${site.telHref}">${ico("phone")} ${site.tel}</a>
      <a class="btn btn--ghost" href="location-box-quimper-contact.html">Demander un box ${ico("arrow")}</a>
    </div>
  </div>
</section>`;

export const cta = (titre, texte) => `
<section class="section">
  <div class="wrap">
    <div class="cta reveal">
      <h2>${titre}</h2>
      <p>${texte}</p>
      <div class="btn-row">
        <a class="btn btn--sun" href="${site.telHref}">${ico("phone")} ${site.tel}</a>
        <a class="btn btn--ghost" href="mailto:${site.email}">${ico("mail")} ${site.email}</a>
      </div>
      <div class="cta__facts">
        <span>${ico("pin", "sr-ico")} ${site.adresse}, ${site.cp} ${site.ville}</span>
        <span>À 10 min de Quimper · 15 min de Douarnenez</span>
        <span>Accès 24h/24, 7j/7</span>
      </div>
    </div>
  </div>
</section>`;

export const avisRail = (avis) => `
    <div class="rail">
      ${avis
        .map(
          (a) => `<blockquote class="quote reveal" ${delay()}>
        <div class="stars" aria-label="5 étoiles sur 5">★★★★★</div>
        <p>« ${esc(a.texte)} »</p>
        <footer>— ${esc(a.auteur)}</footer>
      </blockquote>`
        )
        .join("\n      ")}
    </div>`;

export const faqList = (items) => `
    <div class="faq">
      ${items
        .map(
          (f) => `<details class="qa reveal" ${delay()}>
        <summary>${esc(f.q)}</summary>
        <div class="qa__body"><p>${esc(f.r)}</p></div>
      </details>`
        )
        .join("\n      ")}
    </div>`;
