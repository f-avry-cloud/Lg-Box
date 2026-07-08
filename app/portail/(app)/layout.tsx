import Link from "next/link";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTenantCustomerId } from "@/lib/auth";
import { signOutTenant } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/portail", label: "Mon contrat" },
  { href: "/portail/factures", label: "Mes factures" },
  { href: "/portail/documents", label: "Mes documents" },
];

export default async function PortailLayout({ children }: { children: React.ReactNode }) {
  const customerId = await getTenantCustomerId();

  // Session valide mais sans profil locataire associé (ex. un compte staff
  // connecté à /admin dans le même navigateur, qui n'a pas de fiche client).
  // On affiche un message avec une déconnexion manuelle plutôt que de
  // rediriger automatiquement vers /portail/connexion : le middleware
  // renvoie tout utilisateur déjà authentifié qui arrive sur
  // /portail/connexion vers /portail, ce qui créerait un aller-retour
  // infini entre ce layout et le middleware pour ce cas précis.
  if (!customerId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-base">Accès non configuré</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>Ce compte est connecté mais n&apos;est associé à aucun espace client.</p>
            <form action={signOutTenant}>
              <Button type="submit" variant="outline" className="w-full">
                Se déconnecter
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("prenom, nom")
    .eq("id", customerId)
    .single();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <span className="font-semibold text-primary">LG BOX</span>
          <span className="ml-2 text-sm text-muted-foreground">
            Bonjour {customer?.prenom ?? ""} {customer?.nom ?? ""}
          </span>
        </div>
        <nav className="flex items-center gap-4">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm text-muted-foreground hover:text-foreground">
              {item.label}
            </Link>
          ))}
          <form action={signOutTenant}>
            <button
              type="submit"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4" /> Déconnexion
            </button>
          </form>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
