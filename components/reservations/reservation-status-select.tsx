"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateReservationStatus } from "@/lib/actions/reservations";
import type { ReservationStatus } from "@/types/database";

const OPTIONS: { value: ReservationStatus; label: string }[] = [
  { value: "nouvelle", label: "Nouvelle" },
  { value: "contactee", label: "Contactée" },
  { value: "convertie", label: "Convertie" },
  { value: "refusee", label: "Refusée" },
];

export function ReservationStatusSelect({ id, status }: { id: string; status: ReservationStatus }) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={pending}
      onValueChange={(value) =>
        startTransition(async () => {
          const result = await updateReservationStatus(id, value as ReservationStatus);
          if (!result.success) {
            toast.error(result.error ?? "Erreur.");
            return;
          }
          toast.success("Statut mis à jour.");
        })
      }
    >
      <SelectTrigger className="w-36">
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
