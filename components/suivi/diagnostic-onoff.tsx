"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { RACCOURCI_APPEL, RACCOURCI_SMS, nettoieNumero } from "@/lib/suivi/telephone";

/**
 * Banc d'essai des raccourcis Onoff — **temporaire**.
 *
 * Quatre formes d'URL, à essayer l'une après l'autre. Elles diffèrent sur deux
 * points, et ce sont les deux seuls sur lesquels la documentation d'Apple et
 * les usages constatés divergent :
 *
 *  - `run-shortcut` seul, ou passé par `x-callback-url` ;
 *  - le numéro annoncé comme source (`input=text` + `text=…`), ou posé
 *    directement dans `input`.
 *
 * L'URL est affichée en toutes lettres sous chaque bouton, et copiable : la
 * coller dans la barre d'adresse de Safari écarte l'application du test, et
 * dit si le problème vient de la page ou du raccourci lui-même.
 */
export function DiagnosticOnoff() {
  const [numero, setNumero] = useState("+33639980142");
  const [raccourci, setRaccourci] = useState(RACCOURCI_SMS);

  const propre = nettoieNumero(numero) ?? "";
  const nom = encodeURIComponent(raccourci);
  const num = encodeURIComponent(propre);

  const variantes = [
    {
      cle: "A",
      titre: "A — source annoncée",
      detail: "la forme actuellement dans l'app",
      url: `shortcuts://run-shortcut?name=${nom}&input=text&text=${num}`,
    },
    {
      cle: "B",
      titre: "B — source annoncée, via x-callback",
      detail: "même chose, en passant par x-callback-url",
      url: `shortcuts://x-callback-url/run-shortcut?name=${nom}&input=text&text=${num}`,
    },
    {
      cle: "C",
      titre: "C — numéro dans input",
      detail: "la toute première forme, si votre raccourci la lit ainsi",
      url: `shortcuts://run-shortcut?name=${nom}&input=${num}`,
    },
    {
      cle: "D",
      titre: "D — numéro dans input, via x-callback",
      detail: "la même, en x-callback-url",
      url: `shortcuts://x-callback-url/run-shortcut?name=${nom}&input=${num}`,
    },
  ];

  const copie = async (valeur: string) => {
    try {
      await navigator.clipboard.writeText(valeur);
      toast.success("URL copiée.");
    } catch {
      toast.error("Copie impossible — sélectionnez le texte à la main.");
    }
  };

  return (
    <>
      <div className="suivi-safe-top px-5 pb-3 pt-4">
        <p className="t-etiquette">Page temporaire</p>
        <h1 className="t-titre mt-0.5">Essai des raccourcis Onoff</h1>
        <p className="t-meta mt-2">
          Touchez chaque variante et dites-moi laquelle passe le numéro sans vous le redemander.
        </p>
      </div>

      <div className="suivi-scroll-simple space-y-4 px-5 pb-5">
        <div className="suivi-carte p-4">
          <label className="t-etiquette mb-1 block" htmlFor="diag-numero">
            Numéro d&apos;essai
          </label>
          <input
            id="diag-numero"
            type="tel"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            className="t-corps h-12 w-full rounded-xl border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="t-meta mt-1">
            {propre ? `Envoyé au raccourci : ${propre}` : "Aucun numéro exploitable."}
          </p>

          <span className="t-etiquette mb-1 mt-3 block">Raccourci visé</span>
          <div className="flex gap-2">
            {[RACCOURCI_SMS, RACCOURCI_APPEL].map((valeur) => (
              <button
                key={valeur}
                type="button"
                aria-pressed={raccourci === valeur}
                onClick={() => setRaccourci(valeur)}
                className={
                  raccourci === valeur
                    ? "suivi-tap t-corps min-h-11 flex-1 rounded-xl border border-primary bg-primary font-medium text-primary-foreground"
                    : "suivi-tap t-corps min-h-11 flex-1 rounded-xl border border-[var(--suivi-trait)] bg-background font-medium active:bg-secondary"
                }
              >
                {valeur}
              </button>
            ))}
          </div>
        </div>

        {variantes.map((variante) => (
          <div key={variante.cle} className="suivi-carte p-4">
            <p className="t-corps font-medium">{variante.titre}</p>
            <p className="t-meta">{variante.detail}</p>

            <a
              href={variante.url}
              className="suivi-tap t-corps mt-3 flex min-h-12 w-full items-center justify-center rounded-xl bg-primary font-medium text-primary-foreground"
            >
              Essayer {variante.cle}
            </a>

            <p className="t-meta mt-2 break-all font-mono">{variante.url}</p>

            <button
              type="button"
              onClick={() => copie(variante.url)}
              className="suivi-tap t-meta mt-2 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--suivi-trait)] active:bg-secondary"
            >
              <Copy className="size-3.5" aria-hidden />
              Copier l&apos;URL
            </button>
          </div>
        ))}

        <div className="suivi-carte p-4">
          <p className="t-corps font-medium">Si aucune ne marche</p>
          <p className="t-meta mt-1">
            Le problème est alors dans le raccourci, pas dans l&apos;app. Ouvrez « {raccourci} »
            dans Raccourcis et regardez le champ <strong>Destinataire</strong> de l&apos;action
            d&apos;envoi : s&apos;il est réglé sur <strong>« Demander à chaque fois »</strong>, iOS
            posera la question quoi qu&apos;on lui envoie. Il faut y placer la variable
            <strong> « Entrée de raccourci »</strong>.
          </p>
        </div>
      </div>
    </>
  );
}
