"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateGeneralDoorCode, type SettingsFormState } from "@/lib/actions/settings";
import type { CompanySettings } from "@/types/database";

export function GeneralDoorCodeForm({ settings }: { settings: CompanySettings }) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    updateGeneralDoorCode,
    { error: null }
  );
  const [active, setActive] = useState(settings.code_porte_generale_active);

  useEffect(() => {
    if (state.success) toast.success("Code de porte enregistré.");
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="code_porte_generale_active"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        Code de porte générale activé
      </label>
      <p className="-mt-2 text-xs text-muted-foreground">
        Tant que cette option est désactivée, rien ne change. Une fois activée, le code pourra être envoyé par
        email à un locataire depuis sa fiche contrat.
      </p>

      {active && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code_porte_generale">Code de la porte principale</Label>
          <Input
            id="code_porte_generale"
            name="code_porte_generale"
            className="w-48"
            defaultValue={settings.code_porte_generale ?? ""}
            placeholder="Ex. 1234#"
          />
        </div>
      )}

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
