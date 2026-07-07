"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateInvoiceSettings, type SettingsFormState } from "@/lib/actions/settings";
import { DEFAULT_INVOICE_MENTIONS } from "@/lib/pdf/invoice-document";
import type { CompanySettings } from "@/types/database";

export function InvoiceSettingsForm({ settings }: { settings: CompanySettings }) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    updateInvoiceSettings,
    { error: null }
  );
  const [tvaApplicable, setTvaApplicable] = useState(settings.tva_applicable);

  useEffect(() => {
    if (state.success) toast.success("Paramètres de facturation enregistrés.");
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="tva_applicable"
          checked={tvaApplicable}
          onChange={(e) => setTvaApplicable(e.target.checked)}
        />
        TVA applicable
      </label>
      <p className="-mt-2 text-xs text-muted-foreground">
        Décoché : les factures sont émises en franchise en base de TVA (mention « TVA non applicable, art. 293 B
        du CGI » ajoutée automatiquement), et le montant HT est égal au montant TTC.
      </p>

      {tvaApplicable && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="taux_tva">Taux de TVA (%)</Label>
          <Input
            id="taux_tva"
            name="taux_tva"
            type="number"
            step="0.1"
            min="0"
            max="100"
            className="w-32"
            defaultValue={settings.taux_tva}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="facture_mentions_legales">Mentions légales (bas de facture, page 1)</Label>
        <Textarea
          id="facture_mentions_legales"
          name="facture_mentions_legales"
          rows={4}
          defaultValue={settings.facture_mentions_legales ?? ""}
          placeholder={DEFAULT_INVOICE_MENTIONS}
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
