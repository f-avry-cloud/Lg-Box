// Type de retour commun pour les Server Actions appelées directement depuis
// un composant client (hors formulaires useActionState). Next.js redacte le
// message des erreurs *jetées* (throw) par une Server Action en production
// ("An error occurred in the Server Components render..." + digest) — on
// renvoie donc toujours un résultat structuré pour que l'utilisateur voie le
// vrai message d'erreur.
export type ActionResult = { success: boolean; error?: string };

export const ok: ActionResult = { success: true };

export function fail(error: string): ActionResult {
  return { success: false, error };
}
