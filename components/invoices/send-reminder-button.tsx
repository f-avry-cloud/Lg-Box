"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BellRing } from "lucide-react";

import { Button } from "@/components/ui/button";
import { sendManualReminder } from "@/lib/actions/invoices";

export function SendReminderButton({ invoiceId }: { invoiceId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await sendManualReminder(invoiceId);
            toast.success("Relance envoyée.");
            router.refresh();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Erreur.");
          }
        })
      }
    >
      <BellRing /> Relancer
    </Button>
  );
}
