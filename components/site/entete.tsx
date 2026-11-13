import Image from "next/image";
import Link from "next/link";

import { BoutonReserver } from "@/components/site/bouton-reserver";
import { IconeAppel, IconeEmail, IconeMenu, IconeSms } from "@/components/site/icones";
import { Liens } from "@/components/site/navigation";
import { ADRESSE_LIGNE, SITE } from "@/lib/site/config";
import { liensDemande } from "@/lib/site/contact";
import { PAGES } from "@/lib/site/pages";

export function Entete() {
  return (
    <header className="s-entete">
      <div className="s-cadre s-entete__barre">
        <Link href="/" className="s-marque" aria-label="LG BOX, accueil">
          <Image src="/logo/lg-box-compact-blanc.png" alt="LG BOX" width={570} height={160} priority />
        </Link>
        <nav className="s-nav" aria-label="Navigation principale">
          <Liens />
        </nav>
        <a className="s-entete__tel" href={`tel:${SITE.telephoneE164}`}>
          {SITE.telephone}
        </a>
        <BoutonReserver>Réserver</BoutonReserver>
        <details className="s-menu">
          <summary aria-label="Ouvrir le menu">
            <IconeMenu />
          </summary>
          <nav aria-label="Menu">
            <Link href="/">Accueil</Link>
            <Liens />
          </nav>
        </details>
      </div>
    </header>
  );
}

export function Pied() {
  return (
    <footer className="s-pied">
      <div className="s-cadre">
        <div className="s-pied__grille">
          <div>
            <Image
              className="s-pied__logo"
              src="/logo/lg-box-blanc.png"
              alt="LG BOX, entreprise de self-stockage"
              width={947}
              height={367}
            />
            <address>
              {SITE.adresse.rue}
              <br />
              {SITE.adresse.codePostal} {SITE.adresse.ville}, {SITE.adresse.departement}
              <br />
              <a href={`tel:${SITE.telephoneE164}`}>{SITE.telephone}</a>
              <br />
              <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            </address>
            <p style={{ marginTop: "0.7rem" }}>Accès aux box 24 h/24, 7 j/7.</p>
          </div>
          <nav aria-label="Pages du site">
            <h2>Le site</h2>
            <ul>
              {PAGES.map((p) => (
                <li key={p.href}>
                  <Link href={p.href}>{p.nom}</Link>
                </li>
              ))}
              <li>
                <Link href="/mentions-legales">Mentions légales</Link>
              </li>
            </ul>
          </nav>
          <div>
            <h2>Secteur desservi</h2>
            <p>
              {SITE.villesDesservies.map((v) => v.nom).join(", ")} et tout le Finistère sud.
            </p>
            <p style={{ marginTop: "0.7rem" }}>
              <Link href="/portail/connexion">Espace client</Link>
            </p>
          </div>
        </div>
        <div className="s-pied__bas">
          <span>
            © {new Date().getFullYear()} {SITE.raisonSociale}, {ADRESSE_LIGNE}
          </span>
          <span>SIRET {SITE.siret}</span>
        </div>
      </div>
    </footer>
  );
}

/** Sur téléphone : appel, SMS et e-mail toujours sous le pouce. */
export function BarreMobile() {
  const liens = liensDemande({});
  return (
    <nav className="s-barre" aria-label="Contact rapide">
      <a href={liens.appel}>
        <IconeAppel />
        Appeler
      </a>
      <a href={liens.sms}>
        <IconeSms />
        SMS
      </a>
      <a href={liens.email}>
        <IconeEmail />
        E-mail
      </a>
    </nav>
  );
}
