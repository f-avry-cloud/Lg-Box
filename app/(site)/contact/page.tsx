import type { Metadata } from "next";

import { Fil } from "@/components/site/blocs";
import { Canaux } from "@/components/site/canaux";
import { Photo } from "@/components/site/photo";
import { ReservationForm } from "@/components/public/reservation-form";
import { SITE, type Niveau } from "@/lib/site/config";
import { titreDemande, type Demande } from "@/lib/site/contact";
import { lireOffre } from "@/lib/site/data";

export const metadata: Metadata = {
  title: "Réserver un box, contact et accès",
  description:
    "Réservez votre box par téléphone, SMS ou e-mail : 06 38 64 97 35, info@lg-box.fr. LG BOX, ZA de Kergueff, 29180 Guengat, à 10 minutes de Quimper. Accès 24h/24.",
  alternates: { canonical: "/contact" },
};

export default async function Contact({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams;
  const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const surface = un(p.surface);
  const niveau = un(p.niveau);
  const demande: Demande = {
    surface: surface && /^\d{1,2}([.,]\d{1,2})?$/.test(surface) ? surface : null,
    niveau: niveau === "rdc" || niveau === "etage" ? (niveau as Niveau) : null,
    mode: un(p.mode) === "prevenir" ? "prevenir" : "reserver",
  };

  const offre = await lireOffre();
  const choisie = offre.lignes.find(
    (l) => String(l.surface) === demande.surface?.replace(",", ".") && l.niveau === (demande.niveau ?? "rdc")
  );

  return (
    <>
      <div className="s-cadre s-page-tete">
        <Fil nom="Contact et accès" chemin="/contact" />
        <h1>Réserver, poser une question, venir</h1>
        <p className="s-chapo">
          Trois façons de nous joindre, 7 jours sur 7. Aucun paiement en ligne : la location se
          conclut sur place, à la remise des clés.
        </p>
      </div>

      <section className="s-section s-section--blanche" id="reserver">
        <div className="s-cadre s-deux">
          <div>
            <h2>{titreDemande(demande)}</h2>
            <div style={{ marginTop: "1.5rem" }}>
              <Canaux demande={demande} />
            </div>
          </div>
          <div id="demande">
            <h2>Ou laissez une demande écrite</h2>
            <p className="s-discret" style={{ margin: "0.6rem 0 1.25rem" }}>
              Elle arrive directement au centre, qui vous rappelle.
            </p>
            <div className="s-formulaire">
              <ReservationForm
                sizes={offre.lignes.map((l) => l.libelle)}
                tailleParDefaut={choisie?.libelle}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="s-section" id="acces">
        <div className="s-cadre s-deux">
          <div>
            <h2>Adresse et accès</h2>
            <div className="s-carte-adresse" style={{ marginTop: "1.5rem" }}>
              <address>
                {SITE.nom}
                <br />
                {SITE.adresse.rue}
                <br />
                {SITE.adresse.codePostal} {SITE.adresse.ville}
              </address>
              <p style={{ marginTop: "0.9rem" }}>
                Sur l&apos;ancienne base de Guengat, à 10 minutes de Quimper en direction de
                Douarnenez. Grand parking au pied du bâtiment, accessible aux camions de
                déménagement et aux remorques.
              </p>
              <p style={{ marginTop: "0.9rem" }}>
                <strong>Accès aux box :</strong> 24 h/24 et 7 j/7, avec vos clés.
              </p>
              <p style={{ marginTop: "1.25rem" }}>
                <a className="s-bouton" href={SITE.itineraire} rel="noopener">
                  Ouvrir l&apos;itinéraire
                </a>
              </p>
            </div>
            <ul className="s-villes" style={{ marginTop: "1.25rem" }}>
              {SITE.villesDesservies.map((v) => (
                <li key={v.nom}>
                  {v.nom}
                  <span>environ {v.trajet}</span>
                </li>
              ))}
            </ul>
          </div>
          <Photo cle="album02" forme="large" tailles="(max-width: 54rem) 100vw, 48vw" />
        </div>
      </section>
    </>
  );
}
