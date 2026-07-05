"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { refundSecurityDeposit } from "@/lib/actions/security-deposit";
import { formatCurrency } from "@/lib/format";
import type { SecurityDeposit } from "@/types/database";

export function SecurityDepositRefundForm({ deposit }: { deposit: SecurityDeposit }) {
  const [pending, startTransition] = useTransition();
  const [amountRefunded, setAmountRefunded] = useState(String(deposit.amount_received ?? 0));
  const router = useRouter();

  const isPartial = Number(amountRefunded) < (deposit.amount_received ?? 0);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await refundSecurityDeposit(deposit.id, formData);
      if (!result.success) {
        toast.error(result.error ?? "Erreur.");
        return;
      }
      toast.success("Restitution enregistrée.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-md border border-border p-3">
      <p className="text-sm font-medium">Restitution du dépôt ({formatCurrency(deposit.amount_received ?? 0)} reçu)</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Montant à restituer</Label>
          <Input
            name="amount_refunded"
            type="number"
            step="0.01"
            min={0}
            max={deposit.amount_received ?? undefined}
            value={amountRefunded}
            onChange={(e) => setAmountRefunded(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Date de restitution</Label>
          <Input name="refunded_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Motif {isPartial && "(requis, montant inférieur au montant reçu)"}</Label>
        <Textarea
          name="refund_reason"
          rows={2}
          defaultValue={deposit.refund_reason ?? ""}
          placeholder="Loyers impayés, dégradations constatées..."
        />
      </div>
      <div>
        <Button type="submit" size="sm" variant="destructive" disabled={pending}>
          {pending ? "Enregistrement..." : "Confirmer la restitution"}
        </Button>
      </div>
    </form>
  );
}
