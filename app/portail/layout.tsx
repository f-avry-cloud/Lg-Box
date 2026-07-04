import Link from "next/link";
import { LogOut } from "lucide-react";

import { requireTenantCustomerId } from "@/lib/auth";
import { signOutTenant } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/portail", label: "Mon contrat" },
  { href: "/portail/factures", label: "Mes factures" },
  { href: "/portail/documents", label: "Mes documents" },
];

export default async function PortailLayout({ children }: { children: React.ReactNode }) {
  const customerId = await requireTenantCustomerId();
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
