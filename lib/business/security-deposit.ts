import type { SecurityDepositStatus } from "@/types/database";

// Statut du dépôt après restitution : intégral, partiel (nécessite un motif)
// ou entièrement retenu.
export function computeDepositStatusAfterRefund(
  amountReceived: number,
  amountRefunded: number
): SecurityDepositStatus {
  if (amountRefunded <= 0) return "retenu";
  if (amountRefunded >= amountReceived) return "rembourse";
  return "partiellement_rembourse";
}

export type RefundValidation = { valid: true } | { valid: false; error: string };

// Un motif est obligatoire dès que le montant restitué est inférieur au
// montant reçu (loyers impayés, dégradations...), et le montant restitué ne
// peut jamais être négatif ni dépasser le montant reçu.
export function validateRefund(input: {
  amountReceived: number;
  amountRefunded: number;
  reason: string;
}): RefundValidation {
  if (input.amountRefunded < 0) {
    return { valid: false, error: "Le montant restitué ne peut pas être négatif." };
  }
  if (input.amountRefunded > input.amountReceived) {
    return { valid: false, error: "Le montant restitué ne peut pas dépasser le montant reçu." };
  }
  if (input.amountRefunded < input.amountReceived && !input.reason.trim()) {
    return {
      valid: false,
      error: "Un motif est requis lorsque le montant restitué est inférieur au montant reçu.",
    };
  }
  return { valid: true };
}
