"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deletePricingRow, updatePricingPrice, upsertPricingRow } from "@/lib/actions/settings";
import type { PricingGridRow } from "@/types/database";

const NIVEAU = { rdc: "Rez-de-chaussée", etage: "Étage" } as const;

/**
 * La grille tarifaire — celle que le site public affiche. Changer un prix ici
 * le change sur lg-box.fr dans la minute, sans autre manipulation.
 */
export function PricingGridEditor({ rows }: { rows: PricingGridRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const tries = [...rows].sort((a, b) => {
    const na = a.niveau ?? "rdc";
    const nb = b.niveau ?? "rdc";
    if (na !== nb) return na === "rdc" ? -1 : 1;
    return (a.surface_m2 ?? a.prix_mensuel) - (b.surface_m2 ?? b.prix_mensuel);
  });

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      const result = await upsertPricingRow(formData);
      if (!result.success) {
        toast.error(result.error ?? "Erreur.");
        return;
      }
      toast.success("Tarif enregistré. Le site public est à jour.");
      router.refresh();
    });
  }

  function handlePrice(id: string, formData: FormData) {
    const prix = Number(String(formData.get("prix_mensuel") ?? "").replace(",", "."));
    startTransition(async () => {
      const result = await updatePricingPrice(id, prix);
      if (!result.success) {
        toast.error(result.error ?? "Erreur.");
        return;
      }
      toast.success("Prix modifié. Le site public est à jour.");
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
      <p className="mb-3 text-sm text-muted-foreground">
        Ces tarifs sont ceux affichés sur le site public. Toute modification y apparaît aussitôt.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Taille</TableHead>
            <TableHead>Niveau</TableHead>
            <TableHead>Prix mensuel</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tries.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.taille_libelle}</TableCell>
              <TableCell>{NIVEAU[r.niveau ?? "rdc"]}</TableCell>
              <TableCell>
                <form action={(fd) => handlePrice(r.id, fd)} className="flex items-center gap-2">
                  <Input
                    name="prix_mensuel"
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    defaultValue={r.prix_mensuel}
                    aria-label={`Prix mensuel du ${r.taille_libelle}`}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">€</span>
                  <Button type="submit" size="sm" variant="outline" disabled={pending}>
                    Enregistrer
                  </Button>
                </form>
              </TableCell>
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

      <form action={handleAdd} className="mt-3 flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="grille-surface" className="text-xs uppercase tracking-wide text-muted-foreground">
            Surface (m²)
          </label>
          <Input id="grille-surface" name="surface_m2" type="number" step="0.5" min="1" placeholder="10" required className="w-28" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="grille-niveau" className="text-xs uppercase tracking-wide text-muted-foreground">
            Niveau
          </label>
          <select
            id="grille-niveau"
            name="niveau"
            defaultValue="rdc"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="rdc">Rez-de-chaussée</option>
            <option value="etage">Étage</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="grille-prix" className="text-xs uppercase tracking-wide text-muted-foreground">
            Prix mensuel
          </label>
          <Input id="grille-prix" name="prix_mensuel" type="number" step="0.01" min="1" required className="w-28" />
        </div>
        <Button type="submit" disabled={pending}>
          Ajouter / mettre à jour
        </Button>
      </form>
    </div>
  );
}
