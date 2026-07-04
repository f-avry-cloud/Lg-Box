// Calcul de la date de fin de contrat suite à une demande de résiliation,
// en fonction du préavis contractuel.
export function computeNoticeEndDate(requestDate: Date, noticeDays: number): Date {
  const end = new Date(requestDate);
  end.setUTCDate(end.getUTCDate() + noticeDays);
  return end;
}

export function daysUntil(date: Date, from: Date = new Date()): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const end = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((end - start) / msPerDay);
}
