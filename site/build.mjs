/* =========================================================================
   Générateur du site public LG BOX.
   Aucune dépendance : `node build.mjs` écrit des pages HTML statiques dans
   site/dist/, prêtes à être déposées telles quelles sur un hébergement.
   ========================================================================= */
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  site, chiffres, bandeau, atouts, surfaces, tarifsVedette,
  etapes, avis, faq, photos, nav, navSecondaire,
} from "./src/content.mjs";
import {
  head, header, footer, marquee, pageHero, cta, avisRail, faqList,
  shot, ico, esc, resetDelay,
} from "./src/layout.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "dist");

/* =======================================================================
   Blocs propres à l’accueil
   ======================================================================= */

const heroAccueil = () => `
<section class="hero">
  <div class="wrap hero__grid">
    <div>
      <p class="tag reveal"><span class="pulse"></span> <b>Box disponibles</b> — appelez, on visite aujourd’hui</p>
      <h1 class="reveal"><span class="w">Vos affaires</span> <span class="w">méritent</span> <span class="w">mieux</span> <span class="w">qu’un</span> <span class="w">garage</span> <span class="w">humide.</span></h1>
      <p class="hero__lede reveal">Location de <strong>box de stockage et garde-meubles</strong> à Guengat, à 10 minutes de Quimper. Près de ${site.nbBox} box de 2 m² à 20 m² dans un bâtiment en dur, sec et sous vidéosurveillance — avec vos clés, 24h/24.</p>
      <div class="btn-row reveal">
        <a class="btn btn--sun" href="${site.telHref}">${ico("phone")} ${site.tel}</a>
        <a class="btn btn--ghost" href="#surface">Quelle surface me faut-il ? ${ico("arrow")}</a>
      </div>
      <div class="hero__proof reveal">
        ${chiffres
          .map(
            (c) => `<div>
          <b${c.fixe ? "" : ` data-count="${c.valeur}" data-suffix="${esc(c.suffixe)}"`}>${c.valeur}${esc(c.suffixe)}</b>
          <span>${esc(c.label)}</span>
        </div>`
          )
          .join("\n        ")}
      </div>
    </div>

    <div class="reveal">
      <div class="wall" aria-hidden="true">
        <div class="wall__grid">
          ${Array.from({ length: 9 }, (_, i) => {
            const n = String(i + 1).padStart(2, "0");
            const open = [1, 4, 6, 8].includes(i);
            return `<div class="door" data-n="${n}">${open ? '<span class="door__open">LIBRE</span>' : ""}</div>`;
          }).join("\n          ")}
        </div>
        <div class="wall__badge">Dès 45 €/mois<small>2 m², sans engagement</small></div>
      </div>
    </div>
  </div>
</section>`;

const blocAtouts = () => `
<section class="section section--paper" id="atouts">
  <div class="wrap">
    <div class="head">
      <p class="eyebrow reveal">Pourquoi LG BOX</p>
      <h2 class="reveal">Un ancien bâtiment de la Marine, <br>recyclé en centre de stockage.</h2>
      <p class="lede reveal">Ici, un box n’est pas un container posé sur un parking : c’est un ancien appartement militaire, en dur, à double paroi. C’est toute la différence quand vos cartons y passent l’hiver.</p>
    </div>
    <div class="cards">
      ${atouts
        .map(
          (a, i) => `<article class="card reveal" style="--i:${i % 3}">
        <span class="ico">${ico(a.ico)}</span>
        <h3>${esc(a.titre)}</h3>
        <p>${esc(a.texte)}</p>
      </article>`
        )
        .join("\n      ")}
    </div>
  </div>
</section>`;

const blocSurface = () => `
<section class="section" id="surface">
  <div class="wrap">
    <div class="head">
      <p class="eyebrow reveal">Le bon format</p>
      <h2 class="reveal">Combien de mètres carrés vous faut-il ?</h2>
      <p class="lede reveal">Faites glisser le curseur : on vous dit ce qui rentre, et ce que ça coûte à peu près. Et si vous hésitez entre deux tailles, un appel tranche en deux minutes.</p>
    </div>

    <div class="sizer reveal" data-sizer="${esc(JSON.stringify(surfaces))}">
      <div>
        <div class="sizer__val" data-sizer-val>2<sup>m²</sup></div>
        <div class="sizer__price" data-sizer-price>≈ 45 €/mois
          <small>Estimation d’après la grille publique ${site.prixMin} € → ${site.prixMax} € TTC/mois. Le tarif exact dépend du rez-de-chaussée (plain-pied) ou de l’étage (escalier) — confirmé en deux minutes par téléphone.</small>
        </div>
        <label class="sr" for="surface-range">Surface du box en mètres carrés</label>
        <input id="surface-range" type="range" min="0" max="${surfaces.length - 1}" step="1" value="0" style="--pct:0%">
        <div class="scale"><span>2 m²</span><span>9 m²</span><span>20 m²</span></div>
        <div class="sizer__fits" data-sizer-fits></div>
      </div>
      <div class="room">
        <div class="room__box" style="--w:26%"><span>2 m²</span></div>
        <div class="room__h">hauteur ${site.hauteur}</div>
      </div>
    </div>
  </div>
</section>`;

