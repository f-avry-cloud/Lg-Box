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
            try {
              await updateCustomerNotes(customerId, notes);
              toast.success("Notes enregistrées.");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Erreur.");
            }
          })
        }
      >
        {pending ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </div>
  );
}
