"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateSiteSettings, type SettingsFormState } from "@/lib/actions/settings";
import type { Site } from "@/types/database";

export function SiteSettingsForm({ site }: { site: Site }) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    updateSiteSettings,
    { error: null }
  );

  useEffect(() => {
    if (state.success) toast.success("Centre enregistré.");
  }, [state.success]);

  return (
    <form action={formAction} className="grid grid-cols-2 gap-4">
      <input type="hidden" name="id" value={site.id} />
      <div className="col-span-2 flex flex-col gap-1.5">
        <Label htmlFor="site_nom">Nom du centre</Label>
        <Input id="site_nom" name="nom" defaultValue={site.nom ?? ""} />
      </div>
      <div className="col-span-2 flex flex-col gap-1.5">
        <Label htmlFor="site_adresse">Adresse</Label>
        <Input id="site_adresse" name="adresse" defaultValue={site.adresse ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="site_ville">Ville</Label>
        <Input id="site_ville" name="ville" defaultValue={site.ville ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="site_code_postal">Code postal</Label>
        <Input id="site_code_postal" name="code_postal" defaultValue={site.code_postal ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="site_telephone">Téléphone</Label>
        <Input id="site_telephone" name="telephone" defaultValue={site.telephone ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="site_email_contact">Email de contact</Label>
        <Input id="site_email_contact" name="email_contact" type="email" defaultValue={site.email_contact ?? ""} />
      </div>
      <div className="col-span-2 flex flex-col gap-1.5">
        <Label htmlFor="site_horaires">Horaires d&apos;ouverture</Label>
        <Textarea id="site_horaires" name="horaires" rows={3} defaultValue={site.horaires ?? ""} />
      </div>
      <p className="col-span-2 text-xs text-muted-foreground">
        Ces informations apparaissent sur la page publique de réservation et servent à calculer la distance
        moyenne des locataires au centre (page Rapports).
      </p>
      {state.error && <p className="col-span-2 text-sm text-destructive">{state.error}</p>}
      <div className="col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