const blocTarifs = () => `
<section class="section section--paper" id="tarifs">
  <div class="wrap">
    <div class="head">
      <p class="eyebrow reveal">Tarifs</p>
      <h2 class="reveal">De 45 € à 200 € par mois, tout compris.</h2>
      <p class="lede reveal">Deux grilles : <strong>rez-de-chaussée</strong>, accès de plain-pied, et <strong>étage</strong>, accès par escalier et un peu moins cher à surface égale. Ni caution, ni frais de dossier, ni durée minimale.</p>
    </div>
    <div class="grid-price">
      ${surfaces
        .map(
          (s, i) => `<div class="price reveal ${s.m2 === tarifsVedette ? "price--star" : ""}" style="--i:${i % 4}">
        <b>${s.m2} m²</b>
        <i>${esc(s.fits[0])}</i>
        <em>≈ ${s.prix} €/mois</em>
      </div>`
        )
        .join("\n      ")}
    </div>
    <p class="lede reveal" style="margin-top:22px;font-size:.92rem">Estimations TTC d’après la grille publique 45 € → 200 € par mois ; le tarif exact de chaque box vous est donné au téléphone, selon l’étage et la surface réellement disponible.</p>
  </div>
</section>`;

const blocPhotos = () => `
<section class="section">
  <div class="wrap">
    <div class="head">
      <p class="eyebrow reveal">Le centre en images</p>
      <h2 class="reveal">Regardez avant de venir. <br>Puis venez quand même.</h2>
    </div>
    <div class="gallery">
      ${shot("batiment", "shot--wide")}
      ${shot("couloir")}
      ${shot("interieur")}
      ${shot("volet")}
      ${shot("parking", "shot--wide")}
    </div>
  </div>
</section>`;

const blocEtapes = () => `
<section class="section section--ink">
  <div class="wrap">
    <div class="head">
      <p class="eyebrow reveal">Comment ça se passe</p>
      <h2 class="reveal">Quatre étapes, zéro paperasse inutile.</h2>
    </div>
    <div class="steps">
      ${etapes
        .map(
          (e, i) => `<div class="step reveal" style="--i:${i}">
        <h3>${esc(e.titre)}</h3>
        <p>${esc(e.texte)}</p>
      </div>`
        )
        .join("\n      ")}
    </div>
  </div>
</section>`;

const blocAvis = (extrait = true) => `
<section class="section section--paper">
  <div class="wrap">
    <div class="head">
      <p class="eyebrow reveal">Avis clients</p>
      <h2 class="reveal">« Je suis restée 3 ans et je recommande à 100 %. »</h2>
      <p class="lede reveal">Ce que disent les locataires, particuliers comme professionnels, du centre de Guengat.</p>
    </div>
    ${avisRail(avis)}
    ${extrait ? `<a class="btn btn--ghost reveal" href="garde-meubles-quimper-avis.html">Tous les avis ${ico("arrow")}</a>` : ""}
  </div>
</section>`;

const blocFaq = (items, extrait = true) => `
<section class="section" id="faq">
  <div class="wrap">
    <div class="head">
      <p class="eyebrow reveal">Questions fréquentes</p>
      <h2 class="reveal">Tout ce qu’on nous demande au téléphone.</h2>
    </div>
    ${faqList(items)}
    ${extrait ? `<a class="btn btn--ghost reveal" href="faq.html" style="margin-top:22px">Voir les ${faq.length} questions ${ico("arrow")}</a>` : ""}
  </div>
</section>`;

const carte = () => `
    <iframe class="map reveal" loading="lazy" title="Carte de situation de LG BOX à Guengat"
      src="https://www.openstreetmap.org/export/embed.html?bbox=${site.lon - 0.03}%2C${site.lat - 0.015}%2C${site.lon + 0.03}%2C${site.lat + 0.015}&amp;layer=mapnik&amp;marker=${site.lat}%2C${site.lon}"></iframe>`;

