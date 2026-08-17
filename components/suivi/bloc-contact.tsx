"use client";

import { Copy, Mail, MessageSquare, Phone } from "lucide-react";
import { toast } from "sonner";

import { vibre } from "@/components/suivi/bouton-encaissement";

/**
 * Joindre quelqu'un : appeler, envoyer un SMS, écrire, copier le numéro.
 *
 * Le même bloc sert aux locataires en place et aux demandes de réservation —
 * c'est le même geste, il doit se faire pareil aux deux endroits.
 *
 * Le bouton « copier » n'est pas un ornement : iOS réserve `tel:` et `sms:` à
 * l'app d'appel par défaut du système. Un exploitant qui passe ses appels
 * depuis un second numéro (Onoff et consorts) ne peut pas s'en servir, et
 * copier le numéro est son seul chemin vers son app métier.
 */
export function BlocContact({
  telephone,
  email,
  className,
}: {
  telephone: string | null;
  email: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="grid grid-cols-3 gap-2">
        <Contact
          href={telephone ? `tel:${telephone}` : null}
          icone={<Phone className="size-5" />}
          libelle="Appeler"
        />
        <Contact
          href={telephone ? `sms:${telephone}` : null}
          icone={<MessageSquare className="size-5" />}
          libelle="SMS"
        />
        <Contact
          href={email ? `mailto:${email}` : null}
          icone={<Mail className="size-5" />}
          libelle="E-mail"
        />
      </div>

      {telephone && (
        <button
          type="button"
          onClick={async () => {
            try {
              if (!navigator.clipboard?.writeText) throw new Error("indisponible");
              await navigator.clipboard.writeText(telephone);
              vibre();
              toast.success(`${telephone} copié.`);
            } catch {
              toast.error("Copie impossible — sélectionnez le numéro à la main.");
            }
          }}
          className="suivi-tap mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold active:bg-secondary"
        >
          <Copy className="size-4" aria-hidden />
          Copier le numéro
        </button>
      )}
    </div>
  );
}

function Contact({
  href,
  icone,
  libelle,
}: {
  href: string | null;
  icone: React.ReactNode;
  libelle: string;
}) {
  if (!href) {
    return (
      <span className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-border t-meta opacity-60">
        {icone}
        {libelle}
      </span>
    );
  }

  return (
    <a
      href={href}
      className="suivi-tap flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border border-border bg-background text-xs font-semibold text-primary active:bg-secondary"
    >
      {icone}
      {libelle}
    </a>
  );
}
