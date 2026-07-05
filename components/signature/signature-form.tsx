"use client";

import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signDocuments } from "@/lib/actions/contract-signature";

export function SignatureForm({
  token,
  defaultFullName,
  includesContract,
  includesSepaMandate,
}: {
  token: string;
  defaultFullName: string;
  includesContract: boolean;
  includesSepaMandate: boolean;
}) {
  const [fullName, setFullName] = useState(defaultFullName);
  const [acceptedContract, setAcceptedContract] = useState(false);
  const [acceptedSepaMandate, setAcceptedSepaMandate] = useState(false);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready =
    fullName.trim().length > 0 &&
    (!includesContract || acceptedContract) &&
    (!includesSepaMandate || acceptedSepaMandate);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await signDocuments(token, fullName);
      if (!result.success) {
        setError(result.error ?? "Erreur lors de la signature.");
        return;
      }
      setError(null);
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="rounded-md border border-success/40 bg-success/5 p-4 text-sm">
        <p className="font-medium text-success">Merci, vos documents ont bien été signés.</p>
        <p className="mt-1 text-muted-foreground">
          Vous recevrez une confirmation par email. Vous pouvez également retrouver vos documents signés et leur
          preuve de signature à tout moment depuis votre espace client.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-md border border-border p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signer_full_name">Votre nom complet</Label>
        <Input
          id="signer_full_name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Prénom Nom"
          required
        />
      </div>

      {includesContract && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={acceptedContract}
            onChange={(e) => setAcceptedContract(e.target.checked)}
            className="mt-0.5"
          />
          Je reconnais avoir lu et j&apos;accepte les termes du contrat de location ainsi que les conditions
          générales de location.
        </label>
      )}

      {includesSepaMandate && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={acceptedSepaMandate}
            onChange={(e) => setAcceptedSepaMandate(e.target.checked)}
            className="mt-0.5"
          />
          Je reconnais avoir lu et j&apos;accepte le mandat de prélèvement SEPA présenté ci-dessus.
        </label>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div>
        <Button type="submit" disabled={pending || !ready}>
          {pending ? "Signature en cours..." : "Signer"}
        </Button>
      </div>
    </form>
  );
}
