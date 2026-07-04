"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateCompanySettings, type SettingsFormState } from "@/lib/actions/settings";
import { CONTRACT_TEMPLATE_VARIABLES } from "@/lib/pdf/contract-template";
import type { CompanySettings } from "@/types/database";

export function CompanySettingsForm({ settings }: { settings: CompanySettings }) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    updateCompanySettings,
    { error: null }
  );

  useEffect(() => {
    if (state.success) toast.success("Paramètres enregistrés.");
  }, [state.success]);

  return (
    <form action={formAction} className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nom_entreprise">Nom de l&apos;entreprise</Label>
        <Input id="nom_entreprise" name="nom_entreprise" defaultValue={settings.nom_entreprise ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="siret">SIRET</Label>
        <Input id="siret" name="siret" defaultValue={settings.siret ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tva_intracom">N° TVA intracommunautaire</Label>
        <Input id="tva_intracom" name="tva_intracom" defaultValue={settings.tva_intracom ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rib">RIB</Label>
        <Input id="rib" name="rib" defaultValue={settings.rib ?? ""} />
      </div>
      <div className="col-span-2 flex flex-col gap-1.5">
        <Label htmlFor="adresse">Adresse</Label>
        <Input id="adresse" name="adresse" defaultValue={settings.adresse ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="preavis_jours_defaut">Préavis par défaut (jours)</Label>
        <Input
          id="preavis_jours_defaut"
          name="preavis_jours_defaut"
          type="number"
          min={0}
          defaultValue={settings.preavis_jours_defaut}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="jour_prelevement_defaut">Jour de prélèvement par défaut</Label>
        <Input
          id="jour_prelevement_defaut"
          name="jour_prelevement_defaut"
          type="number"
          min={1}
          max={28}
          defaultValue={settings.jour_prelevement_defaut}
        />
      </div>
      <div className="col-span-2 flex flex-col gap-1.5">
        <Label htmlFor="cgv">Conditions générales de location</Label>
        <Textarea id="cgv" name="cgv" rows={8} defaultValue={settings.cgv ?? ""} />
      </div>
      <div className="col-span-2 flex flex-col gap-1.5">
        <Label htmlFor="contrat_modele">Modèle de contrat (corps du contrat, laisser vide pour la mise en page par défaut)</Label>
        <p className="text-xs text-muted-foreground">
          Variables disponibles : {CONTRACT_TEMPLATE_VARIABLES.join(" ")}. Séparez les paragraphes par une
          ligne vide.
        </p>
        <Textarea
          id="contrat_modele"
          name="contrat_modele"
          rows={10}
          defaultValue={settings.contrat_modele ?? ""}
          placeholder={`Entre ${"{{entreprise_nom}}"}, ${"{{entreprise_adresse}}"} (SIRET ${"{{entreprise_siret}}"}), ci-après « le Loueur »,\net ${"{{prenom}}"} ${"{{nom}}"}, demeurant ${"{{adresse_client}}"}, ci-après « le Locataire »,\n\nIl est convenu la location du box n° ${"{{box_numero}}"} (${"{{box_taille}}"}) à compter du ${"{{date_debut}}"}, moyennant un loyer mensuel de ${"{{prix_mensuel}}"} et un dépôt de garantie de ${"{{depot_garantie}}"}.`}
        />
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
