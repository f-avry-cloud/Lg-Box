"use server";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/geocoding";
import { haversineDistanceKm } from "@/lib/business/distance";
import { ok, fail, type ActionResult } from "@/lib/actions/result";

export type DistanceStatsResult = ActionResult & {
  averageKm?: number;
  tenantsUsed?: number;
  tenantsSkipped?: number;
};

// Calcule la distance moyenne (à vol d'oiseau) entre le site et la ville de
// résidence de chaque locataire actuel. Géocode et met en cache les
// coordonnées manquantes (site + clients) via l'API Adresse (data.gouv.fr).
export async function computeAverageTenantDistance(): Promise<DistanceStatsResult> {
  await requireStaff();
  const supabase = await createClient();

  const { data: site } = await supabase.from("sites").select("*").limit(1).single();
  if (!site) return fail("Aucun site configuré.");

  let siteLat = site.latitude;
  let siteLon = site.longitude;
  if (siteLat === null || siteLon === null) {
    const query = [site.adresse, site.code_postal, site.ville].filter(Boolean).join(", ");
    const coords = await geocodeAddress(query || site.nom);
    if (!coords) {
      return fail(
        "Impossible de géocoder l'adresse du site — vérifiez qu'elle est renseignée dans Paramètres."
      );
    }
    siteLat = coords.lat;
    siteLon = coords.lon;
    await supabase.from("sites").update({ latitude: siteLat, longitude: siteLon }).eq("id", site.id);
  }

  const { data: activeContracts } = await supabase
    .from("contracts")
    .select("customer_id")
    .in("statut", ["actif", "en_preavis"]);
  const tenantCustomerIds = [...new Set((activeContracts ?? []).map((c) => c.customer_id))];
  if (tenantCustomerIds.length === 0) return { ...ok, averageKm: 0, tenantsUsed: 0, tenantsSkipped: 0 };

  const { data: customers } = await supabase
    .from("customers")
    .select("id, ville, code_postal, latitude, longitude")
    .in("id", tenantCustomerIds);

  const distances: number[] = [];
  let skipped = 0;

  for (const customer of customers ?? []) {
    let lat = customer.latitude;
    let lon = customer.longitude;

    if (lat === null || lon === null) {
      if (!customer.ville) {
        skipped += 1;
        continue;
      }
      const query = [customer.ville, customer.code_postal, "France"].filter(Boolean).join(", ");
      const coords = await geocodeAddress(query);
      if (!coords) {
        skipped += 1;
        continue;
      }
      lat = coords.lat;
      lon = coords.lon;
      await supabase.from("customers").update({ latitude: lat, longitude: lon }).eq("id", customer.id);
    }

    distances.push(haversineDistanceKm(siteLat, siteLon, lat, lon));
  }

  if (distances.length === 0) {
    return fail("Aucun locataire avec une ville renseignée n'a pu être géocodé.");
  }

  const averageKm = distances.reduce((sum, d) => sum + d, 0) / distances.length;

  return { ...ok, averageKm: Math.round(averageKm * 10) / 10, tenantsUsed: distances.length, tenantsSkipped: skipped };
}
