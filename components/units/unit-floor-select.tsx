"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateUnitFloor } from "@/lib/actions/units";
import type { UnitFloor } from "@/types/database";

const OPTIONS: { value: UnitFloor; label: string }[] = [
  { value: "sous_sol", label: "Sous-sol" },
  { value: "rez_de_chaussee", label: "Rez-de-chaussée" },
  { value: "premier_etage", label: "1er étage" },
];

export function UnitFloorSelect({ unitId, floor }: { unitId: string; floor: UnitFloor }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Select
      value={floor}
      disabled={pending}
      onValueChange={(value) =>
        startTransition(async () => {
          try {
            await updateUnitFloor(unitId, value as UnitFloor);
            toast.success("Étage mis à jour — repositionnez le box dans le plan si besoin.");
            router.refresh();
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
