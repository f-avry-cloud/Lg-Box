"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { sendContractForSignature, previewSignatureRequestEmail } from "@/lib/actions/contract-signature";

export function SendForSignatureButton({ contractId, label }: { contractId: string; label: string }) {
  const [pending, startTransition] = useTransition();
  const [mailtoPending, startMailtoTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await sendContractForSignature(contractId);
            if (!result.success) {
              toast.error(result.error ?? "Erreur.");
              return;
            }
            toast.success("Lien de signature envoyé.");
            router.refresh();
          })
        }
      >
        <Send /> {pending ? "Envoi..." : label}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        title="Ouvrir un brouillon dans votre client mail"
        disabled={mailtoPending}
        onClick={() =>
          startMailtoTransition(async () => {
            const result = await previewSignatureRequestEmail(contractId);
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
