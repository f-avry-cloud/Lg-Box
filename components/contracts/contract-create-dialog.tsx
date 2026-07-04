"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createContract } from "@/lib/actions/contracts";
import type { Customer, Unit } from "@/types/database";

export function ContractCreateDialog({ customers, units }: { customers: Customer[]; units: Unit[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerMode, setCustomerMode] = useState<"existant" | "nouveau">("existant");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createContract({ error: null }, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Contrat créé.");
      setError(null);
      setOpen(false);
      if (result.contractId) router.push(`/admin/contracts/${result.contractId}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> Nouveau contrat
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Créer un contrat</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Tabs value={customerMode} onValueChange={(v) => setCustomerMode(v as typeof customerMode)}>
            <TabsList>
              <TabsTrigger value="existant">Client existant</TabsTrigger>
              <TabsTrigger value="nouveau">Nouveau client</TabsTrigger>
            </TabsList>
            <TabsContent value="existant">
              <Select name={customerMode === "existant" ? "customer_id" : undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.prenom} {c.nom} — {c.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TabsContent>
            <TabsContent value="nouveau">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Prénom</Label>
                  <Input name="new_prenom" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Nom</Label>
                  <Input name="new_nom" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Email</Label>
                  <Input name="new_email" type="email" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Téléphone</Label>
                  <Input name="new_telephone" />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex flex-col gap-1.5">
            <Label>Box (libres uniquement)</Label>
            <Select
              name="unit_id"
              onValueChange={(value) => setSelectedUnit(units.find((u) => u.id === value) ?? null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un box libre" />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.numero} — {u.taille_libelle} — {u.prix_mensuel_standard} €/mois
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Date de début</Label>
              <Input name="date_debut" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Prix mensuel</Label>
              <Input
                name="prix_mensuel"
                type="number"
                step="0.01"
                required
                defaultValue={selectedUnit?.prix_mensuel_standard}
                key={selectedUnit?.id}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Dépôt de garantie</Label>
              <Input
                name="depot_garantie"
                type="number"
                step="0.01"
                defaultValue={selectedUnit?.prix_mensuel_standard}
                key={`depot-${selectedUnit?.id}`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Jour de prélèvement</Label>
              <Input name="jour_prelevement_mensuel" type="number" min={1} max={28} defaultValue={5} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Préavis (jours)</Label>
              <Input name="preavis_jours" type="number" min={0} defaultValue={30} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Création..." : "Créer le contrat"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
