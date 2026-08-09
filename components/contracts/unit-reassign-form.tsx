"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateContractUnit } from "@/lib/actions/contracts";
import type { Unit, UnitStatus } from "@/types/database";

const STATUS_LABELS: Record<UnitStatus, string> = {
  libre: "libre",
  loue: "loué",
  reserve: "réservé",
  hors_service: "hors service",
};

export function UnitReassignForm({
  contractId,
  currentUnitId,
  units,
}: {
  contractId: string;
  currentUnitId: string;
  units: Pick<Unit, "id" | "numero" | "zone" | "statut">[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    if (!selected) return;
    startTransition(async () => {
      const result = await updateContractUnit(contractId, selected);
      if (!result.success) {
        toast.error(result.error ?? "Erreur.");
        return;
      }
      toast.success("Box du contrat mis à jour.");
      setOpen(false);
      setSelected("");
      router.refresh();
    });
  }

  const otherUnits = units.filter((u) => u.id !== currentUnitId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="size-6">
          <Pencil className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Changer le box de ce contrat</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Si l&apos;ancien box était provisoire (zone « À localiser »), il sera libéré — tu pourras le
            supprimer ensuite depuis sa fiche.
          </p>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un box" />
            </SelectTrigger>
            <SelectContent>
              {otherUnits.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.numero} — {u.zone ?? "—"} ({STATUS_LABELS[u.statut]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={!selected || pending}>
              {pending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
