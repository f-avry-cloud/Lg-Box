"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { sendGeneralDoorCodeEmail, sendBoxAccessCodeEmail } from "@/lib/actions/contracts";
import { sendUnitBoxAccessCodeEmail } from "@/lib/actions/units";

type Props =
  | { kind: "general-door"; contractId: string }
  | { kind: "contract-box"; contractId: string }
  | { kind: "unit-box"; unitId: string };

const LABELS: Record<Props["kind"], string> = {
  "general-door": "Envoyer le code de la porte générale",
  "contract-box": "Envoyer le code du box",
  "unit-box": "Envoyer le code au locataire",
};

export function SendAccessCodeButton(props: Props) {
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const result =
        props.kind === "general-door"
          ? await sendGeneralDoorCodeEmail(props.contractId)
          : props.kind === "contract-box"
            ? await sendBoxAccessCodeEmail(props.contractId)
            : await sendUnitBoxAccessCodeEmail(props.unitId);
      if (!result.success) {
        toast.error(result.error ?? "Erreur.");
        return;
      }
      toast.success("Email envoyé au locataire.");
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={pending} onClick={run}>
      <Mail /> {pending ? "Envoi..." : LABELS[props.kind]}
    </Button>
  );
}
