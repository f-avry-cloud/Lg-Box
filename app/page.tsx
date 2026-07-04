import Link from "next/link";
import { MapPin, Clock, Phone, Mail } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReservationForm } from "@/components/public/reservation-form";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: site } = await supabase.from("sites").select("*").limit(1).maybeSingle();
  const { data: pricing } = await supabase.from("pricing_grid").select("*").order("prix_mensuel");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <span className="font-semibold text-primary">LG BOX</span>
        <Link href="/portail/connexion" className="text-sm text-muted-foreground hover:text-foreground">
          Espace client →
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">
          Louez votre box de self-stockage en toute simplicité
        </h1>
        <p className="mt-3 text-muted-foreground">
          {site?.nom ?? "LG BOX"} — un site, des box de toutes tailles, sans engagement de durée.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {site?.adresse && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              <span>
                {site.adresse}, {site.code_postal} {site.ville}
              </span>
            </div>
          )}
          {site?.horaires && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Clock className="mt-0.5 size-4 shrink-0" />
              <span>{site.horaires}</span>
            </div>
          )}
          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {site?.telephone && (
              <span className="flex items-center gap-2">
                <Phone className="size-4 shrink-0" /> {site.telephone}
              </span>
            )}
            {site?.email_contact && (
              <span className="flex items-center gap-2">
                <Mail className="size-4 shrink-0" /> {site.email_contact}
              </span>
            )}
          </div>
        </div>

        {pricing && pricing.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-3 text-lg font-semibold">Nos tailles de box</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {pricing.map((p) => (
                <Card key={p.id}>
                  <CardContent className="p-4 text-center">
                    <p className="font-mono text-base font-semibold">{p.taille_libelle}</p>
                    <p className="mt-1 text-xs text-muted-foreground">à partir de</p>
                    <p className="text-sm font-medium text-primary">{formatCurrency(p.prix_mensuel)}/mois</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10">
          <Card>
            <CardHeader>
              <CardTitle>Demander une réservation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Indiquez-nous vos besoins, nous revenons vers vous pour finaliser votre location — sans
                paiement en ligne à cette étape.
              </p>
              <ReservationForm sizes={(pricing ?? []).map((p) => p.taille_libelle)} />
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        {site?.nom ?? "LG BOX"} — {site?.adresse}
      </footer>
    </div>
  );
}
