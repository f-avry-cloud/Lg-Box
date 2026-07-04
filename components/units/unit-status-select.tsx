"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateUnitStatus } from "@/lib/actions/units";
import type { UnitStatus } from "@/types/database";

const OPTIONS: { value: UnitStatus; label: string }[] = [
  { value: "libre", label: "Libre" },
  { value: "loue", label: "Loué" },
  { value: "reserve", label: "Réservé" },
  { value: "hors_service", label: "Hors service" },
];

export function UnitStatusSelect({ unitId, status }: { unitId: string; status: UnitStatus }) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={pending}
      onValueChange={(value) =>
        startTransition(async () => {
          try {
            await updateUnitStatus(unitId, value as UnitStatus);
            toast.success("Statut du box mis à jour.");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Erreur.");
          }
        })
      }
    >
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
