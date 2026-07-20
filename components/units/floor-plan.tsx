"use client";

import { useMemo } from "react";

import { UnitShape } from "@/components/units/unit-shape";
import { computeViewBox, type FloorPlanUnit } from "@/lib/units/floor-plan";
import type { UnitFloor } from "@/types/database";

// Rendu SVG en lecture seule d'un niveau : 1 unité SVG = 1 cm, aucune échelle
// codée en dur — le viewBox s'adapte au bounding box des box du niveau.
export function FloorPlan({
  floor,
  units,
  onSelectUnit,
  selectedUnitId,
}: {
  floor: UnitFloor;
  units: FloorPlanUnit[];
  onSelectUnit?: (unit: FloorPlanUnit) => void;
  selectedUnitId?: string | null;
}) {
  const viewBox = useMemo(() => computeViewBox(units), [units]);

  if (units.length === 0) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground">
        Aucun box sur ce niveau.
      </div>
    );
  }

  return (
    <svg
      key={floor}
      width="100%"
      viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
      className="rounded-xl border border-border bg-card"
      role="img"
      aria-label={`Plan des box — niveau ${floor}`}
    >
      {units.map((unit) => (
        <UnitShape
          key={unit.id}
          unit={unit}
          selected={unit.id === selectedUnitId}
          onClick={onSelectUnit ? () => onSelectUnit(unit) : undefined}
        />
      ))}
    </svg>
  );
}
