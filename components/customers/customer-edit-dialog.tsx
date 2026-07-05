"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

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
import { updateCustomer } from "@/lib/actions/customers";
import type { Customer } from "@/types/database";

export function CustomerEditDialog({ customer }: { customer: Customer }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateCustomer({ error: null }, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Client mis à jour.");
      setError(null);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil /> Modifier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          <input type="hidden" name="id" value={customer.id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_prenom">Prénom</Label>
            <Input id="edit_prenom" name="prenom" defaultValue={customer.prenom} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_nom">Nom</Label>
            <Input id="edit_nom" name="nom" defaultValue={customer.nom} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_email">Email</Label>
            <Input id="edit_email" name="email" type="email" defaultValue={customer.email} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_telephone">Téléphone</Label>
            <Input id="edit_telephone" name="telephone" defaultValue={customer.telephone ?? ""} />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="edit_adresse">Adresse</Label>
            <Input id="edit_adresse" name="adresse" defaultValue={customer.adresse ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_ville">Ville</Label>
            <Input id="edit_ville" name="ville" defaultValue={customer.ville ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_code_postal">Code postal</Label>
            <Input id="edit_code_postal" name="code_postal" defaultValue={customer.code_postal ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_type">Type</Label>
            <Select name="type" defaultValue={customer.type}>
              <SelectTrigger id="edit_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="particulier">Particulier</SelectItem>
                <SelectItem value="professionnel">Professionnel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_siret">SIRET (si pro)</Label>
            <Input id="edit_siret" name="siret" defaultValue={customer.siret ?? ""} />
          </div>
          {error && <p className="col-span-2 text-sm text-destructive">{error}</p>}
          <div className="col-span-2 mt-2 flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
