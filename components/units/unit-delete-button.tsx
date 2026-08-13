"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteUnit } from "@/lib/actions/units";

export function UnitDeleteButton({ unitId, unitNumero }: { unitId: string; unitNumero: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await deleteUnit(unitId);
        if (!result.success) {
          toast.error(result.error ?? "Erreur.");
          resolve();
          return;
        }
        toast.success("Box supprimé.");
        router.push("/admin/units");
        resolve();
      });
    });
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive" size="sm" disabled={pending}>
          Supprimer ce box
        </Button>
      }
      title={`Supprimer le box ${unitNumero} ?`}
      description="Cette action est irréversible. Le box ne pourra plus être réattribué à un contrat."
      confirmLabel="Supprimer définitivement"
      pendingLabel="Suppression..."
      onConfirm={handleDelete}
    />
  );
}
