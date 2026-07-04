"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  createExpenseFromTransaction,
  ignoreBankTransaction,
  linkTransactionToExpense,
  validateBankMatch,
} from "@/lib/actions/bank";
import { EXPENSE_CATEGORIES } from "@/lib/business/expense-categories";
import type { BankTransaction } from "@/types/database";

export function ReconcileRow({
  transaction,
  invoiceOptions,
  expenseOptions,
  suggestedInvoiceId,
}: {
  transaction: BankTransaction;
  invoiceOptions: { id: string; label: string }[];
  expenseOptions: { id: string; label: string }[];
  suggestedInvoiceId: string | null;
}) {
  const isOutgoing = transaction.montant < 0;
  const [selectedInvoice, setSelectedInvoice] = useState(suggestedInvoiceId ?? "");
  const [selectedExpense, setSelectedExpense] = useState("");
  const [categorie, setCategorie] = useState(EXPENSE_CATEGORIES[0]);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleValidateInvoice() {
    if (!selectedInvoice) {
      toast.error("Sélectionnez une facture à rapprocher.");
      return;
    }
    startTransition(async () => {
      const result = await validateBankMatch(transaction.id, selectedInvoice);
      if (!result.success) {
        toast.error(result.error ?? "Erreur.");
        return;
      }
      toast.success("Rapprochement validé, facture marquée payée.");
      router.refresh();
    });
  }

  function handleLinkExpense() {
    if (!selectedExpense) {
      toast.error("Sélectionnez une dépense existante, ou créez-en une nouvelle.");
      return;
    }
    startTransition(async () => {
      const result = await linkTransactionToExpense(transaction.id, selectedExpense);
      if (!result.success) {
        toast.error(result.error ?? "Erreur.");
        return;
      }
      toast.success("Rapproché avec la dépense.");
      router.refresh();
    });
  }

  function handleCreateExpense() {
    startTransition(async () => {
      const result = await createExpenseFromTransaction(transaction.id, categorie);
      if (!result.success) {
        toast.error(result.error ?? "Erreur.");
        return;
      }
      toast.success("Dépense créée et rapprochée.");
      router.refresh();
    });
  }

  function handleIgnore() {
    startTransition(async () => {
      const result = await ignoreBankTransaction(transaction.id);
      if (!result.success) {
        toast.error(result.error ?? "Erreur.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <TableRow className={suggestedInvoiceId ? "bg-success/5" : undefined}>
      <TableCell>{formatDate(transaction.date_operation)}</TableCell>
      <TableCell className="max-w-64 truncate">{transaction.libelle}</TableCell>
      <TableCell className={isOutgoing ? "text-destructive" : undefined}>
        {formatCurrency(transaction.montant)}
      </TableCell>
      <TableCell>
        {isOutgoing ? (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedExpense} onValueChange={setSelectedExpense}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Dépense existante..." />
              </SelectTrigger>
              <SelectContent>
                {expenseOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" disabled={pending} onClick={handleLinkExpense}>
              Lier
            </Button>
            <span className="text-xs text-muted-foreground">ou</span>
            <Select value={categorie} onValueChange={setCategorie}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" disabled={pending} onClick={handleCreateExpense}>
              Créer la dépense
            </Button>
          </div>
        ) : (
          <Select value={selectedInvoice} onValueChange={setSelectedInvoice}>
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
        )}
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-2">
          {!isOutgoing && (
            <Button size="sm" variant="success" disabled={pending} onClick={handleValidateInvoice}>
              <Check /> Valider
            </Button>
          )}
          <Button size="sm" variant="ghost" disabled={pending} onClick={handleIgnore}>
            <X /> Ignorer
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
