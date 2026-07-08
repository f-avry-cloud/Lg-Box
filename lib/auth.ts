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

// Ne redirige QUE dans le cas anonyme (aucune session). Cette fonction n'est
// appelée que par les pages sous app/portail/(app)/ (protégées par ce
// groupe de routes) — /portail/connexion, elle, est un sibling en dehors du
// groupe (app) et n'est donc plus enveloppée par ce layout, ce qui évite
// toute redirection de /portail/connexion vers elle-même.
// Si une session existe mais n'est liée à aucun profil locataire (ex. un
// compte staff connecté à /admin dans le même navigateur), on ne redirige
// pas non plus — voir le commentaire dans app/portail/(app)/layout.tsx.
export async function getTenantCustomerId(): Promise<string | null> {
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

  return customer?.id ?? null;
}
