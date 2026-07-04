"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UnitStatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Unit, UnitStatus } from "@/types/database";

const GRID_COLORS: Record<UnitStatus, string> = {
  libre: "border-success/40 bg-success/10 text-success",
  loue: "border-primary/40 bg-primary/10 text-primary",
  reserve: "border-warning/40 bg-warning/10 text-warning",
  hors_service: "border-border bg-muted text-muted-foreground",
};

export function UnitsView({ units }: { units: Unit[] }) {
  const [statusFilter, setStatusFilter] = useState<string>("tous");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return units
      .filter((u) => statusFilter === "tous" || u.statut === statusFilter)
      .filter((u) => u.numero.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.numero.localeCompare(b.numero));
  }, [units, statusFilter, search]);

  return (
    <Tabs defaultValue="liste">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="liste">Liste</TabsTrigger>
          <TabsTrigger value="plan">Plan</TabsTrigger>
        </TabsList>
        <div className="flex gap-2">
          <Input
            placeholder="Rechercher un numéro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous statuts</SelectItem>
              <SelectItem value="libre">Libre</SelectItem>
              <SelectItem value="loue">Loué</SelectItem>
              <SelectItem value="reserve">Réservé</SelectItem>
              <SelectItem value="hors_service">Hors service</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <TabsContent value="liste">
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Taille</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Prix / mois</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell>
                    <Link href={`/admin/units/${unit.id}`} className="font-mono font-medium hover:text-primary">
                      {unit.numero}
                    </Link>
                  </TableCell>
                  <TableCell>{unit.taille_libelle}</TableCell>
                  <TableCell className="capitalize">{unit.type}</TableCell>
                  <TableCell>{unit.zone}</TableCell>
                  <TableCell>{formatCurrency(unit.prix_mensuel_standard)}</TableCell>
                  <TableCell>
                    <UnitStatusBadge status={unit.statut} />
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Aucun box ne correspond à ces filtres.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="plan">
        <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          {(Object.keys(GRID_COLORS) as UnitStatus[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-full", GRID_COLORS[s].split(" ")[1])} />
              <UnitStatusBadgeLabel status={s} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
          {filtered.map((unit) => (
            <Link
              key={unit.id}
              href={`/admin/units/${unit.id}`}
              className={cn(
                "rounded-lg border px-2 py-2 text-center transition hover:opacity-75",
                GRID_COLORS[unit.statut]
              )}
            >
              <div className="font-mono text-xs font-semibold">{unit.numero}</div>
              <div className="mt-0.5 text-[10px] opacity-80">{unit.taille_libelle}</div>
            </Link>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}

function UnitStatusBadgeLabel({ status }: { status: UnitStatus }) {
  const labels: Record<UnitStatus, string> = {
    libre: "Libre",
    loue: "Loué",
    reserve: "Réservé",
    hors_service: "Hors service",
  };
  return <span>{labels[status]}</span>;
}
