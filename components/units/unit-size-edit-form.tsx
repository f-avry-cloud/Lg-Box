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
import { updateUnitSize } from "@/lib/actions/units";

export function UnitSizeEditForm({ unitId, tailleM2 }: { unitId: string; tailleM2: number | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const m2Raw = formData.get("taille_m2");
    const m2 = m2Raw && String(m2Raw).trim() ? Number(m2Raw) : null;
    startTransition(async () => {
      const result = await updateUnitSize(unitId, { tailleM2: m2 });
      if (!result.success) {
        toast.error(result.error ?? "Erreur.");
        return;
      }
      toast.success("Surface mise à jour.");
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
          <DialogTitle>Modifier la surface du box</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="taille_m2">Surface (m²)</Label>
            <Input
              id="taille_m2"
              name="taille_m2"
              type="number"
              step="0.1"
              min="0"
              defaultValue={tailleM2 ?? ""}
              required
            />
            <p className="text-xs text-muted-foreground">
              Surface commerciale, indépendante du plan : le libellé affiché la reprend automatiquement, et
              l&apos;emplacement du box sur le plan n&apos;est pas modifié.
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
