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

export function UnitSizeEditForm({
  unitId,
  tailleLibelle,
  tailleM2,
  hasPhysicalDimensions,
}: {
  unitId: string;
  tailleLibelle: string;
  tailleM2: number | null;
  hasPhysicalDimensions: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const libelle = String(formData.get("taille_libelle") ?? "");
    const m2Raw = formData.get("taille_m2");
    const m2 = m2Raw && String(m2Raw).trim() ? Number(m2Raw) : null;
    startTransition(async () => {
      const result = await updateUnitSize(unitId, { tailleLibelle: libelle, tailleM2: m2 });
      if (!result.success) {
        toast.error(result.error ?? "Erreur.");
        return;
      }
      toast.success("Taille mise à jour.");
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
          <DialogTitle>Modifier la taille du box</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="taille_libelle">Libellé affiché</Label>
            <Input id="taille_libelle" name="taille_libelle" defaultValue={tailleLibelle} placeholder="Ex. 12 m²" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="taille_m2">Surface (m²)</Label>
            <Input
              id="taille_m2"
              name="taille_m2"
              type="number"
              step="0.1"
              min="0"
              defaultValue={tailleM2 ?? ""}
              required={hasPhysicalDimensions}
            />
            {hasPhysicalDimensions && (
              <p className="text-xs text-muted-foreground">
                Ce box est positionné sur le plan interactif : changer la surface ici ajuste ses dimensions
                (largeur/profondeur) en conservant ses proportions actuelles, et se répercute donc aussi sur le
                plan.
              </p>
            )}
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
