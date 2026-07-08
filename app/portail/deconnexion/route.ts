import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Route dédiée (et non un appel direct dans un Server Component) car les
// cookies ne peuvent être modifiés que depuis une Server Action ou un Route
// Handler — voir requireTenantCustomerId dans lib/auth.ts, qui redirige ici
// pour déconnecter une session sans profil locataire (ex. un compte staff)
// avant de renvoyer vers /portail/connexion, sinon la session reste active
// et le middleware boucle indéfiniment entre /portail et /portail/connexion.
//
// Le client Supabase est construit ici avec un cookie handler qui écrit
// directement sur l'objet `response` renvoyé, plutôt que de passer par le
// helper générique lib/supabase/server.ts (qui s'appuie sur le merge
// implicite de cookies() de Next.js — peu fiable pour un NextResponse
// construit à la main, ce qui empêchait la déconnexion de prendre effet).
export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/portail/connexion", request.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  await supabase.auth.signOut();
  return response;
}
