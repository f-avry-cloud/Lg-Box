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
import { updateUnitPrice } from "@/lib/actions/units";

export function UnitPriceEditForm({ unitId, prixMensuelStandard }: { unitId: string; prixMensuelStandard: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const value = Number(formData.get("prix_mensuel_standard"));
    startTransition(async () => {
      const result = await updateUnitPrice(unitId, value);
      if (!result.success) {
        toast.error(result.error ?? "Erreur.");
        return;
      }
      toast.success("Prix mis à jour.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="size-11 sm:size-6">
          <Pencil className="size-5 sm:size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le prix standard du box</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prix_mensuel_standard">Prix mensuel standard</Label>
            <Input
              id="prix_mensuel_standard"
              name="prix_mensuel_standard"
              type="number"
              step="0.01"
              min="0"
              defaultValue={prixMensuelStandard}
              required
            />
            <p className="text-xs text-muted-foreground">
              Le prix affiché quand le box est libre. Le loyer d&apos;un contrat en cours se modifie séparément,
              depuis la fiche contrat.
            </p>
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
