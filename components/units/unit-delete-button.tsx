"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { deleteUnit } from "@/lib/actions/units";

export function UnitDeleteButton({ unitId, unitNumero }: { unitId: string; unitNumero: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Supprimer définitivement le box ${unitNumero} ? Cette action est irréversible.`)) return;
    startTransition(async () => {
      const result = await deleteUnit(unitId);
      if (!result.success) {
        toast.error(result.error ?? "Erreur.");
        return;
      }
      toast.success("Box supprimé.");
      router.push("/admin/units");
    });
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={pending}>
      {pending ? "Suppression..." : "Supprimer ce box"}
    </Button>
  );
}
