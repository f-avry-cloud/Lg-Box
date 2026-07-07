"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { resetCustomerPortalAccess } from "@/lib/actions/customers";

export function PortalAccessButton({ customerId, hasAccess }: { customerId: string; hasAccess: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);

  function run() {
    startTransition(async () => {
      const result = await resetCustomerPortalAccess(customerId);
      if (!result.success) {
        toast.error(result.error ?? "Erreur.");
        return;
      }
      if (result.emailSent) {
        toast.success("Identifiants envoyés par email au client.");
        setRevealedPassword(null);
      } else {
        setRevealedPassword(result.password ?? null);
        toast.error("Email non envoyé — communiquez ce mot de passe manuellement.");
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={run}>
        {pending
          ? "Envoi..."
          : hasAccess
            ? "Réinitialiser le mot de passe"
            : "Activer l'espace client"}
      </Button>
      {revealedPassword && (
        <div className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
          <span className="font-mono">{revealedPassword}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => {
              navigator.clipboard.writeText(revealedPassword);
              toast.success("Copié.");
            }}
          >
            <Copy className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
