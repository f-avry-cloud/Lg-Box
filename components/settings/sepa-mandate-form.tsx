"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DownloadDocumentButton } from "@/components/documents/download-button";
import { updateSepaMandateSettings, type SettingsFormState } from "@/lib/actions/settings";
import { setSepaMandateUploadPath } from "@/lib/actions/sepa-mandate";
import { SEPA_MANDATE_TEMPLATE_VARIABLES } from "@/lib/pdf/sepa-mandate-template";
import { createClient } from "@/lib/supabase/client";
import type { CompanySettings, SepaMandateTemplateMode } from "@/types/database";

const UPLOAD_PATH = "company-templates/mandat-sepa-modele.pdf";

export function SepaMandateForm({ settings }: { settings: CompanySettings }) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    updateSepaMandateSettings,
    { error: null }
  );
  const [mode, setMode] = useState<SepaMandateTemplateMode>(settings.mandat_sepa_template_mode);
  const [uploadPath, setUploadPath] = useState(settings.mandat_sepa_upload_path);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) toast.success("Paramètres du mandat SEPA enregistrés.");
  }, [state.success]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(UPLOAD_PATH, file, { upsert: true, contentType: "application/pdf" });
      if (uploadError) throw uploadError;

      const result = await setSepaMandateUploadPath(UPLOAD_PATH);
      if (!result.success) throw new Error(result.error ?? "Échec de l'enregistrement.");

      setUploadPath(UPLOAD_PATH);
      toast.success("Modèle de mandat SEPA importé.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'envoi.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Nécessaire pour signer un mandat de prélèvement SEPA (indépendamment du contrat ou en même temps).
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ics">Identifiant Créancier SEPA (ICS)</Label>
          <Input id="ics" name="ics" defaultValue={settings.ics ?? ""} placeholder="FR00ZZZ000000" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mandat_sepa_template_mode">Modèle utilisé</Label>
          <Select
            name="mandat_sepa_template_mode"
            value={mode}
            onValueChange={(v) => setMode(v as SepaMandateTemplateMode)}
          >
            <SelectTrigger id="mandat_sepa_template_mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="integre">Modèle intégré (texte paramétrable)</SelectItem>
              <SelectItem value="upload">Modèle importé (PDF de référence)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {mode === "integre" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mandat_sepa_modele">
            Modèle de mandat (laisser vide pour la mise en page par défaut)
          </Label>
          <p className="text-xs text-muted-foreground">
            Variables disponibles : {SEPA_MANDATE_TEMPLATE_VARIABLES.join(" ")}. Séparez les paragraphes par
            une ligne vide.
          </p>
          <Textarea
            id="mandat_sepa_modele"
            name="mandat_sepa_modele"
            rows={8}
            defaultValue={settings.mandat_sepa_modele ?? ""}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-md border border-border p-3">
          <p className="text-sm">
            Importez le mandat de prélèvement SEPA officiel de votre banque (PDF) — servira de document de
            référence consulté par le locataire ; les informations propres au contrat (RUM, IBAN, BIC) sont
            ajoutées en récapitulatif au moment de la signature.
          </p>
          <div className="flex items-center gap-2">
            <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFile} />
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
              <Upload /> {uploading ? "Envoi..." : uploadPath ? "Remplacer le fichier" : "Importer un PDF"}
            </Button>
            {uploadPath && <DownloadDocumentButton bucket="documents" path={uploadPath} label="Voir le fichier actuel" />}
          </div>
        </div>
      )}

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
