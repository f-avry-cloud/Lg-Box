// Géocodage via l'API Adresse du gouvernement français (Base Adresse
// Nationale) — gratuite, sans clé, limitée à la France. Convient pour
// géocoder l'adresse du site et la ville de résidence des clients.
export async function geocodeAddress(query: string): Promise<{ lat: number; lon: number } | null> {
  if (!query.trim()) return null;

  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;
    const [lon, lat] = feature.geometry.coordinates;
    return { lat, lon };
  } catch {
    return null;
  }
}
