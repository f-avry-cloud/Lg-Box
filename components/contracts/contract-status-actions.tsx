"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { changeContractStatus } from "@/lib/actions/contracts";
import type { ActionResult } from "@/lib/actions/result";
import type { Contract } from "@/types/database";

export function ContractStatusActions({ contract }: { contract: Contract }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [motif, setMotif] = useState("");
  const [dateFin, setDateFin] = useState("");

  function run(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error ?? "Erreur.");
        return;
      }
      toast.success("Statut du contrat mis à jour.");
      onSuccess?.();
      router.refresh();
    });
  }

  if (contract.statut === "resilie") {
    return <p className="text-sm text-muted-foreground">Contrat résilié — aucune action possible.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {contract.statut === "brouillon" && (
        <Button size="sm" disabled={pending} onClick={() => run(() => changeContractStatus(contract.id, "actif"))}>
          Activer le contrat
        </Button>
      )}

      {contract.statut === "actif" && (
        <Dialog open={noticeOpen} onOpenChange={setNoticeOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              Donner congé
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Donner congé au locataire</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Motif</Label>
                <Textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={2} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Date de fin (calculée automatiquement si vide, préavis {contract.preavis_jours}j)</Label>
                <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={pending}
                onClick={() =>
                  run(
                    () =>
                      changeContractStatus(contract.id, "en_preavis", {
                        motif,
                        dateFin: dateFin || undefined,
                      }),
                    () => setNoticeOpen(false)
                  )
                }
              >
                Confirmer le préavis
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {(contract.statut === "actif" || contract.statut === "en_preavis") && (
        <Button
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() => run(() => changeContractStatus(contract.id, "resilie"))}
        >
          Résilier maintenant
        </Button>
      )}

      {contract.statut === "en_preavis" && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => changeContractStatus(contract.id, "actif"))}
        >
          Annuler le préavis
        </Button>
      )}
    </div>
  );
}
