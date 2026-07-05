// Durée de validité d'un lien de signature, en jours.
export const SIGNATURE_TOKEN_TTL_DAYS = 7;

export type SignatureTokenCheck =
  | { valid: true }
  | { valid: false; reason: "expired" | "used" };

// Un token de signature est à usage unique et expirant : une fois utilisé
// (token_used_at renseigné) ou passé sa date d'expiration, il n'est plus
// exploitable et un nouveau lien doit être généré.
export function isSignatureTokenValid(
  row: { token_expires_at: string; token_used_at: string | null },
  now: Date = new Date()
): SignatureTokenCheck {
  if (row.token_used_at) return { valid: false, reason: "used" };
  if (new Date(row.token_expires_at).getTime() < now.getTime()) return { valid: false, reason: "expired" };
  return { valid: true };
}
