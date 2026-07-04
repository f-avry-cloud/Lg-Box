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
import { importBankStatement } from "@/lib/actions/bank";

// Convertit un montant au format "1 234,56" ou "-45.00" en nombre JS.
function parseAmount(raw: string): number {
  const cleaned = raw.replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  return Number(cleaned) || 0;
}

export function CsvImportDialog() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<string[][]>([]);
  const [dateCol, setDateCol] = useState<string>("");
  const [libelleCol, setLibelleCol] = useState<string>("");
  const [montantCol, setMontantCol] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<string[]>(file, {
      complete: (result) => {
        const data = result.data.filter((r) => r.some((cell) => cell?.trim()));
        setRows(data);
        setDateCol("0");
        setLibelleCol("1");
        setMontantCol("2");
      },
    });
  }

  function handleImport() {
    const dateIdx = Number(dateCol);
    const libelleIdx = Number(libelleCol);
    const montantIdx = Number(montantCol);

    const hasHeader = Number.isNaN(Date.parse(rows[0]?.[dateIdx] ?? ""));
    const dataRows = hasHeader ? rows.slice(1) : rows;

    const parsed = dataRows
      .map((r) => ({
        date: r[dateIdx]?.trim(),
        libelle: r[libelleIdx]?.trim() ?? "",
        montant: parseAmount(r[montantIdx] ?? "0"),
      }))
      .filter((r) => r.date && !Number.isNaN(Date.parse(r.date)) && r.montant !== 0)
      .map((r) => ({ ...r, date: new Date(r.date).toISOString().slice(0, 10) }));

    if (parsed.length === 0) {
      toast.error("Aucune ligne exploitable trouvée avec ce mapping de colonnes.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await importBankStatement(parsed);
        toast.success(`${res.imported} opération(s) importée(s).`);
        setOpen(false);
        setRows([]);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de l'import.");
      }
    });
  }

  const columnCount = rows[0]?.length ?? 0;
  const columnOptions = Array.from({ length: columnCount }, (_, i) => i);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload /> Importer un relevé CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importer un relevé bancaire (CSV)</DialogTitle>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="csv-file">Fichier CSV exporté depuis votre banque</Label>
            <input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="text-sm"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Indiquez quelle colonne correspond à quelle donnée, puis vérifiez l&apos;aperçu ci-dessous.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Colonne Date</Label>
                <Select value={dateCol} onValueChange={setDateCol}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {columnOptions.map((i) => (
                      <SelectItem key={i} value={String(i)}>
                        Colonne {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Colonne Libellé</Label>
                <Select value={libelleCol} onValueChange={setLibelleCol}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {columnOptions.map((i) => (
                      <SelectItem key={i} value={String(i)}>
                        Colonne {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Colonne Montant</Label>
                <Select value={montantCol} onValueChange={setMontantCol}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {columnOptions.map((i) => (
                      <SelectItem key={i} value={String(i)}>
                        Colonne {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {rows[0]?.map((_, i) => <TableHead key={i}>Colonne {i + 1}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 5).map((r, i) => (
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
            <Button variant="outline" onClick={() => setRows([])}>
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
