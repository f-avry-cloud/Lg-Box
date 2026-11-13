import type { Metadata } from "next";

import { AppelFinal, Fil } from "@/components/site/blocs";
import { BoutonReserver } from "@/components/site/bouton-reserver";
import { JsonLd } from "@/components/site/json-ld";
import { EtatGlobal, Portes, horodatage } from "@/components/site/portes";
import { ACCES_NIVEAU, LIBELLE_NIVEAU, SITE, contenance, volumeM3, type Niveau } from "@/lib/site/config";
import { lireOffre } from "@/lib/site/data";
import { formatPrix, formatSurface } from "@/lib/site/offre";
import { schemaEtablissement } from "@/lib/site/schema";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const offre = await lireOffre();
  const des = offre.prixMin !== null ? ` dès ${formatPrix(offre.prixMin)} par mois` : "";
  return {
    title: `Tarifs des box de stockage près de Quimper${des}`,
    description: `Grille tarifaire LG BOX à Guengat : box de 2 à 20 m²${des}, sans caution, sans bail, sans frais de dossier. Disponibilités à jour.`,
    alternates: { canonical: "/tarifs" },
  };
}

const STATUT = { libre: "Libre", complet: "Complet", inconnu: "Sur demande" } as const;

export default async function Tarifs() {
  const offre = await lireOffre();
  const niveaux: Niveau[] = ["rdc", "etage"];

  return (
    <>
      <JsonLd data={schemaEtablissement(offre)} />
      <div className="s-cadre s-page-tete">
        <Fil nom="Tarifs et disponibilités" chemin="/tarifs" />
        <h1>Tarifs et disponibilités</h1>
        <p className="s-chapo">
          Un prix par mois, selon la surface et le niveau. Rien d&apos;autre à payer : ni caution,
          ni frais de dossier, ni taxe.
        </p>
        <div style={{ marginTop: "1.5rem" }}>
          <EtatGlobal offre={offre} />
        </div>
      </div>

      <section className="s-section s-section--blanche">
        <div className="s-cadre">
          <Portes offre={offre} miseAJour={horodatage()} />
        </div>
      </section>

      <section className="s-section">
        <div className="s-cadre">
          <div className="s-section__tete">
            <div>
              <h2>La grille complète</h2>
              <p>
                Tous les box font {SITE.hauteurSousPlafond} de haut : le volume compte autant que
                la surface.
              </p>
            </div>
          </div>
          <div className="s-deux">
            {niveaux.map((niveau) => {
              const lignes = offre.lignes.filter((l) => l.niveau === niveau);
              if (lignes.length === 0) return null;
              return (
                <div className="s-tableau-defile" key={niveau}>
                  <table className="s-tableau">
                    <caption>
                      {LIBELLE_NIVEAU[niveau]}, {ACCES_NIVEAU[niveau]}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Surface</th>
                        <th scope="col">Volume</th>
                        <th scope="col" className="s-facultatif">
                          Pour ranger
                        </th>
                        <th scope="col">Prix par mois</th>
                        <th scope="col">Aujourd&apos;hui</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lignes.map((l) => (
                        <tr key={l.surface}>
                          <th scope="row">{formatSurface(l.surface)}</th>
                          <td className="s-num">{volumeM3(l.surface)} m³</td>
                          <td className="s-facultatif s-discret">{contenance(l.surface)}</td>
                          <td className="s-num">{formatPrix(l.prix)}</td>
                          <td>
                            <span
                              className="s-porte__statut"
                              style={{
                                color:
                                  l.etat === "libre"
                                    ? "var(--libre)"
                                    : l.etat === "complet"
                                      ? "var(--complet)"
                                      : "var(--gris)",
                              }}
                            >
                              <span className={`s-voyant s-voyant--${l.etat}`} aria-hidden="true" />
                              {STATUT[l.etat]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="s-section s-section--blanche">
        <div className="s-cadre s-deux">
          <div className="s-texte">
            <h2 style={{ marginTop: 0 }}>Ce que le prix comprend</h2>
            <ul>
              <li>L&apos;accès à votre box 24 h/24 et 7 j/7, avec votre propre jeu de clés</li>
              <li>Les étagères et l&apos;éclairage du box</li>
              <li>La vidéosurveillance, l&apos;alarme et la détection incendie</li>
              <li>Le prêt du chariot et du diable, et le parking de déchargement</li>
            </ul>
          </div>
          <div className="s-texte">
            <h2 style={{ marginTop: 0 }}>Les conditions</h2>
            <ul>
              <li>Aucune caution, aucun bail, aucun frais de dossier</li>
              <li>Pas de durée minimale de location</li>
              <li>Fin de contrat sur simple préavis de {SITE.preavisJours} jours</li>
              <li>Le même contrat pour les particuliers et les professionnels</li>
            </ul>
            <p style={{ marginTop: "1.5rem" }}>
              <BoutonReserver />
            </p>
          </div>
        </div>
      </section>

      <AppelFinal
        titre="La surface qu'il vous faut est prise ?"
        texte="Les box tournent : un préavis ne dure que 8 jours. Dites-nous ce que vous cherchez, on vous rappelle dès qu'il se libère."
      />
    </>
  );
}
