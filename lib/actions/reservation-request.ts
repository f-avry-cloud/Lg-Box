"use server";

import { createClient } from "@/lib/supabase/server";
import { getResend, FROM_EMAIL } from "@/lib/email/resend";

export type ReservationRequestState = { error: string | null; success?: boolean };

export async function createReservationRequest(
  _prevState: ReservationRequestState,
  formData: FormData
): Promise<ReservationRequestState> {
  const supabase = await createClient();

  const nom = String(formData.get("nom") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!nom || !email) return { error: "Merci de renseigner votre nom et votre email." };

  const { error } = await supabase.from("reservation_requests").insert({
    nom,
    email,
    telephone: String(formData.get("telephone") ?? "") || null,
    taille_souhaitee: String(formData.get("taille_souhaitee") ?? "") || null,
    date_souhaitee: String(formData.get("date_souhaitee") ?? "") || null,
    message: String(formData.get("message") ?? "") || null,
  });

  if (error) return { error: "Une erreur est survenue, merci de réessayer." };

  const { data: site } = await supabase.from("sites").select("email_contact").limit(1).single();
  if (process.env.RESEND_API_KEY && site?.email_contact) {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: site.email_contact,
      subject: `Nouvelle demande de réservation — ${nom}`,
      text: `${nom} (${email}${formData.get("telephone") ? ", " + formData.get("telephone") : ""}) demande un box${
        formData.get("taille_souhaitee") ? " de " + formData.get("taille_souhaitee") : ""
      }.\n\nMessage : ${formData.get("message") ?? "—"}\n\nÀ traiter dans le back-office LG BOX.`,
    });
  }

  return { error: null, success: true };
}
