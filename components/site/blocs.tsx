import Link from "next/link";

import { BoutonReserver } from "@/components/site/bouton-reserver";
import { JsonLd } from "@/components/site/json-ld";
import { SITE } from "@/lib/site/config";
import type { Question } from "@/lib/site/faq";
import { schemaFil } from "@/lib/site/schema";

export function Fil({ nom, chemin }: { nom: string; chemin: string }) {
  return (
    <>
      <JsonLd data={schemaFil([{ nom, chemin }])} />
      <nav aria-label="Fil d'Ariane">
        <ol className="s-fil">
          <li>
            <Link href="/">Accueil</Link>
          </li>
          <li aria-current="page">{nom}</li>
        </ol>
      </nav>
    </>
  );
}

export function ListeFaq({ liste }: { liste: Question[] }) {
  return (
    <div className="s-faq">
      {liste.map(({ q, r }) => (
        <details key={q}>
          <summary>{q}</summary>
          <div>
            <p>{r}</p>
          </div>
        </details>
      ))}
    </div>
  );
}

export function AppelFinal({
  titre = "Un box vous attend peut-être déjà.",
  texte = "Un appel, un SMS ou un e-mail : on vous dit ce qui est libre, à quel prix, et vous venez visiter.",
}: {
  titre?: string;
  texte?: string;
}) {
  return (
    <section className="s-section s-section--blanche">
      <div className="s-cadre s-appel">
        <div>
          <h2>{titre}</h2>
          <p className="s-chapo" style={{ marginTop: "0.8rem" }}>
            {texte}
          </p>
        </div>
        <div className="s-actions" style={{ marginTop: 0 }}>
          <BoutonReserver />
          <a className="s-bouton s-bouton--calme" href={`tel:${SITE.telephoneE164}`}>
            {SITE.telephone}
          </a>
        </div>
      </div>
    </section>
  );
}
