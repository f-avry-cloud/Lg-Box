import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return profile;
}

export async function requireStaff(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "employee")) {
    redirect("/connexion");
  }
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    redirect("/connexion");
  }
  return profile;
}

export async function requireTenantCustomerId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/portail/connexion");

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!customer) {
    // Session valide (ex. compte staff connecté à /admin dans le même
    // navigateur) mais sans profil locataire associé. On ne peut pas
    // déconnecter ici : les cookies ne sont modifiables que depuis une
    // Server Action ou un Route Handler, jamais depuis le rendu d'un Server
    // Component — un appel direct à signOut() échoue silencieusement (voir
    // lib/supabase/server.ts) et la session reste active, d'où la boucle de
    // redirection observée entre /portail et /portail/connexion. On redirige
    // donc vers une route dédiée qui, elle, peut réellement déconnecter.
    redirect("/portail/deconnexion");
  }
  return customer.id;
}
