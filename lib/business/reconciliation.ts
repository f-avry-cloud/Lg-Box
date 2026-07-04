// Suggestion de rapprochement : on associe une opération bancaire à la
// facture impayée dont le montant correspond exactement (± 0.01€), en
// privilégiant l'échéance la plus proche de la date de l'opération.
export function suggestInvoiceMatch<
  T extends { id: string; montant_ttc: number; date_echeance: string },
>(transaction: { montant: number; date_operation: string }, unpaidInvoices: T[]): T | null {
  const candidates = unpaidInvoices.filter((inv) => Math.abs(inv.montant_ttc - transaction.montant) < 0.01);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const opTime = new Date(transaction.date_operation).getTime();
  return candidates.reduce((closest, current) => {
    const closestDelta = Math.abs(new Date(closest.date_echeance).getTime() - opTime);
    const currentDelta = Math.abs(new Date(current.date_echeance).getTime() - opTime);
    return currentDelta < closestDelta ? current : closest;
  });
}
