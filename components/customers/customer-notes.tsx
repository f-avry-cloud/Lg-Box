"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateCustomerNotes } from "@/lib/actions/customers";

export function CustomerNotes({ customerId, initialNotes }: { customerId: string; initialNotes: string }) {
  const [notes, setNotes] = useState(initialNotes);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      <Button
        size="sm"
        variant="outline"
        className="w-fit"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await updateCustomerNotes(customerId, notes);
            if (!result.success) {
              toast.error(result.error ?? "Erreur.");
              return;
            }
            toast.success("Notes enregistrées.");
          })
        }
      >
        {pending ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </div>
  );
}
