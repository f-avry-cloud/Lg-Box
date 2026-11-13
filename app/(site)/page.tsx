import type { Metadata } from "next";
import Link from "next/link";

import { AppelFinal, ListeFaq } from "@/components/site/blocs";
import { BoutonReserver } from "@/components/site/bouton-reserver";
import { JsonLd } from "@/components/site/json-ld";
import { Photo } from "@/components/site/photo";
import { EtatGlobal, Portes, horodatage } from "@/components/site/portes";
import { SITE } from "@/lib/site/config";
import { lireOffre } from "@/lib/site/data";
import { questions } from "@/lib/site/faq";
import { formatPrix } from "@/lib/site/offre";
import { schemaEtablissement, schemaFaq } from "@/lib/site/schema";

// Page statique, relue en base toutes les 5 minutes — et aussitôt qu'un tarif
// ou la disponibilité d'un box change dans l'application.
export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Avis repris tels quels du site d'origine. « […] » signale une coupe.
const AVIS = [
  {
    texte:
      "Box très sécurisé, très propre. Personne très aimable à l'écoute et très rigoureux. Je suis restée 3 ans et je recommande à 100 %.",
    auteur: "Une cliente particulière",
  },
  {
    texte:
      "Propreté des locaux, box sain et sec, sécurité, accès facile, tout est bien pensé et organisé. […] Je recommande vivement !",
    auteur: "Un client particulier",
  },
  {
    texte:
      "Excellentes prestations : propreté et entretien des locaux, sécurité, accès très facile aux box, matériel à disposition pour transporter les meubles et cartons.",
    auteur: "Un client professionnel",
  },
];

