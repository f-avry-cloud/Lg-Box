"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deletePricingRow, upsertPricingRow } from "@/lib/actions/settings";
import type { PricingGridRow } from "@/types/database";

export function PricingGridEditor({ rows }: { rows: PricingGridRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      const result = await upsertPricingRow(formData);
      if (!result.success) {
        toast.error(result.error ?? "Erreur.");
        return;
      }
      toast.success("Tarif enregistré.");
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deletePricingRow(id);
      if (!result.success) {
        toast.error(result.error ?? "Erreur.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Taille</TableHead>
            <TableHead>Prix mensuel</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.taille_libelle}</TableCell>
              <TableCell>{r.prix_mensuel} €</TableCell>
              <TableCell>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => handleDelete(r.id)}
                  title="Supprimer"
                >
                  <Trash2 className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <form action={handleAdd} className="mt-3 flex items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs uppercase tracking-wide text-muted-foreground">Taille</label>
          <Input name="taille_libelle" placeholder="10m²" required className="w-32" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs uppercase tracking-wide text-muted-foreground">Prix mensuel</label>
          <Input name="prix_mensuel" type="number" step="0.01" required className="w-32" />
        </div>
        <Button type="submit" disabled={pending}>
          Ajouter / mettre à jour
        </Button>
      </form>
    </div>
  );
}
