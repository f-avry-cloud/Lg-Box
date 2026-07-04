"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createReservationRequest,
  type ReservationRequestState,
} from "@/lib/actions/reservation-request";

export function ReservationForm({ sizes }: { sizes: string[] }) {
  const [state, formAction, pending] = useActionState<ReservationRequestState, FormData>(
    createReservationRequest,
    { error: null }
  );

  useEffect(() => {
    if (state.success) toast.success("Votre demande a bien été envoyée, nous revenons vers vous rapidement.");
  }, [state.success]);

  if (state.success) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/10 p-6 text-center text-success">
        Merci ! Votre demande a été transmise, nous vous recontactons sous peu.
      </div>
    );
  }

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nom">Nom</Label>
        <Input id="nom" name="nom" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="telephone">Téléphone</Label>
        <Input id="telephone" name="telephone" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="taille_souhaitee">Taille souhaitée</Label>
        <select
          id="taille_souhaitee"
          name="taille_souhaitee"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Sans préférence</option>
          {sizes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="date_souhaitee">Date souhaitée</Label>
        <Input id="date_souhaitee" name="date_souhaitee" type="date" />
      </div>
      <div className="col-span-full flex flex-col gap-1.5">
        <Label htmlFor="message">Message (optionnel)</Label>
        <Textarea id="message" name="message" rows={3} />
      </div>
      {state.error && <p className="col-span-full text-sm text-destructive">{state.error}</p>}
      <div className="col-span-full">
        <Button type="submit" disabled={pending} size="lg" className="w-full sm:w-auto">
          {pending ? "Envoi..." : "Envoyer ma demande"}
        </Button>
      </div>
    </form>
  );
}
