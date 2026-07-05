"use client";

import { useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SecurityDepositStatusBadge } from "@/components/status-badge";
import { upsertSecurityDeposit } from "@/lib/actions/security-deposit";
import type { SecurityDeposit } from "@/types/database";

export function SecurityDepositForm({
  contractId,
  customerId,
  deposit,
}: {
  contractId: string;
  customerId: string;
  deposit: SecurityDeposit | null;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await upsertSecurityDeposit(contractId, customerId, formData);
      if (!result.success) {
        toast.error(result.error ?? "Erreur.");
        return;
      }
      toast.success("Dépôt de garantie enregistré.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {deposit && (
        <div>
          <SecurityDepositStatusBadge status={deposit.status} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Montant attendu</Label>
          <Input
            name="amount_expected"
            type="number"
            step="0.01"
            min={0}
            defaultValue={deposit?.amount_expected ?? 0}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Montant reçu</Label>
          <Input
            name="amount_received"
            type="number"
            step="0.01"
            min={0}
            defaultValue={deposit?.amount_received ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Mode de paiement</Label>
          <Select name="payment_method" defaultValue={deposit?.payment_method ?? undefined}>
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="virement">Virement</SelectItem>
              <SelectItem value="carte">Carte</SelectItem>
              <SelectItem value="especes">Espèces</SelectItem>
              <SelectItem value="cheque">Chèque</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Date de réception</Label>
          <Input name="received_at" type="date" defaultValue={deposit?.received_at ?? ""} />
        </div>
      </div>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Enregistrement..." : "Enregistrer le dépôt"}
        </Button>
      </div>
    </form>
  );
}
