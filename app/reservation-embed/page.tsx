import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReservationForm } from "@/components/public/reservation-form";
import { createClient } from "@/lib/supabase/server";

// Page dépouillée (sans en-tête ni pied de page), pensée pour être intégrée
// en <iframe> sur un site existant (WordPress ou autre). Voir le README pour
// le code d'intégration.
export default async function ReservationEmbedPage() {
  const supabase = await createClient();
  const { data: pricing } = await supabase.from("pricing_grid").select("*").order("prix_mensuel");

  return (
    <div className="min-h-screen bg-transparent p-4">
      <Card className="mx-auto max-w-xl border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader>
          <CardTitle>Demander une réservation</CardTitle>
        </CardHeader>
        <CardContent>
          <ReservationForm sizes={(pricing ?? []).map((p) => p.taille_libelle)} />
        </CardContent>
      </Card>
    </div>
  );
}
