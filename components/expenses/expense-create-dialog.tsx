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
import { createExpense } from "@/lib/actions/expenses";
import { EXPENSE_CATEGORIES as CATEGORIES } from "@/lib/business/expense-categories";

export function ExpenseCreateDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createExpense({ error: null }, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Dépense enregistrée.");
      setError(null);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> Nouvelle dépense
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enregistrer une dépense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="categorie">Catégorie</Label>
            <Select name="categorie" defaultValue={CATEGORIES[0]}>
              <SelectTrigger id="categorie">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="montant">Montant TTC</Label>
            <Input id="montant" name="montant" type="number" step="0.01" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date_depense">Date</Label>
            <Input
              id="date_depense"
              name="date_depense"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fournisseur">Fournisseur</Label>
            <Input id="fournisseur" name="fournisseur" />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="justificatif">Justificatif (facture, reçu...)</Label>
            <Input id="justificatif" name="justificatif" type="file" accept="application/pdf,image/*" />
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
