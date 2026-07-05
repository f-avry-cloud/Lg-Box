"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { toast } from "sonner";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ActionResult } from "@/lib/actions/result";

export type CsvImportField = { key: string; label: string; required?: boolean };

// Import CSV générique : l'utilisateur mappe librement les colonnes de son
// fichier vers les champs attendus (utilisé pour la reprise de données
// existantes : clients, box...), au lieu de supposer un ordre de colonnes fixe.
export function CsvImportDialog({
  triggerLabel,
  title,
  description,
  fields,
  onImport,
}: {
  triggerLabel: string;
  title: string;
  description: string;
  fields: CsvImportField[];
  onImport: (rows: Record<string, string>[]) => Promise<ActionResult & { imported?: number }>;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<string[][]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<string[]>(file, {
      complete: (result) => {
        const data = result.data.filter((r) => r.some((cell) => cell?.trim()));
        setRows(data);
        const initialMapping: Record<string, string> = {};
        fields.forEach((f, i) => {
          if (i < (data[0]?.length ?? 0)) initialMapping[f.key] = String(i);
        });
        setMapping(initialMapping);
      },
    });
  }

  function reset() {
    setRows([]);
    setMapping({});
  }

  function handleImport() {
    const dataRows = hasHeader ? rows.slice(1) : rows;
    const mappedRows = dataRows
      .map((r) => {
        const obj: Record<string, string> = {};
        for (const f of fields) {
          const colIndex = mapping[f.key];
          obj[f.key] = colIndex !== undefined ? (r[Number(colIndex)]?.trim() ?? "") : "";
        }
        return obj;
      })
      .filter((obj) => fields.every((f) => !f.required || obj[f.key]));

    if (mappedRows.length === 0) {
      toast.error("Aucune ligne exploitable avec ce mapping (vérifiez les champs obligatoires).");
      return;
    }

    startTransition(async () => {
      const result = await onImport(mappedRows);
      if (!result.success) {
        toast.error(result.error ?? "Erreur lors de l'import.");
        return;
      }
      toast.success(`${result.imported ?? mappedRows.length} ligne(s) importée(s).`);
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  const headerRow = rows[0];
  const columnCount = headerRow?.length ?? 0;
  const columnLabel = (i: number) => (hasHeader && headerRow?.[i] ? headerRow[i] : `Colonne ${i + 1}`);

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">{description}</p>
            <Label htmlFor="csv-file">Fichier CSV</Label>
            <input id="csv-file" type="file" accept=".csv,text/csv" onChange={handleFile} className="text-sm" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hasHeader}
                onChange={(e) => setHasHeader(e.target.checked)}
              />
              La première ligne contient les en-têtes de colonnes
            </label>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {fields.map((f) => (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <Label>
                    {f.label}
                    {f.required && " *"}
                  </Label>
                  <Select
                    value={mapping[f.key] ?? ""}
                    onValueChange={(v) => setMapping((prev) => ({ ...prev, [f.key]: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Ignorer" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: columnCount }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {columnLabel(i)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="max-h-48 overflow-y-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headerRow?.map((_, i) => <TableHead key={i}>{columnLabel(i)}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(hasHeader ? 1 : 0, hasHeader ? 6 : 5).map((r, i) => (
                    <TableRow key={i}>
                      {r.map((cell, j) => (
                        <TableCell key={j} className="max-w-32 truncate">
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          {rows.length > 0 && (
            <Button variant="outline" onClick={reset}>
              Changer de fichier
            </Button>
          )}
          <Button disabled={rows.length === 0 || pending} onClick={handleImport}>
            {pending ? "Import..." : "Importer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
