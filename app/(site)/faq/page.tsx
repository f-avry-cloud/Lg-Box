import type { Metadata } from "next";

import { AppelFinal, Fil, ListeFaq } from "@/components/site/blocs";
import { JsonLd } from "@/components/site/json-ld";
import { lireOffre } from "@/lib/site/data";
import { questions } from "@/lib/site/faq";
import { schemaFaq } from "@/lib/site/schema";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Questions fréquentes sur la location de box",
  description:
    "Prix, disponibilités, accès, sécurité, caution, préavis : les réponses aux questions qu'on nous pose avant de louer un box de stockage chez LG BOX, près de Quimper.",
  alternates: { canonical: "/faq" },
};

export default async function Faq() {
  const faq = questions(await lireOffre());
  return (
    <>
      <JsonLd data={schemaFaq(faq)} />
      <div className="s-cadre s-page-tete">
        <Fil nom="Questions fréquentes" chemin="/faq" />
        <h1>Les questions qu&apos;on nous pose</h1>
        <p className="s-chapo">
          Les prix et les disponibilités cités ici sont ceux du jour : ils viennent du registre
          du centre.
        </p>
      </div>
      <section className="s-section s-section--blanche">
        <div className="s-cadre" style={{ maxWidth: "56rem" }}>
          <ListeFaq liste={faq} />
        </div>
      </section>
      <AppelFinal titre="Votre question n'est pas dans la liste ?" texte="Posez-la directement : par téléphone, SMS ou e-mail, on vous répond 7 jours sur 7." />
    </>
  );
}
