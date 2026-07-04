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
          const result = await sendManualReminder(invoiceId);
          if (!result.success) {
            toast.error(result.error ?? "Erreur.");
            return;
          }
          toast.success("Relance envoyée.");
          router.refresh();
        })
      }
    >
      <BellRing /> Relancer
    </Button>
  );
}
