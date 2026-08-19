// Liens d'appel et de SMS.
//
// Retour aux liens natifs après un détour par les Raccourcis iOS : ceux-ci
// devaient router les appels vers Onoff (la ligne du centre) plutôt que vers
// le numéro personnel, mais Onoff ne se laisse pas piloter par Raccourcis.
//
// Le fond du problème n'a pas de solution propre : iOS réserve `tel:` et
// `sms:` à l'app d'appel par défaut du système, et ce réglage est **global**
// — le passer sur Onoff enverrait aussi les appels personnels sur cette
// ligne. Faute de schéma d'URL publié par Onoff, le seul chemin qui reste est
// le bouton « Copier le numéro », puis un collage dans l'app.
//
// Ce qui subsiste du détour, et qui valait la peine : le nettoyage du numéro.
// Un `tel:` contenant des espaces n'est pas toujours composé correctement.

/**
 * Réduit un numéro à ce qu'une app de téléphonie sait composer : les chiffres,
 * et le `+` s'il précède le premier chiffre.
 *
 * Espaces, points, tirets et parenthèses disparaissent. Aucune conversion de
 * forme : `0612345678` reste national, `+33612345678` reste international.
 * Deviner l'indicatif d'un numéro qu'on n'a pas saisi soi-même, c'est se
 * tromper un jour sur un numéro étranger.
 */
export function nettoieNumero(numero: string | null | undefined): string | null {
  if (!numero) return null;

  const brut = numero.trim();

  // Le `+` compte s'il précède le premier chiffre — « +33 … » comme
  // « (+33) … », qui s'écrit couramment. Un `+` situé après un chiffre est une
  // coquille, pas un indicatif : il tombe avec le reste.
  const premierChiffre = brut.search(/\d/);
  const premierPlus = brut.indexOf("+");
  const international =
    premierPlus !== -1 && (premierChiffre === -1 || premierPlus < premierChiffre);

  const chiffres = brut.replace(/\D/g, "");

  if (chiffres.length === 0) return null;

  return international ? `+${chiffres}` : chiffres;
}

export function lienTel(numero: string | null): string | null {
  const propre = nettoieNumero(numero);
  return propre ? `tel:${propre}` : null;
}

export function lienSms(numero: string | null): string | null {
  const propre = nettoieNumero(numero);
  return propre ? `sms:${propre}` : null;
}
