"use client";

import { useTransition, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateUnitZone, KNOWN_ZONES } from "@/lib/actions/units";

export function UnitZoneSelect({ unitId, zone }: { unitId: string; zone: string | null }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // Garde la valeur actuelle sélectionnable même si elle sort des 6 bâtiments
  // connus (ex. "À localiser" pour un box provisoire pas encore rattaché).
  const options = useMemo(() => {
    const known = KNOWN_ZONES.map((z) => z.value);
    if (zone && !known.includes(zone)) return [zone, ...known];
    return known;
  }, [zone]);

  return (
    <Select
      value={zone ?? ""}
      disabled={pending}
      onValueChange={(value) =>
        startTransition(async () => {
          const result = await updateUnitZone(unitId, value);
          if (!result.success) {
            toast.error(result.error ?? "Erreur.");
            return;
          }
          toast.success("Bâtiment mis à jour.");
          router.refresh();
        })
      }
    >
      <SelectTrigger className="w-44">
        <SelectValue placeholder="Choisir un bâtiment" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
