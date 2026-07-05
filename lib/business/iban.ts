// Validation IBAN par la clé de contrôle mod-97 (ISO 7064), indépendante de
// tout accès réseau — suffisant pour détecter une faute de saisie avant
// d'enregistrer un mandat de prélèvement SEPA.
export function isValidIban(rawIban: string): boolean {
  const iban = rawIban.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;

  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (letter) => String(letter.charCodeAt(0) - 55));

  // mod 97 sur un très grand nombre : on réduit progressivement par blocs.
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    remainder = Number(`${remainder}${numeric.slice(i, i + 7)}`) % 97;
  }
  return remainder === 1;
}

// Référence Unique de Mandat : préfixe fixe + identifiant du contrat, pour
// rester stable et traçable sans dépendre d'un compteur externe.
export function generateRum(contractId: string): string {
  return `LGBOX${contractId.replace(/-/g, "").toUpperCase().slice(0, 20)}`;
}
