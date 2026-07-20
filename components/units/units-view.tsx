"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UnitStatusBadge } from "@/components/status-badge";
import { FloorPlan } from "@/components/units/floor-plan";
import { FloorPlanEditor } from "@/components/units/floor-plan-editor";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FLOOR_LABELS, FLOOR_ORDER } from "@/lib/units/floor-plan";
import type { Unit, UnitFloor, UnitStatus } from "@/types/database";

const GRID_COLORS: Record<UnitStatus, string> = {
  libre: "border-success/40 bg-success/10 text-success",
  loue: "border-primary/40 bg-primary/10 text-primary",
  reserve: "border-warning/40 bg-warning/10 text-warning",
  hors_service: "border-border bg-muted text-muted-foreground",
};

export function UnitsView({ units, isAdmin }: { units: Unit[]; isAdmin: boolean }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("tous");
  const [search, setSearch] = useState("");
  const [planFloor, setPlanFloor] = useState<UnitFloor>("rez_de_chaussee");
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
                <TableHead>Étage</TableHead>
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
                  <TableCell>{FLOOR_LABELS[unit.floor]}</TableCell>
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
        <Tabs value={planFloor} onValueChange={handlePlanFloorChange}>
          <TabsList className="mb-3">
            {FLOOR_ORDER.map((floor) => (
              <TabsTrigger key={floor} value={floor}>
                {FLOOR_LABELS[floor]}
              </TabsTrigger>
            ))}
          </TabsList>
          {FLOOR_ORDER.map((floor) => (
            <TabsContent key={floor} value={floor}>
              {isAdmin ? (
                <FloorPlanEditor
                  key={`${floor}-${resetTokens[floor] ?? 0}`}
                  floor={floor}
                  units={filtered.filter((u) => u.floor === floor)}
                  onDirtyChange={(dirty) => handleFloorDirtyChange(floor, dirty)}
                />
              ) : (
                <>
                  <p className="mb-2 text-xs text-muted-foreground">Cliquez sur un box pour ouvrir sa fiche détail.</p>
                  <FloorPlan
                    floor={floor}
                    units={filtered.filter((u) => u.floor === floor)}
                    onSelectUnit={(unit) => router.push(`/admin/units/${unit.id}`)}
                  />
                </>
              )}
            </TabsContent>
          ))}
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
