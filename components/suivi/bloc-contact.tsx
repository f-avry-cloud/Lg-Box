"use client";

import { Copy, Mail, MessageSquare, Phone } from "lucide-react";
import { toast } from "sonner";

import { vibre } from "@/components/suivi/bouton-encaissement";
import {
  estIOS,
  lienAppelOnoff,
  lienSms,
  lienSmsOnoff,
  lienTel,
  nettoieNumero,
} from "@/lib/suivi/telephone";

/**
 * Joindre quelqu'un : appeler, envoyer un SMS, écrire, copier le numéro.
 *
 * Le même bloc sert aux locataires en place, aux demandes de réservation et à
 * la campagne de reprise — c'est le même geste, il doit se faire pareil
 * partout.
 *
 * **Appels et SMS passent par la ligne du centre, pas par le numéro
 * personnel.** iOS réserve `tel:` et `sms:` à l'app d'appel par défaut du
 * système : aucune page web ne peut router un appel vers Onoff. Le détour est
 * un raccourci iOS — « Appel ONOFF » et « SMS ONOFF » — que la page déclenche
 * par son schéma d'URL, et qui a le droit, lui, d'ouvrir l'app métier.
 *
 * Le lien reste un `tel:` / `sms:` ordinaire dans le HTML : c'est le repli sur
 * Android et sur ordinateur, et c'est ce qui rend l'appui long utile (copier,
 * ajouter aux contacts). Sur iOS seulement, le clic est détourné vers le
 * raccourci.
 *
 * La détection se fait **au moment du clic**, pas au rendu : le rendu est
 * alors identique côté serveur et côté navigateur — donc pas d'hydratation à
 * réconcilier — et l'appareil est de toute façon connu quand le doigt touche
 * l'écran.
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

  // Sur iOS, le clic ouvre le raccourci. Ailleurs, on laisse le lien natif
  // faire son travail — le rediriger vers `shortcuts://` n'y mènerait nulle
  // part.
  const detourne = (cible: string | null) => (evenement: React.MouseEvent) => {
    if (!cible) return;
    if (!estIOS(navigator.userAgent, navigator.maxTouchPoints)) return;
    evenement.preventDefault();
    window.location.href = cible;
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-3 gap-2">
        <Contact
          href={lienTel(numero)}
          onClick={detourne(lienAppelOnoff(numero))}
          icone={<Phone className="size-5" />}
          libelle="Appeler"
        />
        <Contact
          href={lienSms(numero)}
          onClick={detourne(lienSmsOnoff(numero))}
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
  onClick,
  icone,
  libelle,
}: {
  href: string | null;
  onClick?: (evenement: React.MouseEvent) => void;
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
      onClick={onClick}
      className="suivi-tap flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border border-border bg-background text-xs font-semibold text-primary active:bg-secondary"
    >
      {icone}
      {libelle}
    </a>
  );
}
