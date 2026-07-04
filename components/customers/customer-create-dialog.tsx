"use client";

import { useActionState, useEffect, useState } from "react";
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
import { createCustomer, type CustomerFormState } from "@/lib/actions/customers";

export function CustomerCreateDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, formAction, pending] = useActionState<CustomerFormState, FormData>(createCustomer, {
    error: null,
  });

  useEffect(() => {
    if (state.success && state.customerId) {
      toast.success("Client créé.");
      setOpen(false);
      router.push(`/admin/customers/${state.customerId}`);
    }
  }, [state.success, state.customerId, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> Nouveau client
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un client</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prenom">Prénom</Label>
            <Input id="prenom" name="prenom" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" name="nom" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="telephone">Téléphone</Label>
            <Input id="telephone" name="telephone" />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="adresse">Adresse</Label>
            <Input id="adresse" name="adresse" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ville">Ville</Label>
            <Input id="ville" name="ville" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code_postal">Code postal</Label>
            <Input id="code_postal" name="code_postal" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type">Type</Label>
            <Select name="type" defaultValue="particulier">
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="particulier">Particulier</SelectItem>
                <SelectItem value="professionnel">Professionnel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="siret">SIRET (si pro)</Label>
            <Input id="siret" name="siret" />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes internes</Label>
            <Input id="notes" name="notes" />
          </div>
          {state.error && <p className="col-span-2 text-sm text-destructive">{state.error}</p>}
          <div className="col-span-2 mt-2 flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Création..." : "Créer le client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
