"use client";

import { useState, useTransition, type FormEvent } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateContractRent } from "@/lib/actions/contracts";
import { formatCurrency } from "@/lib/format";

export function RentEditForm({ contractId, currentRent }: { contractId: string; currentRent: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateContractRent(contractId, formData);
      if (!result.success) {
        toast.error(result.error ?? "Erreur.");
        return;
      }
      toast.success("Loyer mis à jour.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="size-6">
          <Pencil className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le loyer mensuel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Loyer actuel : {formatCurrency(currentRent)}/mois. Les factures déjà émises ne sont pas modifiées —
            seules les prochaines factures utiliseront le nouveau montant.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prix_mensuel">Nouveau loyer mensuel TTC</Label>
            <Input
              id="prix_mensuel"
              name="prix_mensuel"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={currentRent}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="motif">Motif (optionnel)</Label>
            <Input id="motif" name="motif" placeholder="Ex. révision annuelle, indexation..." />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
