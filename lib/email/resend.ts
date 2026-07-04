import { Resend } from "resend";

let client: Resend | null = null;

export function getResend(): Resend {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "LG BOX <onboarding@resend.dev>";
