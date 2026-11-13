import type { Metadata } from "next";
import Link from "next/link";

import { AppelFinal, Fil } from "@/components/site/blocs";
import { Photo } from "@/components/site/photo";
import { SITE } from "@/lib/site/config";
import { ALBUM } from "@/lib/site/photos";

export const metadata: Metadata = {
  title: "Box de stockage en dur à Guengat, près de Quimper",
  description:
    "Des box de 2 à 20 m² et 3,20 m de haut, maçonnés, secs et aérés, avec étagères et éclairage. 35 caméras, accès 24h/24. Visite en photos.",
  alternates: { canonical: "/box-stockage" },
};

const SURFACES = [
  ["2 m²", "6 m³"],
  ["5 m²", "16 m³"],
  ["8 m²", "26 m³"],
  ["10 m²", "32 m³"],
  ["12 m²", "38 m³"],
  ["15 m²", "48 m³"],
  ["18 m²", "58 m³"],
  ["20 m²", "64 m³"],
];

export default function LesBox() {
  return (
    <>
      <div className="s-cadre s-page-tete">
        <Fil nom="Les box" chemin="/box-stockage" />
        <h1>Des box maçonnés, secs et fermés à clé</h1>
        <p className="s-chapo">
          Le centre est installé dans d&apos;anciens logements de la Marine nationale, sur
          l&apos;ancienne base de Guengat. Chaque box est une vraie pièce, pas un conteneur.
        </p>
      </div>

      <section className="s-section s-section--blanche">
        <div className="s-cadre s-deux">
          <div>
            <h2>Ce que vous trouvez dans chaque box</h2>
            <dl className="s-faits" style={{ marginTop: "1.75rem" }}>
              <div>
                <dt>Des murs en dur</dt>
                <dd>Doubles cloisons, box sec et aéré : le mobilier ne prend pas l&apos;humidité.</dd>
              </div>
              <div>
                <dt>{SITE.hauteurSousPlafond} de hauteur</dt>
                <dd>De quoi empiler : un 12 m² offre près de 38 m³ utiles.</dd>
              </div>
              <div>
                <dt>Étagères et éclairage</dt>
                <dd>Le box est prêt à ranger le jour de votre arrivée.</dd>
              </div>
              <div>
                <dt>Une porte qui ferme à clé</dt>
                <dd>Large de 93 ou 103 cm. Les fenêtres ont des volets roulants en aluminium.</dd>
              </div>
            </dl>
          </div>
          <Photo cle="album07" forme="large" tailles="(max-width: 54rem) 100vw, 48vw" prioritaire />
        </div>
      </section>

      <section className="s-section">
        <div className="s-cadre s-deux">
          <div className="s-texte">
            <h2 style={{ marginTop: 0 }}>Surveillé jour et nuit</h2>
            <p>
              {SITE.cameras} caméras filment en continu le bâtiment, ses abords et le parking, et
              enregistrent les entrées et les sorties. Le centre est équipé d&apos;une alarme et
              d&apos;une détection incendie.
            </p>
            <h2>Un accès simple, même en camion</h2>
            <p>
              Vous recevez un jeu de clés à la signature et vous venez quand vous voulez, 24 h/24
              et 7 j/7. Le parking est grand, un chariot et un diable sont prêtés, et des toilettes
              sont à la disposition des clients.
            </p>
            <p>
              <Link href="/contact">Voir l&apos;adresse et l&apos;itinéraire</Link>
            </p>
          </div>
          <div>
            <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>Huit surfaces, de 2 à 20 m²</h2>
            <div className="s-tableau-defile" style={{ marginTop: "1.25rem" }}>
              <table className="s-tableau">
                <thead>
                  <tr>
                    <th scope="col">Surface</th>
                    <th scope="col">Volume approximatif</th>
                  </tr>
                </thead>
                <tbody>
                  {SURFACES.map(([s, v]) => (
                    <tr key={s}>
                      <th scope="row">{s}</th>
                      <td className="s-num">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ marginTop: "1.25rem" }}>
              <Link className="s-bouton s-bouton--calme" href="/tarifs">
                Voir les prix et les box libres
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="s-section s-section--blanche">
        <div className="s-cadre">
          <div className="s-section__tete">
            <h2>Le centre en photos</h2>
          </div>
          <div className="s-galerie">
            {ALBUM.map((cle) => (
              <Photo key={cle} cle={cle} tailles="(max-width: 40rem) 100vw, (max-width: 70rem) 50vw, 25vw" />
            ))}
          </div>
        </div>
      </section>

      <AppelFinal titre="Le mieux reste de venir voir." texte="La visite est gratuite et sans engagement. Appelez ou écrivez pour convenir d'un moment." />
    </>
  );
}
