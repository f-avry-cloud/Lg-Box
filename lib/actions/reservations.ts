"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ReservationStatus } from "@/types/database";

export async function updateReservationStatus(id: string, statut: ReservationStatus) {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("reservation_requests").update({ statut }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/reservations");
  revalidatePath("/admin");
}
