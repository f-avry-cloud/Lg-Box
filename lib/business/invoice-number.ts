// Numérotation séquentielle des factures (obligation légale française :
// chronologique, continue, sans trou ni doublon). On dérive le prochain
// numéro du plus grand suffixe déjà attribué, tous exercices confondus,
// pour garantir la continuité même au changement d'année.
export function nextInvoiceNumber(existingNumbers: string[], emissionDate: Date): string {
  const lastSequence = existingNumbers.reduce((max, numero) => {
    const suffix = numero.split("-").pop();
    const value = suffix ? parseInt(suffix, 10) : NaN;
    return Number.isNaN(value) ? max : Math.max(max, value);
  }, 0);

  const nextSequence = lastSequence + 1;
  const year = emissionDate.getFullYear();
  return `FA-${year}-${String(nextSequence).padStart(5, "0")}`;
}
