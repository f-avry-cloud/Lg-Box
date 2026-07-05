"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { recordDocument } from "@/lib/actions/customers";
import type { DocumentType } from "@/types/database";

export function DocumentUpload({
  customerId,
  documentType = "autre",
  label = "Ajouter un document",
}: {
  customerId: string;
  documentType?: DocumentType;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${customerId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
      if (uploadError) throw uploadError;

      const result = await recordDocument({
        relatedTable: "customers",
        relatedId: customerId,
        nomFichier: file.name,
        url: path,
        type: documentType,
      });
      if (!result.success) throw new Error(result.error ?? "Échec de l'enregistrement du document.");

      toast.success("Document ajouté.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'envoi.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input ref={inputRef} type="file" className="hidden" onChange={handleChange} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload /> {uploading ? "Envoi..." : label}
      </Button>
    </div>
  );
}
