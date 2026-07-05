"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

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
import { resetTenantData, resetUnitsData } from "@/lib/actions/danger-zone";
import { RESET_TENANT_CONFIRM_PHRASE, RESET_UNITS_CONFIRM_PHRASE } from "@/lib/actions/danger-zone-constants";
import type { ActionResult } from "@/lib/actions/result";

function DangerAction({
  triggerLabel,
  dialogTitle,
  confirmPhrase,
  summary,
  successMessage,
  action,
}: {
  triggerLabel: string;
  dialogTitle: string;
  confirmPhrase: string;
  summary: ReactNode;
  successMessage: string;
  action: (formData: FormData) => Promise<ActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const canSubmit = phrase === confirmPhrase && acknowledged && password.length > 0;

  function reset() {
    setPhrase("");
    setAcknowledged(false);
    setPassword("");
    setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.success) {
        setError(result.error ?? "Erreur lors de la réinitialisation.");
        return;
      }
      toast.success(successMessage);
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="text-sm text-muted-foreground">{summary}</div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="acknowledged"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5"
            />
            Je comprends que cette action est irréversible et je souhaite continuer.
          </label>

          <div className="flex flex-col gap-1.5">
            <Label>
              Tapez exactement <code className="rounded bg-muted px-1">{confirmPhrase}</code> pour confirmer
            </Label>
            <Input
              name="confirm_phrase"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Votre mot de passe</Label>
            <Input
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={!canSubmit || pending}>
              {pending ? "Suppression..." : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DangerZone({
  counts,
}: {
  counts: { customers: number; contracts: number; invoices: number; payments: number; units: number };
}) {
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div>
          <p className="text-sm font-medium text-destructive">Zone dangereuse</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ces actions sont irréversibles et ne touchent ni aux paramètres, ni aux comptes utilisateurs,
            ni au barème de prix.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <DangerAction
          triggerLabel="Réinitialiser les données locataires"
          dialogTitle="Réinitialiser les données locataires"
          confirmPhrase={RESET_TENANT_CONFIRM_PHRASE}
          successMessage="Données locataires réinitialisées."
          action={resetTenantData}
          summary={
            <p>
              Supprime définitivement <strong>{counts.customers} client(s)</strong>,{" "}
              <strong>{counts.contracts} contrat(s)</strong>, <strong>{counts.invoices} facture(s)</strong> et{" "}
              <strong>{counts.payments} paiement(s)</strong>. Les box repassent en statut « libre ».
              Impossible à annuler.
            </p>
          }
        />

        <DangerAction
          triggerLabel="Réinitialiser l'inventaire des box"
          dialogTitle="Réinitialiser l'inventaire des box"
          confirmPhrase={RESET_UNITS_CONFIRM_PHRASE}
          successMessage="Inventaire des box réinitialisé."
          action={resetUnitsData}
          summary={
            <p>
              Supprime définitivement les <strong>{counts.units} box</strong> actuellement enregistrés
              (données de démonstration), pour repartir avec votre inventaire réel via l&apos;import CSV.
              Refusé tant que des contrats existent encore — réinitialisez d&apos;abord les données
              locataires ci-dessus. Impossible à annuler.
            </p>
          }
        />
      </div>
    </div>
  );
}
