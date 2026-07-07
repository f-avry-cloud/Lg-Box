import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

// Lien direct vers app/api/export/invoices-zip — pas d'état côté client,
// le navigateur gère le téléchargement du ZIP généré à la volée.
export function InvoiceZipExportButton({ year, customerId }: { year: number; customerId?: string }) {
  const params = new URLSearchParams({ year: String(year) });
  if (customerId) params.set("customerId", customerId);

  return (
    <Button asChild variant="outline" size="sm">
      <a href={`/api/export/invoices-zip?${params.toString()}`}>
        <Download /> Exporter les factures ({year})
      </a>
    </Button>
  );
}
