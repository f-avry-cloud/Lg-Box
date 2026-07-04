"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import { ignoreBankTransaction, validateBankMatch } from "@/lib/actions/bank";
import type { BankTransaction } from "@/types/database";

export function ReconcileRow({
  transaction,
  invoiceOptions,
  suggestedInvoiceId,
}: {
  transaction: BankTransaction;
  invoiceOptions: { id: string; label: string }[];
  suggestedInvoiceId: string | null;
}) {
  const [selected, setSelected] = useState(suggestedInvoiceId ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleValidate() {
    if (!selected) {
      toast.error("Sélectionnez une facture à rapprocher.");
      return;
    }
    startTransition(async () => {
      try {
        await validateBankMatch(transaction.id, selected);
        toast.success("Rapprochement validé, facture marquée payée.");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  function handleIgnore() {
    startTransition(async () => {
      try {
        await ignoreBankTransaction(transaction.id);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  return (
    <TableRow className={suggestedInvoiceId ? "bg-success/5" : undefined}>
      <TableCell>{formatDate(transaction.date_operation)}</TableCell>
      <TableCell className="max-w-64 truncate">{transaction.libelle}</TableCell>
      <TableCell>{formatCurrency(transaction.montant)}</TableCell>
      <TableCell>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Choisir une facture..." />
          </SelectTrigger>
          <SelectContent>
            {invoiceOptions.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="success" disabled={pending} onClick={handleValidate}>
            <Check /> Valider
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={handleIgnore}>
            <X /> Ignorer
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
