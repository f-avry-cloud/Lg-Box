"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult } from "@/lib/actions/result";
import type { ReservationStatus } from "@/types/database";

export async function updateReservationStatus(
  id: string,
  statut: ReservationStatus
): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("reservation_requests").update({ statut }).eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/admin/reservations");
  revalidatePath("/admin");
  // L'écran mobile lit les mêmes demandes : sans cette ligne, un statut changé
  // depuis le téléphone y resterait affiché à l'ancien état.
  revalidatePath("/suivi/demandes");
  revalidatePath("/suivi/tableau-de-bord");
  return ok;
}
