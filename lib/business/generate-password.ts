import { randomBytes } from "crypto";

// Mot de passe temporaire pour la première connexion à l'espace client —
// le locataire n'a pas à le choisir, il est généré puis communiqué par email.
export function generateTemporaryPassword(): string {
  return randomBytes(9).toString("base64url");
}
