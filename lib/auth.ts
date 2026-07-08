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

// Ne redirige QUE dans le cas anonyme (aucune session) : c'est un vrai
// aiguillage terminal pour un visiteur non connecté, sans risque de boucle.
// Si une session existe mais n'est liée à aucun profil locataire (ex. un
// compte staff connecté à /admin dans le même navigateur), on ne redirige
// plus du tout — voir le commentaire détaillé dans app/portail/layout.tsx
// sur pourquoi cette redirection automatique causait un enchaînement de
// redirections imprévisible avec ce moteur de rendu.
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
