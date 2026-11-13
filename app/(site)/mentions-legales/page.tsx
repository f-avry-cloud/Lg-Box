import type { Metadata } from "next";

import { Fil } from "@/components/site/blocs";
import { ADRESSE_LIGNE, SITE } from "@/lib/site/config";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales du site lg-box.fr : éditeur, hébergeur, données personnelles.",
  alternates: { canonical: "/mentions-legales" },
};

export default function Mentions() {
  return (
    <div className="s-cadre s-page-tete" style={{ paddingBottom: "4rem" }}>
      <Fil nom="Mentions légales" chemin="/mentions-legales" />
      <h1>Mentions légales</h1>
      <div className="s-texte" style={{ marginTop: "2rem" }}>
        <h2>Éditeur du site</h2>
        <p>
          {SITE.raisonSociale}
          <br />
          {ADRESSE_LIGNE}
          <br />
          SIRET {SITE.siret}
          <br />
          Téléphone : <a href={`tel:${SITE.telephoneE164}`}>{SITE.telephone}</a>
          <br />
          E-mail : <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </p>

        <h2>Hébergement</h2>
        <p>
          Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis. Les données de
          l&apos;application sont hébergées par Supabase dans l&apos;Union européenne.
        </p>

        <h2>Données personnelles</h2>
        <p>
          Les informations saisies dans le formulaire de demande (nom, e-mail, téléphone, message)
          servent uniquement à répondre à votre demande de location. Elles ne sont ni cédées ni
          utilisées à des fins publicitaires. Vous pouvez demander leur consultation, leur
          rectification ou leur suppression en écrivant à{" "}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
        </p>
        <p>Ce site ne dépose aucun cookie publicitaire ni traceur de mesure d&apos;audience.</p>

        <h2>Tarifs et disponibilités</h2>
        <p>
          Les tarifs et les disponibilités affichés sont tenus à jour par le centre et donnés à
          titre indicatif : seule la confirmation du centre, puis le contrat de location signé,
          engagent les parties.
        </p>
      </div>
    </div>
  );
}
