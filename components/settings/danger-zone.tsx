"use client";

import { useState, useTransition } from "react";
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
import { resetTenantData } from "@/lib/actions/danger-zone";
import { RESET_CONFIRM_PHRASE } from "@/lib/actions/danger-zone-constants";

export function DangerZone({
  counts,
}: {
  counts: { customers: number; contracts: number; invoices: number; payments: number };
}) {
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const canSubmit = phrase === RESET_CONFIRM_PHRASE && acknowledged && password.length > 0;

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
      const result = await resetTenantData(formData);
      if (!result.success) {
        setError(result.error ?? "Erreur lors de la réinitialisation.");
        return;
      }
      toast.success("Données locataires réinitialisées.");
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div>
          <p className="text-sm font-medium text-destructive">Zone dangereuse</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Supprime définitivement tous les clients ({counts.customers}), contrats ({counts.contracts}),
            factures ({counts.invoices}) et paiements ({counts.payments}). Les box repassent en statut
            « libre ». Cette action est irréversible et ne touche ni aux paramètres, ni aux comptes
            utilisateurs, ni au barème de prix.
          </p>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm" className="mt-3">
            Réinitialiser les données locataires
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réinitialiser les données locataires</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Cette action supprimera définitivement <strong>{counts.customers} client(s)</strong>,{" "}
              <strong>{counts.contracts} contrat(s)</strong>, <strong>{counts.invoices} facture(s)</strong> et{" "}
              <strong>{counts.payments} paiement(s)</strong>. Impossible à annuler.
            </p>

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
              <Label htmlFor="confirm_phrase">
                Tapez exactement <code className="rounded bg-muted px-1">{RESET_CONFIRM_PHRASE}</code> pour
                confirmer
              </Label>
              <Input
                id="confirm_phrase"
                name="confirm_phrase"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="danger_password">Votre mot de passe</Label>
              <Input
                id="danger_password"
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
    </div>
  );
}
