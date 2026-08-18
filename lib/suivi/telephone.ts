// Appeler et envoyer un SMS depuis la ligne du centre, pas depuis le numéro
// personnel.
//
// iOS réserve `tel:` et `sms:` à l'app d'appel par défaut du système : aucune
// page web ne peut router un appel vers une app tierce. Le contournement est
// un **raccourci iOS**, que l'exploitant a créé de son côté et que la page
// déclenche par son schéma d'URL — le raccourci, lui, a le droit d'ouvrir
// Onoff avec le numéro.
//
// Deux raccourcis, un par geste :
//
//   Appel ONOFF   — passe l'appel
//   SMS ONOFF     — ouvre la conversation
//
// Ils reçoivent le numéro en **entrée texte**. C'est la variable que le
// raccourci nomme [NUMERO] côté iOS.

/** Noms exacts des raccourcis, tels qu'ils apparaissent dans l'app Raccourcis. */
export const RACCOURCI_APPEL = "Appel ONOFF";
export const RACCOURCI_SMS = "SMS ONOFF";

/**
 * Réduit un numéro à ce qu'une app de téléphonie sait composer : les chiffres,
 * et le `+` initial s'il y en a un.
 *
 * Espaces, points, tirets, parenthèses et points de suite disparaissent. Un
 * espace laissé dans l'entrée d'un raccourci suffit à faire échouer la
 * composition, sans message d'erreur — c'est le genre de panne qu'on met une
 * heure à comprendre.
 *
 * Aucune conversion de forme : `0612345678` reste national, `+33612345678`
 * reste international. Deviner l'indicatif d'un numéro qu'on n'a pas saisi
 * soi-même, c'est se tromper un jour sur un numéro étranger.
 */
export function nettoieNumero(numero: string | null | undefined): string | null {
  if (!numero) return null;

  const brut = numero.trim();

  // Le `+` compte s'il précède le premier chiffre — « +33 … » comme
  // « (+33) … », qui s'écrit couramment. Un `+` situé après un chiffre est une
  // coquille, pas un indicatif : il tombe avec le reste.
  const premierChiffre = brut.search(/\d/);
  const premierPlus = brut.indexOf("+");
  const international = premierPlus !== -1 && (premierChiffre === -1 || premierPlus < premierChiffre);

  const chiffres = brut.replace(/\D/g, "");

  if (chiffres.length === 0) return null;

  return international ? `+${chiffres}` : chiffres;
}

/**
 * L'URL qui déclenche un raccourci iOS, numéro passé en entrée.
 *
 * Deux paramètres, et pas un seul — c'est le piège du schéma :
 *
 *   `input` ne porte pas le contenu, il porte le **type de source** :
 *   `text` ou `clipboard`. Le contenu, lui, voyage dans `text`.
 *
 * Y mettre le numéro directement (`input=+33612345678`) ne produit aucune
 * erreur visible : iOS ne reconnaît pas de source valide, lance le raccourci
 * **sans entrée**, et l'action qui référence « Entrée de raccourci » réclame
 * alors la valeur manquante dans une fenêtre qui ne mène nulle part.
 *
 * `encodeURIComponent` est indispensable sur les deux valeurs : le nom
 * contient une espace, et le numéro un `+` — qui, non encodé, serait relu
 * comme une espace par l'analyseur de la chaîne de requête.
 */
export function lienRaccourci(nomRaccourci: string, numero: string | null): string | null {
  const propre = nettoieNumero(numero);
  if (!propre) return null;

  return `shortcuts://run-shortcut?name=${encodeURIComponent(
    nomRaccourci
  )}&input=text&text=${encodeURIComponent(propre)}`;
}

export function lienAppelOnoff(numero: string | null): string | null {
  return lienRaccourci(RACCOURCI_APPEL, numero);
}

export function lienSmsOnoff(numero: string | null): string | null {
  return lienRaccourci(RACCOURCI_SMS, numero);
}

/** Liens natifs, gardés comme repli hors iOS et comme cible du lien lui-même. */
export function lienTel(numero: string | null): string | null {
  const propre = nettoieNumero(numero);
  return propre ? `tel:${propre}` : null;
}

export function lienSms(numero: string | null): string | null {
  const propre = nettoieNumero(numero);
  return propre ? `sms:${propre}` : null;
}

/**
 * iPhone ou iPad ?
 *
 * Les iPad récents annoncent « Macintosh » : on les reconnaît au fait qu'ils
 * ont un écran tactile, ce qu'aucun Mac n'a. Le test sert seulement à décider
 * si l'on tente le raccourci ; se tromper ne casse rien, puisque le lien natif
 * reste posé en dessous.
 */
export function estIOS(userAgent: string, pointsDeContact = 0): boolean {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true;
  return /Macintosh/i.test(userAgent) && pointsDeContact > 1;
}
