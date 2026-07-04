"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createUnit, type UnitFormState } from "@/lib/actions/units";

export function UnitCreateDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<UnitFormState, FormData>(createUnit, {
    error: null,
  });

  useEffect(() => {
    if (state.success) {
      toast.success("Box créé.");
      setOpen(false);
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> Nouveau box
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un box</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="grid grid-cols-2 gap-3">
          <div className="col-span-1 flex flex-col gap-1.5">
            <Label htmlFor="numero">Numéro</Label>
            <Input id="numero" name="numero" required placeholder="D01" />
          </div>
          <div className="col-span-1 flex flex-col gap-1.5">
            <Label htmlFor="taille_libelle">Taille</Label>
            <Input id="taille_libelle" name="taille_libelle" required placeholder="10m²" />
          </div>
          <div className="col-span-1 flex flex-col gap-1.5">
            <Label htmlFor="taille_m2">Surface (m²)</Label>
            <Input id="taille_m2" name="taille_m2" type="number" step="0.5" />
          </div>
          <div className="col-span-1 flex flex-col gap-1.5">
            <Label htmlFor="prix_mensuel_standard">Prix mensuel</Label>
            <Input id="prix_mensuel_standard" name="prix_mensuel_standard" type="number" step="0.01" required />
          </div>
          <div className="col-span-1 flex flex-col gap-1.5">
            <Label htmlFor="type">Type</Label>
            <Select name="type" defaultValue="interieur">
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interieur">Intérieur</SelectItem>
                <SelectItem value="exterieur">Extérieur</SelectItem>
                <SelectItem value="climatise">Climatisé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-1 flex flex-col gap-1.5">
            <Label htmlFor="zone">Zone / étage</Label>
            <Input id="zone" name="zone" placeholder="Rez-de-chaussée" />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes internes</Label>
            <Input id="notes" name="notes" />
          </div>
          {state.error && <p className="col-span-2 text-sm text-destructive">{state.error}</p>}
          <div className="col-span-2 mt-2 flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Création..." : "Créer le box"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
