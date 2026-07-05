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
    if (state.success) toast.success("Informations du site enregistrées.");
  }, [state.success]);

  return (
    <form action={formAction} className="grid grid-cols-2 gap-4">
      <div className="col-span-2 flex flex-col gap-1.5">
        <Label htmlFor="site_nom">Nom du site</Label>
        <Input id="site_nom" name="nom" defaultValue={site.nom} />
      </div>
      <div className="col-span-2 flex flex-col gap-1.5">
        <Label htmlFor="site_adresse">Adresse</Label>
        <Input id="site_adresse" name="adresse" defaultValue={site.adresse ?? ""} placeholder="12 rue des Entrepôts" />
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
        <Label htmlFor="site_horaires">Horaires</Label>
        <Textarea id="site_horaires" name="horaires" rows={2} defaultValue={site.horaires ?? ""} />
      </div>
      {state.error && <p className="col-span-2 text-sm text-destructive">{state.error}</p>}
      <div className="col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
