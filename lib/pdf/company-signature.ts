import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type CompanySignatureImage = { data: Buffer; format: "png" | "jpg" };

// Charge l'image de signature du Loueur (LG BOX), déjà apposée sur le
// contrat plutôt que signée à chaque fois — voir Paramètres > Entreprise.
export async function loadCompanySignatureImage(
  service: SupabaseClient<Database>,
  path: string | null
): Promise<CompanySignatureImage | null> {
  if (!path) return null;
  const { data, error } = await service.storage.from("documents").download(path);
  if (error || !data) return null;
  const buffer = Buffer.from(await data.arrayBuffer());
  const format = path.toLowerCase().endsWith(".png") ? "png" : "jpg";
  return { data: buffer, format };
}
