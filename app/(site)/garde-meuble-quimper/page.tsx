import type { Metadata } from "next";
import Link from "next/link";

import { AppelFinal, Fil } from "@/components/site/blocs";
import { Photo } from "@/components/site/photo";
import { EtatGlobal } from "@/components/site/portes";
import { SITE } from "@/lib/site/config";
import { lireOffre } from "@/lib/site/data";
import { formatPrix } from "@/lib/site/offre";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Garde-meubles à Quimper et dans le Finistère sud",
  description:
    "Garde-meubles en self-stockage à 10 minutes de Quimper : déménagement, travaux, succession, stock ou archives. Box privatifs de 2 à 20 m², sans engagement de durée.",
  alternates: { canonical: "/garde-meuble-quimper" },
};

export default async function GardeMeuble() {
  const offre = await lireOffre();
  return (
    <>
      <div className="s-cadre s-page-tete">
        <Fil nom="Garde-meubles" chemin="/garde-meuble-quimper" />
        <h1>Un garde-meubles près de Quimper, dont vous gardez la clé</h1>
        <p className="s-chapo">
          Le self-stockage, c&apos;est un garde-meubles sans intermédiaire : vous louez un box
          fermé, vous y déposez vos affaires vous-même et vous y revenez quand vous voulez.
        </p>
        <div style={{ marginTop: "1.5rem" }}>
          <EtatGlobal offre={offre} />
        </div>
      </div>

      <section className="s-section s-section--blanche">
        <div className="s-cadre s-deux">
          <div className="s-texte">
            <h2 style={{ marginTop: 0 }}>Quand un garde-meubles rend service</h2>
            <ul>
              <li>
                <strong>Un déménagement</strong> avec quelques semaines entre deux logements
              </li>
              <li>
                <strong>Des travaux</strong> à la maison, le temps de vider une ou plusieurs pièces
              </li>
              <li>
                <strong>Une succession ou une vente</strong>, pour mettre des meubles à l&apos;abri
              </li>
              <li>
                <strong>Un départ prolongé</strong> : mission, études, expatriation
              </li>
              <li>
                <strong>Pas de garage ni de cave</strong> : vélos, pneus, matériel de saison
              </li>
              <li>
                <strong>Une activité professionnelle</strong> : stock, outillage, archives
              </li>
            </ul>
            <h2>Combien de temps, et à quel prix ?</h2>
            <p>
              Aussi longtemps que nécessaire, un mois comme plusieurs années. Il n&apos;y a pas de
              durée minimale, pas de caution et pas de bail : vous arrêtez la location avec un
              préavis de {SITE.preavisJours} jours.
              {offre.prixMin !== null && offre.prixMax !== null
                ? ` Les prix vont de ${formatPrix(offre.prixMin)} à ${formatPrix(
                    offre.prixMax
                  )} par mois selon la surface.`
                : ""}
            </p>
            <p>
              <Link href="/tarifs">Voir la grille des tarifs et les box libres</Link>
            </p>
          </div>
          <div style={{ display: "grid", gap: "0.85rem" }}>
            <Photo cle="album02" forme="large" tailles="(max-width: 54rem) 100vw, 48vw" prioritaire />
            <Photo cle="album06" forme="large" tailles="(max-width: 54rem) 100vw, 48vw" />
          </div>
        </div>
      </section>

      <section className="s-section">
        <div className="s-cadre s-deux">
          <div className="s-texte">
            <h2 style={{ marginTop: 0 }}>Quelle surface pour vos meubles ?</h2>
            <p>
              Un repère simple : comptez environ 10 % de la surface de votre logement, en
              empilant jusqu&apos;aux {SITE.hauteurSousPlafond} de plafond.
            </p>
            <ul>
              <li>Studio : 5 m²</li>
              <li>Deux-pièces : 8 m²</li>
              <li>Trois-pièces : 12 m²</li>
              <li>Quatre-pièces : 15 m²</li>
              <li>Maison : 18 à 20 m²</li>
            </ul>
            <p>Un doute ? Décrivez-nous ce que vous avez à ranger, on vous conseille la taille.</p>
          </div>
          <div className="s-texte">
            <h2 style={{ marginTop: 0 }}>Un garde-meubles pour tout le Finistère sud</h2>
            <p>
              LG BOX se trouve à Guengat, {SITE.adresse.rue}, sur l&apos;axe Quimper–Douarnenez.
              Les locataires viennent de Quimper et de son agglomération, mais aussi du pays de
              Douarnenez, du Cap-Sizun, du pays bigouden, de Châteaulin et de la presqu&apos;île de
              Crozon.
            </p>
            <ul className="s-villes" style={{ listStyle: "none", paddingLeft: 0 }}>
              {SITE.villesDesservies.map((v) => (
                <li key={v.nom} style={{ marginTop: 0 }}>
                  {v.nom}
                  <span>environ {v.trajet}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <AppelFinal />
    </>
  );
}
