"use client";

import { Copy, Mail, MessageSquare, Phone } from "lucide-react";
import { toast } from "sonner";

import { vibre } from "@/components/suivi/bouton-encaissement";
import { lienSms, lienTel, nettoieNumero } from "@/lib/suivi/telephone";

/**
 * Joindre quelqu'un : appeler, envoyer un SMS, écrire, copier le numéro.
 *
 * Le même bloc sert aux locataires en place, aux demandes de réservation et à
 * la campagne de reprise — c'est le même geste, il doit se faire pareil
 * partout.
 *
 * Liens natifs : `tel:` et `sms:` ouvrent l'app Téléphone et l'app Messages,
 * partout et sans condition.
 *
 * Un détour par les Raccourcis iOS a été tenté pour router les appels vers
 * Onoff — la ligne du centre — puis retiré : Onoff ne se laisse pas piloter
 * par Raccourcis. Régler Onoff comme app d'appel par défaut d'iOS ferait
 * l'affaire, mais ce réglage est global : les appels personnels partiraient
 * aussi de cette ligne.
 *
 * D'où l'importance du bouton « Copier le numéro » juste en dessous : c'est
 * lui le chemin vers Onoff, en deux gestes plutôt qu'un.
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
  const numero = nettoieNumero(telephone);

  return (
    <div className={className}>
      <div className="grid grid-cols-3 gap-2">
        <Contact
          href={lienTel(numero)}
          icone={<Phone className="size-5" />}
          libelle="Appeler"
        />
        <Contact
          href={lienSms(numero)}
          icone={<MessageSquare className="size-5" />}
          libelle="SMS"
        />
        <Contact
          href={email ? `mailto:${email}` : null}
          icone={<Mail className="size-5" />}
          libelle="E-mail"
        />
      </div>

      {numero && (
        <button
          type="button"
          onClick={async () => {
            try {
              if (!navigator.clipboard?.writeText) throw new Error("indisponible");
              await navigator.clipboard.writeText(numero);
              vibre();
              toast.success(`${numero} copié.`);
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
      <span className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-border text-xs text-[var(--suivi-gris)] opacity-60">
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
