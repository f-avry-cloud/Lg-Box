"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Columns3 } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UnitStatusBadge } from "@/components/status-badge";
import { FloorPlan } from "@/components/units/floor-plan";
import { FloorPlanEditor } from "@/components/units/floor-plan-editor";
import { UnitSizeEditForm } from "@/components/units/unit-size-edit-form";
import { UnitNumeroEditForm } from "@/components/units/unit-numero-edit-form";
import { UnitPriceEditForm } from "@/components/units/unit-price-edit-form";
import { UnitInfoPanel } from "@/components/units/unit-info-panel";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FLOOR_LABELS, FLOOR_ORDER, type UnitTenantInfo } from "@/lib/units/floor-plan";
import type { Unit, UnitFloor, UnitStatus } from "@/types/database";

type ColumnKey = "batiment" | "taille" | "type" | "etage" | "prix" | "statut";

const COLUMN_LABELS: Record<ColumnKey, string> = {
  batiment: "Bâtiment",
  taille: "Taille",
  type: "Type",
  etage: "Étage",
  prix: "Prix / mois",
  statut: "Statut",
};

// Type et Étage n'apportent plus grand-chose au quotidien (bâtiment suffit) —
// masqués par défaut, mais restent disponibles via le filtre de colonnes.
const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = ["batiment", "taille", "prix", "statut"];

const GRID_COLORS: Record<UnitStatus, string> = {
  libre: "border-success/40 bg-success/10 text-success",
  loue: "border-primary/40 bg-primary/10 text-primary",
  reserve: "border-warning/40 bg-warning/10 text-warning",
  hors_service: "border-border bg-muted text-muted-foreground",
};

