"use client";

import { useState, useTransition, type FormEvent } from "react";
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
import { createUnit } from "@/lib/actions/units";

export function UnitCreateDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createUnit({ error: null }, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Box créé.");
      setError(null);
      setOpen(false);
    });
  }

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
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
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
            <Label htmlFor="zone">Zone (libellé libre)</Label>
            <Input id="zone" name="zone" placeholder="Allée B" />
          </div>
          <div className="col-span-1 flex flex-col gap-1.5">
            <Label htmlFor="floor">Étage</Label>
            <Select name="floor" defaultValue="rez_de_chaussee">
              <SelectTrigger id="floor">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sous_sol">Sous-sol</SelectItem>
                <SelectItem value="rez_de_chaussee">Rez-de-chaussée</SelectItem>
                <SelectItem value="premier_etage">1er étage</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-1 flex flex-col gap-1.5">
            <Label htmlFor="code_acces">Code d&apos;accès</Label>
            <Input id="code_acces" name="code_acces" placeholder="Ex. 4821#" />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes internes</Label>
            <Input id="notes" name="notes" />
          </div>
          {error && <p className="col-span-2 text-sm text-destructive">{error}</p>}
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