export default async function Accueil() {
  const offre = await lireOffre();
  const faq = questions(offre);

  return (
    <>
      <JsonLd data={schemaEtablissement(offre)} />
      <JsonLd data={schemaFaq(faq.slice(0, 6))} />

      <div className="s-cadre s-ouverture">
        <div>
          <h1>Un box de stockage en dur, à 10 minutes de Quimper.</h1>
          <p className="s-chapo">
            De 2 à 20 m², dans les anciens logements de la Marine nationale à Guengat. Vous avez
            vos clés et vous venez quand vous voulez
            {offre.prixMin !== null ? `, à partir de ${formatPrix(offre.prixMin)} par mois` : ""}.
          </p>
          <div className="s-actions">
            <BoutonReserver />
            <Link className="s-bouton s-bouton--calme" href="/tarifs">
              Voir les tarifs
            </Link>
          </div>
          <ul className="s-garanties">
            <li>Accès 24 h/24, 7 j/7</li>
            <li>Sans caution ni bail</li>
            <li>Préavis de {SITE.preavisJours} jours</li>
          </ul>
        </div>
        <Photo
          cle="album01"
          forme="ouverture"
          tailles="(max-width: 54rem) 100vw, 46vw"
          prioritaire
        />
      </div>

      <section className="s-section s-section--blanche" id="disponibilites">
        <div className="s-cadre">
          <div className="s-section__tete">
            <div>
              <h2>Les box à louer aujourd&apos;hui</h2>
              <p>
                Rideau levé, le box est libre. Rideau baissé, il est pris : inscrivez-vous, vous
                serez prévenu dès qu&apos;il se libère.
              </p>
            </div>
            <EtatGlobal offre={offre} />
          </div>
          <Portes offre={offre} miseAJour={horodatage()} />
        </div>
      </section>

      <section className="s-section">
        <div className="s-cadre s-deux">
          <div>
            <h2>Des murs, pas de la tôle.</h2>
            <p className="s-chapo" style={{ marginTop: "1rem" }}>
              LG BOX occupe un bâtiment de l&apos;ancienne base de Guengat. Chaque box est une
              pièce maçonnée, à double cloison : vos meubles y restent au sec, hiver comme été.
            </p>
            <dl className="s-faits" style={{ marginTop: "2rem" }}>
              <div>
                <dt>{SITE.hauteurSousPlafond} sous plafond</dt>
                <dd>Des étagères sont déjà posées, et chaque box a son éclairage.</dd>
              </div>
              <div>
                <dt>{SITE.cameras} caméras</dt>
                <dd>Bâtiment et parking filmés en continu, alarme et détection incendie.</dd>
              </div>
              <div>
                <dt>Vos clés, vos horaires</dt>
                <dd>Vous entrez de jour comme de nuit, sans rendez-vous ni badge à demander.</dd>
              </div>
              <div>
                <dt>Chariot et diable prêtés</dt>
                <dd>Le camion se gare sur un grand parking, au pied du bâtiment.</dd>
              </div>
            </dl>
            <p style={{ marginTop: "2rem" }}>
              <Link className="s-bouton s-bouton--calme" href="/box-stockage">
                Visiter les box en photos
              </Link>
            </p>
          </div>
          <div style={{ display: "grid", gap: "0.85rem" }}>
            <Photo cle="album04" forme="large" tailles="(max-width: 54rem) 100vw, 48vw" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
              <Photo cle="album07" tailles="(max-width: 54rem) 50vw, 24vw" />
              <Photo cle="album15" tailles="(max-width: 54rem) 50vw, 24vw" />
            </div>
          </div>
        </div>
      </section>

      <section className="s-section s-section--marine">
        <div className="s-cadre">
          <div className="s-section__tete">
            <div>
              <h2>Louer un box, en quatre temps</h2>
              <p>Pas de dossier à monter, pas de paiement en ligne.</p>
            </div>
          </div>
          <ol className="s-etapes">
            <li>
              <h3>Vous nous contactez</h3>
              <p>Par téléphone, SMS ou e-mail. On vous dit ce qui est libre et à quel prix.</p>
            </li>
            <li>
              <h3>Vous visitez</h3>
              <p>Vous voyez le bâtiment et le box, vous mesurez la porte si besoin.</p>
            </li>
            <li>
              <h3>Vous signez</h3>
              <p>Un contrat simple, sans caution ni bail. Vos clés vous sont remises.</p>
            </li>
            <li>
              <h3>Vous allez et venez</h3>
              <p>
                24 h/24, toute l&apos;année. Pour partir, prévenez {SITE.preavisJours} jours avant.
              </p>
            </li>
          </ol>
        </div>
      </section>

      <section className="s-section" id="avis">
        <div className="s-cadre">
          <div className="s-section__tete">
            <div>
              <h2>Ce qu&apos;en disent les locataires</h2>
              <p>Des avis laissés par des clients du centre.</p>
            </div>
          </div>
          <div className="s-avis">
            {AVIS.map((a) => (
              <figure key={a.texte}>
                <blockquote>« {a.texte} »</blockquote>
                <figcaption>{a.auteur}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="s-section s-section--blanche">
        <div className="s-cadre s-deux">
          <div>
            <h2>Entre Quimper et Douarnenez</h2>
            <p className="s-chapo" style={{ marginTop: "1rem" }}>
              {SITE.adresse.rue}, {SITE.adresse.codePostal} {SITE.adresse.ville}. Le centre sert
              tout le sud du Finistère.
            </p>
            <ul className="s-villes" style={{ marginTop: "1.5rem" }}>
              {SITE.villesDesservies.map((v) => (
                <li key={v.nom}>
                  {v.nom}
                  <span>environ {v.trajet}</span>
                </li>
              ))}
            </ul>
            <p style={{ marginTop: "1.5rem" }}>
              <a className="s-bouton s-bouton--calme" href={SITE.itineraire} rel="noopener">
                Ouvrir l&apos;itinéraire
              </a>
            </p>
          </div>
          <div>
            <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>Questions fréquentes</h2>
            <div style={{ marginTop: "1.25rem" }}>
              <ListeFaq liste={faq.slice(0, 6)} />
            </div>
            <p style={{ marginTop: "1.25rem" }}>
              <Link href="/faq" style={{ fontWeight: 700 }}>
                Toutes les questions
              </Link>
            </p>
          </div>
        </div>
      </section>

      <AppelFinal />
    </>
  );
}
