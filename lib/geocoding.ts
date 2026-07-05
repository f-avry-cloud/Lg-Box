// Géocodage best-effort via l'API Adresse du gouvernement français
// (api-adresse.data.gouv.fr) — gratuite, sans clé, pas de configuration
// nécessaire côté Vercel. Utilisé pour situer le centre et les clients afin
// de calculer une distance moyenne sur la page Rapports.

export type Coordinates = { latitude: number; longitude: number };

export async function geocodeAddress(
  adresse?: string | null,
  codePostal?: string | null,
  ville?: string | null
): Promise<Coordinates | null> {
  const query = [adresse, codePostal, ville].filter(Boolean).join(" ").trim();
  if (!query) return null;

  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=1`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;

    const json = await res.json();
    const feature = json.features?.[0];
    if (!feature) return null;

    const [longitude, latitude] = feature.geometry.coordinates as [number, number];
    return { latitude, longitude };
  } catch {
    return null;
  }
}

export function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const earthRadiusKm = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.asin(Math.sqrt(h));
}
