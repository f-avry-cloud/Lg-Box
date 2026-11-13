import { IconeAppel, IconeEmail, IconeSms } from "@/components/site/icones";
import { SITE } from "@/lib/site/config";
import { liensDemande, type Demande } from "@/lib/site/contact";

/** Les trois canaux de réservation : appeler, envoyer un SMS, écrire un e-mail. */
export function Canaux({ demande }: { demande: Demande }) {
  const liens = liensDemande(demande);
  return (
    <div className="s-canaux">
      <a className="s-canal s-canal--premier" href={liens.appel}>
        <IconeAppel />
        <strong>Appeler le {SITE.telephone}</strong>
        <span>Réponse immédiate, 7 jours sur 7</span>
      </a>
      <a className="s-canal" href={liens.sms}>
        <IconeSms />
        <strong>Envoyer un SMS</strong>
        <span>Le message est déjà rédigé, il reste à signer</span>
      </a>
      <a className="s-canal" href={liens.email}>
        <IconeEmail />
        <strong>Écrire un e-mail</strong>
        <span>{SITE.email}</span>
      </a>
    </div>
  );
}
