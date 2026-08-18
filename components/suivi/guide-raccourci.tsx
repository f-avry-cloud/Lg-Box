"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { RACCOURCI_APPEL, RACCOURCI_SMS } from "@/lib/suivi/telephone";
import { cn } from "@/lib/utils";

/**
 * Mode d'emploi du raccourci — **temporaire**, avec le banc d'essai.
 *
 * Il vit dans l'app et non dans la documentation du dépôt parce que c'est sur
 * le téléphone qu'on configure un raccourci : une notice lisible ailleurs
 * oblige à faire l'aller-retour entre deux écrans, et c'est précisément dans
 * cet aller-retour qu'on saute l'étape qui compte.
 */
export function GuideRaccourci() {
  const [ouvert, setOuvert] = useState<string | null>("principe");

  const bascule = (cle: string) => setOuvert(ouvert === cle ? null : cle);

  return (
    <div className="space-y-2">
      <Section
        cle="principe"
        titre="Ce que la page envoie, et ce que le raccourci doit en faire"
        ouvert={ouvert === "principe"}
        onBascule={bascule}
      >
        <p>
          Quand vous touchez « Appeler » ou « SMS », la page ouvre l&apos;app Raccourcis et lui
          transmet <strong>un texte</strong> : le numéro, sans espace.
        </p>
        <p>
          Ce texte arrive dans le raccourci sous le nom <strong>« Entrée de raccourci »</strong>.
          Tout le travail de configuration consiste à faire descendre cette entrée jusqu&apos;au
          champ Destinataire de l&apos;action Onoff.
        </p>
        <p className="rounded-lg bg-[var(--suivi-orange)]/10 px-3 py-2 text-[var(--suivi-orange)]">
          La fenêtre « Destinataire » que vous voyez signifie que ce champ est réglé sur
          <strong> « Demander à chaque fois »</strong>. iOS pose alors la question quoi
          qu&apos;on lui envoie — et valider à vide ne produit rien, puisqu&apos;il n&apos;y a pas
          de destinataire.
        </p>
      </Section>

      <Section
        cle="sms"
        titre={`Monter « ${RACCOURCI_SMS} », étape par étape`}
        ouvert={ouvert === "sms"}
        onBascule={bascule}
      >
        <Etape n={1}>
          Dans <strong>Raccourcis</strong>, créez un raccourci et nommez-le exactement{" "}
          <strong>{RACCOURCI_SMS}</strong> — majuscules et espace comprises. Le nom est ce que la
          page appelle : une lettre de différence et rien ne se déclenche.
        </Etape>
        <Etape n={2}>
          Première action : cherchez <strong>« Texte »</strong> et ajoutez-la. Touchez le champ
          vide, puis, dans la barre au-dessus du clavier, choisissez la variable{" "}
          <strong>« Entrée de raccourci »</strong>. Le champ doit afficher un jeton bleu, pas du
          texte tapé.
        </Etape>
        <Etape n={3}>
          Deuxième action : <strong>« Définir la variable »</strong>. Nommez-la{" "}
          <strong>NUMERO</strong>, et laissez sa valeur sur le résultat de l&apos;action Texte.
        </Etape>
        <Etape n={4}>
          Troisième action : cherchez <strong>Onoff</strong>{" "}
          dans la recherche d&apos;actions et prenez son action d&apos;envoi de message. C&apos;est l&apos;étape à vérifier en premier
          — voir la section suivante si Onoff n&apos;apparaît pas.
        </Etape>
        <Etape n={5}>
          Dans cette action, touchez le champ <strong>Destinataire</strong>. S&apos;il contient
          « Demander à chaque fois », <strong>supprimez ce jeton</strong>, puis insérez la
          variable <strong>NUMERO</strong>. C&apos;est l&apos;étape qui manque presque toujours.
        </Etape>
        <Etape n={6}>
          Touchez le <strong>(i)</strong> en bas, et désactivez{" "}
          <strong>« Demander avant d&apos;exécuter »</strong>. Sinon iOS ajoute une confirmation à
          chaque appel.
        </Etape>
      </Section>

      <Section
        cle="appel"
        titre={`Et « ${RACCOURCI_APPEL} »`}
        ouvert={ouvert === "appel"}
        onBascule={bascule}
      >
        <p>
          Exactement les mêmes six étapes, avec deux différences : le nom du raccourci est{" "}
          <strong>{RACCOURCI_APPEL}</strong>, et la troisième action est celle{" "}
          <strong>d&apos;appel</strong> d&apos;Onoff au lieu de celle d&apos;envoi de message.
        </p>
        <p>
          Le champ à remplir peut s&apos;y appeler « Numéro » plutôt que « Destinataire ». La
          règle ne change pas : il doit contenir la variable NUMERO, pas « Demander à chaque
          fois ».
        </p>
      </Section>

      <Section
        cle="essai"
        titre="Vérifier le raccourci sans passer par l'app"
        ouvert={ouvert === "essai"}
        onBascule={bascule}
      >
        <p>
          Dans Raccourcis, ouvrez votre raccourci et lancez-le avec le bouton{" "}
          <strong>▶︎</strong>. Comme il n&apos;y a alors aucune entrée, iOS doit vous demander le
          texte : c&apos;est normal, et c&apos;est bon signe — cela prouve que le raccourci
          <em> lit</em> bien son entrée. Tapez un numéro, et le message doit s&apos;ouvrir dans
          Onoff.
        </p>
        <p>
          Si à ce stade le message ne s&apos;ouvre pas, le problème est dans le raccourci et
          aucune URL ne le corrigera.
        </p>
        <p>
          Ensuite, revenez ici et essayez les quatre variantes ci-dessous : elles se distinguent
          par la façon dont le numéro est transmis, et l&apos;une d&apos;elles conviendra.
        </p>
      </Section>

      <Section
        cle="onoff"
        titre="Si Onoff n'apparaît pas dans les actions"
        ouvert={ouvert === "onoff"}
        onBascule={bascule}
      >
        <p>
          C&apos;est le cas qui bloquerait tout, et il faut le savoir tôt :{" "}
          <strong>une app ne peut être pilotée par Raccourcis que si elle le prévoit</strong>. Si
          Onoff n&apos;expose aucune action, aucun réglage ne fera partir un SMS depuis sa ligne.
        </p>
        <p>
          Pour le vérifier : dans un raccourci, touchez « Ajouter une action » et tapez{" "}
          <strong>Onoff</strong>. Soit ses actions apparaissent, soit il n&apos;y a rien.
        </p>
        <p>
          S&apos;il n&apos;y a rien, le repli reste le bouton{" "}
          <strong>« Copier le numéro »</strong> de l&apos;app : un tap pour copier, puis coller
          dans Onoff. C&apos;est moins direct, mais c&apos;est fiable — et c&apos;est pour cela
          que ce bouton existe depuis le début.
        </p>
        <p>
          Dites-moi ce que la recherche affiche : si Onoff propose des actions, je peux adapter la
          page à ce qu&apos;elles attendent.
        </p>
      </Section>
    </div>
  );
}

function Section({
  cle,
  titre,
  ouvert,
  onBascule,
  children,
}: {
  cle: string;
  titre: string;
  ouvert: boolean;
  onBascule: (cle: string) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="suivi-carte overflow-hidden">
      <button
        type="button"
        aria-expanded={ouvert}
        onClick={() => onBascule(cle)}
        className="suivi-tap flex min-h-12 w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="t-corps font-medium">{titre}</span>
        <ChevronDown
          className={cn("size-4 shrink-0 transition-transform", ouvert && "rotate-180")}
          aria-hidden
        />
      </button>
      {ouvert && <div className="t-meta space-y-2 px-4 pb-4">{children}</div>}
    </section>
  );
}

function Etape({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1">
      <span
        aria-hidden
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--secondary)] text-xs font-semibold text-[var(--foreground)]"
      >
        {n}
      </span>
      <p className="flex-1">{children}</p>
    </div>
  );
}
