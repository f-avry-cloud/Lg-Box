import { Button } from "@/components/ui/button";

// TODO V2: intégrer Stripe (Payment Links ou Stripe Billing pour les
// prélèvements récurrents) et activer ce bouton pour le paiement en ligne.
export function PaymentButton() {
  return (
    <Button disabled size="sm" title="Paiement en ligne disponible en V2">
      Payer en ligne (bientôt disponible)
    </Button>
  );
}