export function UnitsView({
  units,
  isAdmin,
  tenantsByUnit,
}: {
  units: Unit[];
  isAdmin: boolean;
  tenantsByUnit: Record<string, UnitTenantInfo>;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("tous");
  const [search, setSearch] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(new Set(DEFAULT_VISIBLE_COLUMNS));
  const [columnsOpen, setColumnsOpen] = useState(false);

  function toggleColumn(key: ColumnKey) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  const [planFloor, setPlanFloor] = useState<UnitFloor>("rez_de_chaussee");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  // Chaque niveau garde son propre FloorPlanEditor monté (Radix Tabs ne
  // démonte pas les onglets inactifs) — un dirty par niveau évite qu'un
  // niveau propre n'efface par erreur l'état "modifié" d'un autre.
  const [dirtyFloors, setDirtyFloors] = useState<Set<UnitFloor>>(new Set());
  // Incrémenté par niveau pour forcer un remontage propre (abandon des
  // modifications non enregistrées) quand l'utilisateur confirme le changement.
  const [resetTokens, setResetTokens] = useState<Record<string, number>>({});

  function handlePlanFloorChange(next: string) {
    if (dirtyFloors.has(planFloor)) {
      if (
        !window.confirm(
          "Des modifications de ce niveau ne sont pas enregistrées. Les abandonner et changer de niveau ?"
        )
      ) {
        return;
      }
      setResetTokens((prev) => ({ ...prev, [planFloor]: (prev[planFloor] ?? 0) + 1 }));
      setDirtyFloors((prev) => {
        const nextSet = new Set(prev);
        nextSet.delete(planFloor);
        return nextSet;
      });
    }
    setPlanFloor(next as UnitFloor);
    setSelectedUnit(null);
  }

  function handleFloorDirtyChange(floor: UnitFloor, dirty: boolean) {
    setDirtyFloors((prev) => {
      const next = new Set(prev);
      if (dirty) next.add(floor);
      else next.delete(floor);
      return next;
    });
  }

  const filtered = useMemo(() => {
    return units
      .filter((u) => statusFilter === "tous" || u.statut === statusFilter)
      .filter((u) => u.numero.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.numero.localeCompare(b.numero));
  }, [units, statusFilter, search]);

  const unitsById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);

  function handleSelectUnit(unit: { id: string }) {
    setSelectedUnit(unitsById.get(unit.id) ?? null);
  }

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
          <Dialog open={columnsOpen} onOpenChange={setColumnsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" title="Colonnes affichées">
                <Columns3 className="size-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Colonnes affichées</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-2 text-sm">
                {(Object.keys(COLUMN_LABELS) as ColumnKey[]).map((key) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(key)}
                      onChange={() => toggleColumn(key)}
                    />
                    {COLUMN_LABELS[key]}
                  </label>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <TabsContent value="liste">
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                {visibleColumns.has("batiment") && <TableHead>Bâtiment</TableHead>}
                {visibleColumns.has("taille") && <TableHead>Taille</TableHead>}
                {visibleColumns.has("type") && <TableHead>Type</TableHead>}
                {visibleColumns.has("etage") && <TableHead>Étage</TableHead>}
                {visibleColumns.has("prix") && <TableHead>Prix / mois</TableHead>}
                {visibleColumns.has("statut") && <TableHead>Statut</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <Link href={`/admin/units/${unit.id}`} className="font-mono font-medium hover:text-primary">
                        {unit.numero}
                      </Link>
                      <UnitNumeroEditForm unitId={unit.id} numero={unit.numero} />
                    </span>
                  </TableCell>
                  {visibleColumns.has("batiment") && <TableCell>{unit.zone ?? "—"}</TableCell>}
                  {visibleColumns.has("taille") && (
                    <TableCell>
                      <span className="flex items-center gap-1">
                        {unit.taille_libelle}
                        <UnitSizeEditForm unitId={unit.id} tailleM2={unit.taille_m2} />
                      </span>
                    </TableCell>
                  )}
                  {visibleColumns.has("type") && <TableCell className="capitalize">{unit.type}</TableCell>}
                  {visibleColumns.has("etage") && <TableCell>{FLOOR_LABELS[unit.floor]}</TableCell>}
                  {visibleColumns.has("prix") && (
                    <TableCell>
                      <span className="flex items-center gap-1">
                        {formatCurrency(unit.prix_mensuel_standard)}
                        <UnitPriceEditForm unitId={unit.id} prixMensuelStandard={unit.prix_mensuel_standard} />
                      </span>
                    </TableCell>
                  )}
                  {visibleColumns.has("statut") && (
                    <TableCell>
                      <UnitStatusBadge status={unit.statut} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={visibleColumns.size + 1} className="py-8 text-center text-muted-foreground">
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
        <Tabs value={planFloor} onValueChange={handlePlanFloorChange}>
          <TabsList className="mb-3">
            {FLOOR_ORDER.map((floor) => (
              <TabsTrigger key={floor} value={floor}>
                {FLOOR_LABELS[floor]}
              </TabsTrigger>
            ))}
          </TabsList>
          {FLOOR_ORDER.map((floor) => {
            const floorSelectedUnit = selectedUnit?.floor === floor ? selectedUnit : null;
            return (
              <TabsContent key={floor} value={floor}>
                <p className="mb-2 text-xs text-muted-foreground">
                  {isAdmin
                    ? "Glissez un box pour le déplacer, cliquez pour voir qui l'occupe."
                    : "Cliquez sur un box pour voir qui l'occupe."}
                </p>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                  <div className="min-w-0 flex-1">
                    {isAdmin ? (
                      <FloorPlanEditor
                        key={`${floor}-${resetTokens[floor] ?? 0}`}
                        floor={floor}
                        units={filtered.filter((u) => u.floor === floor)}
                        onDirtyChange={(dirty) => handleFloorDirtyChange(floor, dirty)}
                        onSelectUnit={handleSelectUnit}
                      />
                    ) : (
                      <FloorPlan
                        floor={floor}
                        units={filtered.filter((u) => u.floor === floor)}
                        onSelectUnit={handleSelectUnit}
                        selectedUnitId={floorSelectedUnit?.id ?? null}
                      />
                    )}
                  </div>
                  {floorSelectedUnit && (
                    <div className="w-full shrink-0 lg:w-80">
                      <UnitInfoPanel
                        key={floorSelectedUnit.id}
                        unit={floorSelectedUnit}
                        tenant={tenantsByUnit[floorSelectedUnit.id]}
                        onClose={() => setSelectedUnit(null)}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
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
