"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { sendAllReminders, type BulkReminderResult } from "@/lib/actions/invoices";

export function BulkReminderButton({ unpaidCount }: { unpaidCount: number }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<BulkReminderResult | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleRun() {
    startTransition(async () => {
      const res = await sendAllReminders();
      setResult(res);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setResult(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={unpaidCount === 0}>
          <BellRing /> Relancer tout ({unpaidCount})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Relancer toutes les factures impayées</DialogTitle>
        </DialogHeader>
        {!result ? (
          <p className="text-sm text-muted-foreground">
            Envoie à chaque locataire concerné la relance adaptée à son retard actuel (rappel, relance ou
            mise en demeure), avec le montant dû et un lien vers son espace client.
          </p>
        ) : (
          <div className="flex flex-col gap-1 text-sm">
            <p>
              <span className="font-medium text-success">{result.sent}</span> relance(s) envoyée(s)
            </p>
            {result.skipped > 0 && (
              <p className="text-muted-foreground">{result.skipped} échec(s) ou ignoré(s)</p>
            )}
            {result.errors.length > 0 && (
              <p className="text-destructive">{result.errors.slice(0, 5).join(" · ")}</p>
            )}
          </div>
        )}
        <DialogFooter>
          {!result ? (
            <Button disabled={pending} onClick={handleRun}>
              {pending ? "Envoi en cours..." : "Envoyer les relances"}
            </Button>
          ) : (
            <Button onClick={() => setOpen(false)}>Fermer</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
