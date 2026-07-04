"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function DownloadDocumentButton({
  bucket,
  path,
  label = "Télécharger le PDF",
}: {
  bucket: "contracts" | "invoices" | "documents";
  path: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 120);
      if (error || !data) throw error ?? new Error("Lien introuvable.");
      window.open(data.signedUrl, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec du téléchargement.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={loading} onClick={handleDownload}>
      <Download /> {loading ? "..." : label}
    </Button>
  );
}
