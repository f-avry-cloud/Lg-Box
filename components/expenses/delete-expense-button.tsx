"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteExpense } from "@/lib/actions/expenses";

export function DeleteExpenseButton({ expenseId }: { expenseId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      size="icon"
      variant="ghost"
      disabled={pending}
      title="Supprimer"
      onClick={() =>
        startTransition(async () => {
          try {
            await deleteExpense(expenseId);
            router.refresh();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Erreur.");
          }
        })
      }
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
