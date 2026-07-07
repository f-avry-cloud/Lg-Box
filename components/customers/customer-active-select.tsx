"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateCustomerActiveStatus } from "@/lib/actions/customers";

export function CustomerActiveSelect({ customerId, actif }: { customerId: string; actif: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={actif ? "actif" : "inactif"}
      disabled={pending}
      onValueChange={(value) =>
        startTransition(async () => {
          const result = await updateCustomerActiveStatus(customerId, value === "actif");
          if (!result.success) {
            toast.error(result.error ?? "Erreur.");
            return;
          }
          toast.success("Statut du client mis à jour.");
        })
      }
    >
      <SelectTrigger className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="actif">Actif</SelectItem>
        <SelectItem value="inactif">Inactif</SelectItem>
      </SelectContent>
    </Select>
  );
}
