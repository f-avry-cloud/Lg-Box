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
import { createManualInvoice, type InvoiceFormState } from "@/lib/actions/invoices";

function firstDayOfMonth(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)).toISOString().slice(0, 10);
}

function lastDayOfMonth(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0)).toISOString().slice(0, 10);
}

export function InvoiceCreateDialog({
  contracts,
}: {
  contracts: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, formAction, pending] = useActionState<InvoiceFormState, FormData>(createManualInvoice, {
    error: null,
  });

  useEffect(() => {
    if (state.success && state.invoiceId) {
      toast.success("Facture générée.");
      setOpen(false);
      router.push(`/admin/invoices/${state.invoiceId}`);
    }
  }, [state.success, state.invoiceId, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> Nouvelle facture
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Générer une facture</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Contrat</Label>
            <Select name="contract_id">
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un contrat actif" />
              </SelectTrigger>
              <SelectContent>
                {contracts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Début de période</Label>
              <Input name="periode_debut" type="date" required defaultValue={firstDayOfMonth()} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Fin de période</Label>
              <Input name="periode_fin" type="date" required defaultValue={lastDayOfMonth()} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Montant TTC (laisser vide pour utiliser le loyer du contrat)</Label>
            <Input name="montant_ttc" type="number" step="0.01" placeholder="Ex. dépôt de garantie, frais..." />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="mt-2 flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Génération..." : "Générer la facture"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
