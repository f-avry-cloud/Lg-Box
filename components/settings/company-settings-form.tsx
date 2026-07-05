"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DownloadDocumentButton } from "@/components/documents/download-button";
import { updateCompanySettings, setCompanySignatureImagePath, type SettingsFormState } from "@/lib/actions/settings";
import { CONTRACT_TEMPLATE_VARIABLES } from "@/lib/pdf/contract-template";
import { createClient } from "@/lib/supabase/client";
import type { CompanySettings } from "@/types/database";

export function CompanySettingsForm({ settings }: { settings: CompanySettings }) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    updateCompanySettings,
    { error: null }
  );
  const [signatureImagePath, setSignatureImagePath] = useState(settings.signature_image_path);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) toast.success("Paramètres enregistrés.");
  }, [state.success]);

  async function handleSignatureFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSignature(true);
    try {
      const ext = file.type === "image/png" ? "png" : "jpg";
      const path = `company-templates/signature-lgbox.${ext}`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const result = await setCompanySignatureImagePath(path);
      if (!result.success) throw new Error(result.error ?? "Échec de l'enregistrement.");

      setSignatureImagePath(path);
      toast.success("Signature importée.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'envoi.");
    } finally {
      setUploadingSignature(false);
      if (signatureInputRef.current) signatureInputRef.current.value = "";
    }
  }

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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="relance_signature_jours_defaut">Relance de signature après (jours)</Label>
        <Input
          id="relance_signature_jours_defaut"
          name="relance_signature_jours_defaut"
          type="number"
          min={1}
          defaultValue={settings.relance_signature_jours_defaut}
        />
      </div>
      <div className="col-span-2 flex flex-col gap-2 rounded-md border border-border p-3">
        <Label>Signature LG BOX</Label>
        <p className="text-xs text-muted-foreground">
          Image de la signature du Loueur, apposée automatiquement sur chaque contrat généré et affichée sur
          l&apos;espace de signature électronique — le locataire n&apos;a donc pas à la re-signer.
        </p>
        <div className="flex items-center gap-2">
          <input
            ref={signatureInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={handleSignatureFile}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploadingSignature}
            onClick={() => signatureInputRef.current?.click()}
          >
            <Upload /> {uploadingSignature ? "Envoi..." : signatureImagePath ? "Remplacer l'image" : "Importer une image"}
          </Button>
          {signatureImagePath && (
            <DownloadDocumentButton bucket="documents" path={signatureImagePath} label="Voir la signature actuelle" />
          )}
        </div>
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
