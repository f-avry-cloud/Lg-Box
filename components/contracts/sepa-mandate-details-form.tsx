"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateContractSepaDetails } from "@/lib/actions/sepa-mandate";
import type { Contract } from "@/types/database";

export function SepaMandateDetailsForm({ contract }: { contract: Contract }) {
  const [iban, setIban] = useState(contract.iban ?? "");
  const [bic, setBic] = useState(contract.bic ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateContractSepaDetails(contract.id, formData);
      if (!result.success) {
        toast.error(result.error ?? "Erreur.");
        return;
      }
      toast.success("Coordonnées bancaires enregistrées.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>IBAN</Label>
          <Input name="iban" value={iban} onChange={(e) => setIban(e.target.value)} placeholder="FR76..." />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>BIC</Label>
          <Input name="bic" value={bic} onChange={(e) => setBic(e.target.value)} />
        </div>
      </div>
      {contract.rum && (
        <p className="text-xs text-muted-foreground">
          RUM (Référence Unique de Mandat) : <span className="font-mono">{contract.rum}</span>
        </p>
      )}
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Enregistrement..." : "Enregistrer l'IBAN/BIC"}
        </Button>
      </div>
    </form>
  );
}
