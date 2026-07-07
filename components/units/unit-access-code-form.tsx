"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateUnitAccessCode } from "@/lib/actions/units";

export function UnitAccessCodeForm({ unitId, initialCode }: { unitId: string; initialCode: string }) {
  const [code, setCode] = useState(initialCode);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Aucun code défini"
        className="max-w-48"
      />
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await updateUnitAccessCode(unitId, code);
            if (!result.success) {
              toast.error(result.error ?? "Erreur.");
              return;
            }
            toast.success("Code d'accès enregistré.");
          })
        }
      >
        {pending ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </div>
  );
}
