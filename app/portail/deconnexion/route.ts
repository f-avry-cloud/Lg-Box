import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Route dédiée (et non un appel direct dans un Server Component) car les
// cookies ne peuvent être modifiés que depuis une Server Action ou un Route
// Handler — voir requireTenantCustomerId dans lib/auth.ts, qui redirige ici
// pour déconnecter une session sans profil locataire (ex. un compte staff)
// avant de renvoyer vers /portail/connexion, sinon la session reste active
// et le middleware boucle indéfiniment entre /portail et /portail/connexion.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/portail/connexion", request.url));
}
