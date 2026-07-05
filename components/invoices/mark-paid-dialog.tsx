"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CircleCheck } from "lucide-react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { markInvoicePaid } from "@/lib/actions/invoices";
import type { PaymentMethod } from "@/types/database";

export function MarkPaidDialog({ invoiceId, montantTtc }: { invoiceId: string; montantTtc: number }) {
  const [open, setOpen] = useState(false);
  const [montant, setMontant] = useState(String(montantTtc));
  const [methode, setMethode] = useState<PaymentMethod>("virement");
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="success">
          <CircleCheck /> Marquer payée
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enregistrer le paiement</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Montant</Label>
            <Input type="number" step="0.01" value={montant} onChange={(e) => setMontant(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Méthode</Label>
            <Select value={methode} onValueChange={(v) => setMethode(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="virement">Virement</SelectItem>
                <SelectItem value="carte">Carte</SelectItem>
                <SelectItem value="especes">Espèces</SelectItem>
                <SelectItem value="cheque">Chèque</SelectItem>
                <SelectItem value="prelevement">Prélèvement</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Date du paiement</Label>
            <Input type="date" value={datePaiement} onChange={(e) => setDatePaiement(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Référence</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="N° de virement..." />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await markInvoicePaid(invoiceId, {
                  montant: Number(montant),
                  methode,
                  datePaiement,
                  reference,
                });
                if (!result.success) {
                  toast.error(result.error ?? "Erreur.");
                  return;
                }
                toast.success("Paiement enregistré.");
                setOpen(false);
                router.refresh();
              })
            }
          >
            {pending ? "Enregistrement..." : "Confirmer le paiement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
