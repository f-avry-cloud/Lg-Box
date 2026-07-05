"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { sendContractForSignature, previewSignatureRequestEmail } from "@/lib/actions/contract-signature";
import type { Contract } from "@/types/database";

export function SendForSignatureButton({ contract }: { contract: Contract }) {
  const [open, setOpen] = useState(false);
  const contractAlreadySigned = contract.signature_status === "signe";
  const mandateAlreadySigned = contract.sepa_mandate_status === "signe";
  const mandateReady = Boolean(contract.iban && contract.bic && contract.rum);

  const [includeContract, setIncludeContract] = useState(!contractAlreadySigned);
  const [includeSepaMandate, setIncludeSepaMandate] = useState(mandateReady && !mandateAlreadySigned);
  const [pending, startTransition] = useTransition();
  const [mailtoPending, startMailtoTransition] = useTransition();
  const router = useRouter();

  function handleSend() {
    startTransition(async () => {
      const result = await sendContractForSignature(contract.id, { includeContract, includeSepaMandate });
      if (!result.success) {
        toast.error(result.error ?? "Erreur.");
        return;
      }
      toast.success("Lien de signature envoyé.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm">
            <Send /> Envoyer pour signature
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer pour signature</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground">
              Choisissez les documents à inclure dans ce lien — ils seront signés en un seul geste.
            </p>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeContract}
                disabled={contractAlreadySigned}
                onChange={(e) => setIncludeContract(e.target.checked)}
              />
              Contrat {contractAlreadySigned && "(déjà signé)"}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeSepaMandate}
                disabled={mandateAlreadySigned || !mandateReady}
                onChange={(e) => setIncludeSepaMandate(e.target.checked)}
              />
              Mandat de prélèvement SEPA
              {mandateAlreadySigned && " (déjà signé)"}
              {!mandateAlreadySigned && !mandateReady && " (renseignez d'abord l'IBAN/BIC ci-dessus)"}
            </label>
          </div>
          <DialogFooter>
            <Button disabled={pending || (!includeContract && !includeSepaMandate)} onClick={handleSend}>
              {pending ? "Envoi..." : "Envoyer le lien"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Button
        size="sm"
        variant="ghost"
        title="Ouvrir un brouillon dans votre client mail"
        disabled={mailtoPending}
        onClick={() =>
          startMailtoTransition(async () => {
            const result = await previewSignatureRequestEmail(contract.id);
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
