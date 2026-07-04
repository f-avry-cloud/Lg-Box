"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BellRing, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { previewReminderEmail, sendManualReminder } from "@/lib/actions/invoices";

export function SendReminderButton({ invoiceId }: { invoiceId: string }) {
  const [pending, startTransition] = useTransition();
  const [mailtoPending, startMailtoTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex gap-2">
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
      <Button
        size="sm"
        variant="ghost"
        title="Ouvrir un brouillon dans votre client mail"
        disabled={mailtoPending}
        onClick={() =>
          startMailtoTransition(async () => {
            const result = await previewReminderEmail(invoiceId);
            if (!result.success || !result.to) {
              toast.error(result.error ?? "Erreur.");
              return;
            }
            const subject = encodeURIComponent(result.subject ?? "");
            const body = encodeURIComponent(result.body ?? "");
            window.location.href = `mailto:${result.to}?subject=${subject}&body=${body}`;
          })
        }
      >
        <Mail />
      </Button>
    </div>
  );
}
