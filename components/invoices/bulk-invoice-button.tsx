"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { generateAndSendMonthlyInvoices, type BulkInvoiceResult } from "@/lib/actions/invoices";

export function BulkInvoiceButton() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<BulkInvoiceResult | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleRun() {
    startTransition(async () => {
      try {
        const res = await generateAndSendMonthlyInvoices();
        setResult(res);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
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
        <Button size="sm" variant="outline">
          <Send /> Facturer tous les locataires
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Facturation groupée du mois en cours</DialogTitle>
        </DialogHeader>
        {!result ? (
          <div className="text-sm text-muted-foreground">
            Génère une facture pour chaque contrat actif ou en préavis qui n&apos;en a pas déjà une pour ce
            mois-ci, puis envoie un email à chaque locataire concerné pour l&apos;informer que sa facture est
            disponible dans son espace client.
          </div>
        ) : (
          <div className="flex flex-col gap-1 text-sm">
            <p>
              <span className="font-medium text-success">{result.created}</span> facture(s) générée(s)
            </p>
            <p className="text-muted-foreground">{result.skipped} contrat(s) déjà facturé(s) ce mois-ci</p>
            <p className="text-muted-foreground">{result.emailsSent} email(s) envoyé(s)</p>
            {result.errors.length > 0 && (
              <p className="text-destructive">{result.errors.length} erreur(s) : {result.errors.join(", ")}</p>
            )}
          </div>
        )}
        <DialogFooter>
          {!result ? (
            <Button disabled={pending} onClick={handleRun}>
              {pending ? "Génération en cours..." : "Lancer la facturation groupée"}
            </Button>
          ) : (
            <Button onClick={() => setOpen(false)}>Fermer</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