const contactCards = () => `
    <div class="contact-grid">
      <a class="contact-card reveal" href="${site.telHref}">
        <span class="ico">${ico("phone")}</span>
        <b>${site.tel}</b>
        <span>Le plus rapide : on vous dit tout de suite ce qui est libre.</span>
      </a>
      <a class="contact-card reveal" href="mailto:${site.email}">
        <span class="ico">${ico("mail")}</span>
        <b>${site.email}</b>
        <span>Décrivez votre besoin, on répond avec la surface et le tarif.</span>
      </a>
      <a class="contact-card reveal" href="https://www.google.com/maps/dir/?api=1&amp;destination=${site.mapsQuery}" rel="noopener">
        <span class="ico">${ico("pin")}</span>
        <b>${site.adresse}</b>
        <span>${site.cp} ${site.ville} — 10 min de Quimper, 15 min de Douarnenez.</span>
      </a>
      <div class="contact-card reveal">
        <span class="ico">${ico("clock")}</span>
        <b>24h/24, 7j/7</b>
        <span>Accès libre à votre box avec votre jeu de clés, jours fériés compris.</span>
      </div>
    </div>`;

/* =======================================================================
   Les pages
   ======================================================================= */

const pages = [
  /* ---------------------------------------------------------------- 1 */
  {
    url: "index.html",
    title: "LG BOX : location box garde meubles Quimper Finistère sud",
    description:
      "Location de box de stockage et garde-meubles à Guengat, 10 min de Quimper : 65 box de 2 m² à 20 m², dès 45 €/mois, accès 24h/24, bâtiment sécurisé, sain et sec.",
    h1: "Location de box à Guengat",
    body: () =>
      heroAccueil() +
      marquee(bandeau) +
      blocAtouts() +
      blocSurface() +
      blocTarifs() +
      blocPhotos() +
      blocEtapes() +
      blocAvis() +
      blocFaq(faq.slice(0, 6)) +
      cta(
        "Un box vous attend à 10 minutes de Quimper.",
        "Dites-nous ce que vous avez à ranger et pour combien de temps : on vous propose la bonne surface, au bon étage, au bon prix. Sans engagement de durée."
      ),
  },

  /* ---------------------------------------------------------------- 2 */
  {
    url: "location-box-quimper-finistere.html",
    title: "Location box garde meuble Quimper | Finistère sud : LG BOX",
    description:
      "Le centre LG BOX à Guengat : 65 box de 2 m² à 20 m², 3,20 m de hauteur, bâtiment fermé, 35 caméras, accès 24h/24 pour les particuliers et les professionnels du Finistère sud.",
    h1: "Le centre de stockage LG BOX, en Finistère sud",
    body: (p) =>
      pageHero({
        tag: "Guengat · Finistère sud",
        h1: "Un centre de stockage qui ressemble à un immeuble, pas à un entrepôt de containers.",
        lede:
          "LG BOX se situe sur la commune de Guengat, à 10 minutes de Quimper, ZA de Kergueff. Vous louez un box individuel de 2 m² à 20 m² et vous êtes libre de vos allers et venues : un jeu de clés vous permet d’accéder à votre espace locatif sécurisé 24h/24 et 7j/7.",
      }) +
      marquee(bandeau) +
      `
<section class="section section--paper">
  <div class="wrap">
    <div class="head">
      <p class="eyebrow reveal">L’histoire du lieu</p>
      <h2 class="reveal">Chaque box est un ancien appartement de militaire.</h2>
    </div>
    <div class="cards">
      <article class="card reveal"><span class="ico">${ico("shield")}</span><h3>Bâti pour durer</h3><p>L’entreprise LG BOX est installée sur l’ancienne base de Guengat. Les box loués sont d’anciens logements construits pour héberger le personnel de la Marine nationale : des murs en dur, à double paroi, qui ne transpirent pas.</p></article>
      <article class="card reveal"><span class="ico">${ico("box")}</span><h3>Près de 65 box</h3><p>De 2 m² à 20 m², avec ${site.hauteur} de hauteur sous plafond — une surface au sol qui se transforme vite en volume utile. Le tout dans un bâtiment fermé de compartiments, et non des containers posés sur un terrain.</p></article>
      <article class="card reveal"><span class="ico">${ico("camera")}</span><h3>Surveillé en continu</h3><p>${site.cameras} caméras extérieures et intérieures, télésurveillance contre les intrusions, détecteurs et alarme incendie. Le bâtiment est fermé : personne d’autre que les locataires n’y entre.</p></article>
      <article class="card reveal"><span class="ico">${ico("truck")}</span><h3>Pensé pour le déménagement</h3><p>Grand parking, accès facile pour les camions avec diables ou remorques porte-engins, matériel de manutention prêté aux clients comme aux déménageurs professionnels.</p></article>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="gallery">
      ${shot("couloir", "shot--wide")}
      ${shot("interieur")}
      ${shot("securite")}
      ${shot("manutention")}
      ${shot("volet")}
    </div>
  </div>
</section>` +
      blocSurface() +
      blocEtapes() +
      cta(
        "Venez voir le bâtiment, c’est le meilleur argument.",
        "Une visite prend dix minutes. Vous verrez la hauteur sous plafond, la propreté des couloirs et la largeur des portes — et vous saurez tout de suite si c’est fait pour vous."
      ),
  },

  /* ---------------------------------------------------------------- 3 */
  {
    url: "garde-meuble-quimper-finistere-sud.html",
    title: "Location box garde meubles Quimper Finistère sud : LG BOX",
    description:
      "Garde-meubles à Quimper et en Finistère sud : LG BOX loue des box secs et sécurisés de 2 m² à 20 m² pour un déménagement, un stockage, un entreposage ou un archivage.",
    h1: "Garde-meubles à Quimper et en Finistère sud",
    body: () =>
      pageHero({
        tag: "Particuliers & professionnels",
        h1: "Un garde-meubles pour les moments où la maison ne suit plus.",
        lede:
          "LG BOX propose la location de box secs et aérés, à double paroi, en self-stockage. Le service s’adresse aux particuliers comme aux professionnels : déménagement, stockage, entreposage, gardiennage, archivage et garde-meubles.",
      }) +
      marquee(bandeau) +
      `
<section class="section section--paper">
  <div class="wrap">
    <div class="head">
      <p class="eyebrow reveal">Vos situations</p>
      <h2 class="reveal">On loue rarement un box par plaisir. <br>Souvent parce que la vie bouge.</h2>
    </div>
    <div class="cards">
      <article class="card reveal"><span class="ico">${ico("truck")}</span><h3>Entre deux logements</h3><p>La vente est signée, l’achat traîne. Vos meubles passent quelques semaines ou quelques mois au sec, et vous récupérez tout le jour de la remise des clés — sans durée minimale imposée.</p></article>
      <article class="card reveal"><span class="ico">${ico("box")}</span><h3>La maison déborde</h3><p>Une succession, un enfant qui revient, des travaux : on vide une pièce le temps qu’il faut. Les étagères et les ${site.hauteur} de hauteur permettent de ranger haut plutôt que large.</p></article>
      <article class="card reveal"><span class="ico">${ico("shield")}</span><h3>Stock et archives d’entreprise</h3><p>Artisans, commerçants, professions libérales : un box devient une réserve ou un local d’archives à quelques minutes de Quimper, accessible avant l’ouverture et après la fermeture.</p></article>
      <article class="card reveal"><span class="ico">${ico("key")}</span><h3>Bateau, saison, expatriation</h3><p>Le matériel d’été, les affaires d’un départ à l’étranger, l’équipement d’un pro du nautisme : tout ce qui n’a pas sa place chez soi douze mois par an.</p></article>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="head">
      <p class="eyebrow reveal">Le détail qui change tout</p>
      <h2 class="reveal">Sain, sec, et surveillé.</h2>
      <p class="lede reveal">Tous les box loués par LG BOX sont solides, propres et sans humidité. Chaque box est équipé d’étagères de rangement, d’un volet roulant en aluminium et de l’éclairage. Le bâtiment est surveillé en permanence par vidéosurveillance et protégé par une alarme incendie.</p>
    </div>
    <div class="gallery">
      ${shot("interieur", "shot--wide")}
      ${shot("cartons")}
      ${shot("batiment")}
      ${shot("securite")}
      ${shot("couloir")}
    </div>
  </div>
</section>` +
      blocSurface() +
      blocAvis() +
      cta(
        "Votre garde-meubles est à 10 minutes de Quimper.",
        "Appelez, décrivez ce que vous avez à stocker : on vous dit quelle surface suffit — et souvent, elle est plus petite que vous ne le pensez."
      ),
  },

  /* ---------------------------------------------------------------- 4 */
  {
    url: "location-box-pas-cher-quimper-29.html",
    title: "Location box garde meubles pas cher Quimper 29 : LG BOX",
    description:
      "Box de stockage pas cher à Quimper (29) : de 45 € à 200 € TTC par mois selon la surface, tarif rez-de-chaussée ou étage, sans caution, sans frais de dossier ni engagement.",
    h1: "Location de box pas cher à Quimper (29)",
    body: () =>
      pageHero({
        tag: "Tarifs 2 m² → 20 m²",
        h1: "Des tarifs parmi les plus bas du secteur de Quimper.",
        lede:
          "Le coût d’une location de box n’est pas cher chez LG BOX : comptez de 45 € à 200 € TTC par mois selon la surface louée. Deux grilles coexistent — le tarif rez-de-chaussée, avec un accès de plain-pied, et le tarif étage, avec un accès par escalier.",
      }) +
      marquee(bandeau) +
      blocTarifs() +
      blocSurface() +
      `
<section class="section section--ink">
  <div class="wrap">
    <div class="head">
      <p class="eyebrow reveal">Ce que le prix comprend déjà</p>
      <h2 class="reveal">Pas de supplément pour respirer.</h2>
    </div>
    <div class="steps">
      <div class="step reveal"><h3>Aucun frais de dossier</h3><p>Ni caution, ni frais d’entrée. Vous payez le loyer du box, et rien d’autre.</p></div>
      <div class="step reveal"><h3>Le matériel de manutention</h3><p>Diables et chariots sont mis à disposition des clients et des déménageurs, sans location supplémentaire.</p></div>
      <div class="step reveal"><h3>L’accès permanent</h3><p>24h/24 et 7j/7 avec votre jeu de clés : aucun forfait « accès étendu » à souscrire.</p></div>
      <div class="step reveal"><h3>La liberté de partir</h3><p>Pas de durée minimale, un préavis de ${site.preavis}. Le box vous coûte le temps que vous l’occupez.</p></div>
    </div>
  </div>
</section>` +
      blocFaq(faq.slice(0, 5)) +
      cta(
        "Le tarif exact de votre box, en un appel.",
        "Donnez-nous la surface qui vous intéresse : on vérifie ce qui est libre au rez-de-chaussée et à l’étage, et on vous annonce le prix au mois, TTC, sans surprise."
      ),
  },

  /* ---------------------------------------------------------------- 5 */
  {
    url: "garde-meuble-box-stockage-douarnenez.html",
    title: "Location box stockage garde meubles Douarnenez : LG BOX",
    description:
      "Box de stockage et garde-meubles à 15 minutes de Douarnenez : LG BOX loue à Guengat des box de 2 m² à 20 m², secs, sécurisés et accessibles 24h/24 dès 45 €/mois.",
    h1: "Box de stockage et garde-meubles près de Douarnenez",
    body: () =>
      pageHero({
        tag: "À 15 min du centre de Douarnenez",
        h1: "Entre Douarnenez et Quimper, un box au sec pour vos affaires.",
        lede:
          "LG BOX est installé sur l’ancienne base de Guengat, à environ 15 minutes du centre de Douarnenez et à 10 minutes de Quimper. Près de 65 box de 2 m² à 20 m², dans un bâtiment fermé et sécurisé — pas des containers posés sur un parking.",
      }) +
      marquee(bandeau) +
      `
<section class="section section--paper">
  <div class="wrap">
    <div class="head">
      <p class="eyebrow reveal">Pour les Douarnenistes</p>
      <h2 class="reveal">Quinze minutes de route, <br>et le problème est rangé.</h2>
      <p class="lede reveal">Que vous habitiez Douarnenez, Pouldergat, Poullan-sur-Mer, Le Juch ou Locronan, la ZA de Kergueff est sur la route de Quimper. Vous accédez à votre box en libre-service, 24h/24 et 7j/7, avec un grand parking pour manœuvrer le camion.</p>
    </div>
    <div class="cards">
      <article class="card reveal"><span class="ico">${ico("box")}</span><h3>2 m² à 20 m²</h3><p>Du coffre à jouets au déménagement complet, avec ${site.hauteur} de hauteur à exploiter et des étagères déjà en place.</p></article>
      <article class="card reveal"><span class="ico">${ico("camera")}</span><h3>${site.cameras} caméras</h3><p>Vidéosurveillance intérieure et extérieure, télésurveillance, détecteurs et alarme incendie : vos affaires restent seules, mais pas sans surveillance.</p></article>
      <article class="card reveal"><span class="ico">${ico("truck")}</span><h3>Matériel prêté</h3><p>Diables et chariots sont à disposition des clients comme des déménageurs, et le quai facilite le déchargement.</p></article>
      <article class="card reveal"><span class="ico">${ico("free")}</span><h3>Sans engagement</h3><p>Le temps d’un chantier, d’une vente ou d’une saison : préavis de ${site.preavis}, sans caution ni frais de dossier.</p></article>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="head">
      <p class="eyebrow reveal">Le trajet</p>
      <h2 class="reveal">ZA de Kergueff, ${site.cp} ${site.ville}.</h2>
    </div>
    ${carte()}
    <div class="btn-row reveal" style="margin-top:22px">
      <a class="btn btn--sea" href="https://www.google.com/maps/dir/?api=1&amp;destination=${site.mapsQuery}" rel="noopener">Ouvrir l’itinéraire ${ico("arrow")}</a>
      <a class="btn btn--ghost" href="${site.telHref}">${ico("phone")} ${site.tel}</a>
    </div>
  </div>
</section>` +
      blocAvis() +
      cta(
        "Un box côté Douarnenez, disponible tout de suite ?",
        "Un appel suffit pour connaître les surfaces libres du moment, le tarif au rez-de-chaussée comme à l’étage, et convenir d’une visite."
      ),
  },

  /* ---------------------------------------------------------------- 6 */
  {
    url: "garde-meubles-quimper-avis.html",
    title: "Location box garde meubles Quimper | avis : LG BOX",
    description:
      "Les avis des clients de LG BOX à Guengat : propreté des locaux, box sain et sec, sécurité, accès facile 24h/24 et accueil du propriétaire, près de Quimper.",
    h1: "Les avis des clients de LG BOX",
    body: () =>
      pageHero({
        tag: "Paroles de locataires",
        h1: "« Tout est bien pensé et organisé. »",
        lede:
          "Propreté des locaux, box sain et sec, sécurité, accès facile, matériel de manutention à disposition : voici ce que retiennent les particuliers et les professionnels qui ont loué un box à Guengat.",
      }) +
      `
<section class="section section--paper">
  <div class="wrap">
    ${avisRail(avis)}
    ${avisRail([...avis].reverse())}
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="head">
      <p class="eyebrow reveal">Ce qui revient le plus souvent</p>
      <h2 class="reveal">Trois choses que personne ne cite dans les brochures.</h2>
    </div>
    <div class="cards">
      <article class="card reveal"><span class="ico">${ico("shield")}</span><h3>Le box est sec</h3><p>C’est la première chose que l’on vérifie en revenant chercher ses cartons. Les murs en dur, à double paroi, de l’ancienne base militaire y sont pour beaucoup.</p></article>
      <article class="card reveal"><span class="ico">${ico("key")}</span><h3>L’accès est simple</h3><p>Portes numérotées, couloirs larges, parking devant : on se gare, on décharge, on repart. À n’importe quelle heure.</p></article>
      <article class="card reveal"><span class="ico">${ico("phone")}</span><h3>Le propriétaire répond</h3><p>Un interlocuteur unique, joignable, qui connaît chaque box du bâtiment — et qui vous dit franchement si la surface envisagée est trop grande.</p></article>
    </div>
  </div>
</section>` +
      blocPhotos() +
      cta(
        "À votre tour de juger sur pièces.",
        "Une visite du bâtiment, sans engagement, pour voir la propreté des couloirs et la qualité des box. Appelez pour convenir d’un moment."
      ),
  },

  /* ---------------------------------------------------------------- 7 */
  {
    url: "faq.html",
    title: "Location box garde meuble Quimper | FAQ : LG BOX",
    description:
      "FAQ LG BOX : tarifs dès 45 €/mois, durée minimale, préavis de 8 jours, caution, assurance, accès 24h/24, sécurité, surfaces de 2 m² à 20 m² près de Quimper.",
    h1: "Questions fréquentes",
    faq,
    body: () =>
      pageHero({
        tag: "Tout savoir avant de louer",
        h1: "Les questions que vous nous posez au téléphone.",
        lede:
          "Tarifs, durée, préavis, caution, assurance, sécurité, accès : les réponses sont ici. S’il en manque une, elle tient en un coup de fil au " + site.tel + ".",
      }) +
      `<div class="section section--paper" style="padding-block:clamp(48px,7vw,90px)">
  <div class="wrap">
    ${faqList(faq)}
  </div>
</div>` +
      cta(
        "Une question qui n’est pas dans la liste ?",
        "Posez-la directement : on répond vite, et sans jargon. Vous saurez en deux minutes si LG BOX correspond à votre besoin."
      ),
  },

  /* ---------------------------------------------------------------- 8 */
  {
    url: "location-box-quimper-adresse.html",
    title: "Location box garde meubles Quimper | adresse : LG BOX",
    description:
      "Adresse et accès de LG BOX : ZA de Kergueff, 29180 Guengat, à 10 minutes de Quimper et 15 minutes de Douarnenez. Grand parking, accès camion, box accessibles 24h/24.",
    h1: "Adresse et accès",
    body: () =>
      pageHero({
        tag: "ZA de Kergueff · 29180 Guengat",
        h1: "Où nous trouver, et comment y accéder.",
        lede:
          "LG BOX se situe sur la commune de Guengat, à 10 minutes de Quimper et à 15 minutes du centre de Douarnenez, sur l’ancienne base de la Marine nationale. Le parking est grand : les camions de déménagement s’approchent au plus près des portes.",
      }) +
      `
<section class="section section--paper">
  <div class="wrap">
    ${contactCards()}
    <div style="margin-top:34px">${carte()}</div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="head">
      <p class="eyebrow reveal">Sur place</p>
      <h2 class="reveal">Ce qui vous attend en arrivant.</h2>
    </div>
    <div class="steps">
      <div class="step reveal"><h3>Un parking dégagé</h3><p>De quoi manœuvrer un camion de déménagement ou une remorque porte-engins, et se garer devant la porte du bâtiment.</p></div>
      <div class="step reveal"><h3>Un bâtiment fermé</h3><p>On n’entre pas par hasard : le bâtiment est clos, sous ${site.cameras} caméras, et seuls les locataires disposent des clés.</p></div>
      <div class="step reveal"><h3>Des couloirs larges</h3><p>Les box sont desservis par des couloirs intérieurs éclairés, au sec, avec diables et chariots à disposition.</p></div>
      <div class="step reveal"><h3>Un accès permanent</h3><p>24h/24, 7j/7, jours fériés compris : votre jeu de clés est votre seul horaire d’ouverture.</p></div>
    </div>
  </div>
</section>` +
      cta(
        "Prévenez de votre passage, on vous attend.",
        "Un appel avant de venir permet de préparer la visite des box libres — et d’éviter de vous déplacer pour rien si la surface voulue vient d’être louée."
      ),
  },

  /* ---------------------------------------------------------------- 9 */
  {
    url: "location-box-quimper-contact.html",
    title: "Location box garde meuble Quimper | contact : LG BOX",
    description:
      "Contactez LG BOX au 06 38 64 97 35 ou à info@lg-box.fr pour louer un box de stockage ou un garde-meubles de 2 m² à 20 m² à Guengat, près de Quimper.",
    h1: "Contacter LG BOX",
    body: () =>
      pageHero({
        tag: "Réponse le jour même",
        h1: "Dites-nous ce que vous avez à ranger.",
        lede:
          "Un appel au " + site.tel + " ou un message à " + site.email + " : on vous indique les surfaces libres, le tarif exact selon le rez-de-chaussée ou l’étage, et on convient d’une visite. Sans engagement.",
      }) +
      `
<section class="section section--paper">
  <div class="wrap">
    ${contactCards()}
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="head">
      <p class="eyebrow reveal">Pour aller plus vite</p>
      <h2 class="reveal">Trois informations suffisent.</h2>
      <p class="lede reveal">Ce que vous stockez (cartons, mobilier, stock professionnel), la durée envisagée et la date d’entrée souhaitée. Avec ça, on vous propose la bonne surface du premier coup.</p>
    </div>
    <div class="steps">
      <div class="step reveal"><h3>Ce que vous stockez</h3><p>Le contenu d’un studio, d’un T3, des archives, du matériel : cela détermine la surface et l’étage les plus adaptés.</p></div>
      <div class="step reveal"><h3>La durée envisagée</h3><p>Deux semaines ou trois ans : il n’y a pas de durée minimale, et le préavis de départ est de ${site.preavis}.</p></div>
      <div class="step reveal"><h3>La date d’entrée</h3><p>Le box peut souvent être disponible le jour même de la visite, clés en main.</p></div>
    </div>
    <div class="btn-row reveal" style="margin-top:32px">
      <a class="btn btn--sun" href="${site.telHref}">${ico("phone")} ${site.tel}</a>
      <a class="btn btn--sea" href="mailto:${site.email}?subject=Demande%20de%20box%20LG%20BOX">${ico("mail")} Écrire un message</a>
    </div>
  </div>
</section>` +
      cta(
        "LG BOX, ZA de Kergueff, 29180 Guengat.",
        "À 10 minutes de Quimper et 15 minutes de Douarnenez. Accès 24h/24, 7j/7, avec votre jeu de clés."
      ),
  },

  /* --------------------------------------------------------------- 10 */
  {
    url: "location-box-quimper-plan-site.html",
    title: "Location box garde meubles Quimper | plan site : LG BOX",
    description:
      "Plan du site LG BOX : toutes les pages du site de location de box et garde-meubles à Guengat, près de Quimper en Finistère sud.",
    h1: "Plan du site",
    body: () =>
      pageHero({
        h1: "Plan du site",
        lede: "Toutes les pages du site LG BOX, location de box de stockage et garde-meubles à Guengat, près de Quimper.",
      }) +
      `
<section class="section section--paper">
  <div class="wrap">
    <div class="head"><p class="eyebrow reveal">Pages principales</p><h2 class="reveal">Le centre et ses offres</h2></div>
    <ul class="linklist">
      ${nav
        .map(
          (n) => `<li class="reveal"><a href="${n.url}">${esc(n.titre)}<small>${site.origin}/${n.url}</small></a></li>`
        )
        .join("\n      ")}
    </ul>

    <div class="head" style="margin-top:56px"><p class="eyebrow reveal">Pages annexes</p><h2 class="reveal">Infos pratiques</h2></div>
    <ul class="linklist">
      ${navSecondaire
        .map(
          (n) => `<li class="reveal"><a href="${n.url}">${esc(n.titre)}<small>${site.origin}/${n.url}</small></a></li>`
        )
        .join("\n      ")}
    </ul>
  </div>
</section>` +
      cta("Une page vous manque ?", "Dites-le nous : le site est court par choix, mais on répond à tout au téléphone."),
  },

  /* --------------------------------------------------------------- 11 */
  {
    url: "location-box-quimper-mentions.html",
    title: "Location box garde meubles Quimper | mentions légales : LG BOX",
    description:
      "Mentions légales du site LG BOX, location de box de stockage et garde-meubles à Guengat : éditeur, hébergeur, propriété intellectuelle et données personnelles.",
    h1: "Mentions légales",
    body: () =>
      pageHero({
        h1: "Mentions légales",
        lede: "Informations légales relatives au site et à l’activité de location de box de stockage LG BOX.",
      }) +
      `
<section class="section section--paper">
  <div class="wrap prose reveal">
    <h2>Éditeur du site</h2>
    <p>${site.entite}<br>${site.adresse} — ${site.cp} ${site.ville}<br>SIRET : ${site.siret}<br>Téléphone : <a href="${site.telHref}">${site.tel}</a><br>Courriel : <a href="mailto:${site.email}">${site.email}</a></p>

    <h2>Activité</h2>
    <p>Location de box de stockage en self-stockage et de garde-meubles à destination des particuliers et des professionnels : déménagement, stockage, entreposage, gardiennage et archivage.</p>

    <h2>Hébergement</h2>
    <p>Le site est hébergé par le prestataire d’hébergement web retenu par l’éditeur. Les coordonnées complètes de l’hébergeur sont communiquées sur simple demande à <a href="mailto:${site.email}">${site.email}</a>.</p>

    <h2>Propriété intellectuelle</h2>
    <p>L’ensemble des contenus de ce site — textes, photographies du centre, mise en page et éléments graphiques — est la propriété de l’éditeur, sauf mention contraire. Toute reproduction, représentation ou diffusion, totale ou partielle, sans autorisation écrite préalable est interdite.</p>

    <h2>Données personnelles</h2>
    <p>Ce site ne dépose aucun cookie de mesure d’audience ni de publicité. Aucun formulaire n’y collecte de données : les demandes se font par téléphone ou par courriel. Les informations que vous transmettez par courriel servent uniquement à répondre à votre demande de location et ne sont ni cédées, ni vendues à des tiers.</p>
    <p>Conformément au règlement général sur la protection des données, vous disposez d’un droit d’accès, de rectification et de suppression des données vous concernant. Pour l’exercer, écrivez à <a href="mailto:${site.email}">${site.email}</a>.</p>

    <h2>Cartographie</h2>
    <p>La carte de situation est fournie par OpenStreetMap, sous licence ODbL. Les itinéraires ouvrent le service de cartographie de votre choix.</p>

    <h2>Responsabilité</h2>
    <p>Les informations diffusées sur ce site sont données à titre indicatif et peuvent évoluer, en particulier les surfaces disponibles et les tarifs. Seules les conditions communiquées lors de la signature du contrat de location font foi.</p>
  </div>
</section>` +
      cta("Une question sur vos données ou sur le contrat ?", "Écrivez-nous, la réponse vient d’une personne, pas d’un formulaire."),
  },
];

