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
    // navigateur) mais sans profil locataire associé : on déconnecte avant de
    // rediriger, sinon le middleware ne fait que vérifier la présence d'une
    // session et renvoie indéfiniment vers /portail → boucle de redirection
    // ("this page couldn't load" côté navigateur).
    await supabase.auth.signOut();
    redirect("/portail/connexion");
  }
  return customer.id;
}
