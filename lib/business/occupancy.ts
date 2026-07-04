export type OccupancyPoint = { month: string; rate: number };

// Reconstitue le taux d'occupation mois par mois sur la base des dates de
// contrat (un contrat occupe son box sur [date_debut, date_fin ou aujourd'hui]).
// Les contrats en "brouillon" n'ont jamais occupé le box.
export function computeMonthlyOccupancy(
  contracts: { date_debut: string; date_fin: string | null; statut: string }[],
  totalUnits: number,
  monthsBack = 12
): OccupancyPoint[] {
  if (totalUnits === 0) return [];

  const occupying = contracts.filter((c) => c.statut !== "brouillon");
  const now = new Date();
  const points: OccupancyPoint[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth() - i, 1));
    const monthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() - i + 1, 0));

    const occupiedUnits = new Set<string>();
    occupying.forEach((c, index) => {
      const start = new Date(c.date_debut);
      const end = c.date_fin ? new Date(c.date_fin) : null;
      if (start <= monthEnd && (!end || end >= monthStart)) {
        occupiedUnits.add(`${index}`);
      }
    });

    points.push({
      month: monthStart.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      rate: Math.round((occupiedUnits.size / totalUnits) * 100),
    });
  }

  return points;
}