/* =======================================================================
   Fichiers annexes
   ======================================================================= */

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="15" fill="#0a1a2b"/>
  <path d="M32 12 50 22v20L32 52 14 42V22Z" fill="none" stroke="#14b8a6" stroke-width="3.4" stroke-linejoin="round"/>
  <path d="M14 22l18 10 18-10M32 32v20" fill="none" stroke="#ffb020" stroke-width="3.4" stroke-linejoin="round"/>
</svg>`;

const sitemap = () => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...nav, ...navSecondaire]
  .map(
    (n) => `  <url>
    <loc>${site.origin}/${n.url === "index.html" ? "" : n.url}</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${n.url === "index.html" ? "1.0" : "0.7"}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

const robots = `User-agent: *
Allow: /

Sitemap: ${site.origin}/sitemap.xml
`;

/* =======================================================================
   Rendu
   ======================================================================= */

const render = (page) => {
  resetDelay();
  return [head(page), header(page), `<main id="contenu">`, page.body(page), `</main>`, footer()].join("\n");
};

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(join(here, "static"), dist, { recursive: true });

for (const page of pages) {
  await writeFile(join(dist, page.url), render(page), "utf8");
}
await writeFile(join(dist, "favicon.svg"), favicon, "utf8");
await writeFile(join(dist, "sitemap.xml"), sitemap(), "utf8");
await writeFile(join(dist, "robots.txt"), robots, "utf8");

const manquantes = Object.values(photos).map((p) => p.file);
console.log(`✓ ${pages.length} pages générées dans site/dist`);
console.log(`  photos attendues dans site/static/images/ : ${manquantes.length}`);
