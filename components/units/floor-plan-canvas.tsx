"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DndContext, useDraggable, type DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";

import { updateUnitPosition } from "@/lib/actions/units";
import { cn } from "@/lib/utils";
import type { Unit, UnitStatus } from "@/types/database";

const GRID_COLORS: Record<UnitStatus, string> = {
  libre: "border-success/50 bg-success/10 text-success",
  loue: "border-primary/50 bg-primary/10 text-primary",
  reserve: "border-warning/50 bg-warning/10 text-warning",
  hors_service: "border-border bg-muted text-muted-foreground",
};

// Position de repli pour les box jamais encore glissés (pos_x/pos_y nuls),
// simple grille pour qu'ils soient visibles avant le premier drag.
function fallbackPosition(index: number): { x: number; y: number } {
  const columns = 8;
  const col = index % columns;
  const row = Math.floor(index / columns);
  return { x: 6 + col * 12, y: 8 + row * 16 };
}

function DraggableUnit({
  unit,
  x,
  y,
}: {
  unit: Unit;
  x: number;
  y: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: unit.id,
  });

  const style: React.CSSProperties = {
    left: `${x}%`,
    top: `${y}%`,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "absolute flex w-20 -translate-x-1/2 -translate-y-1/2 cursor-grab flex-col items-center rounded-lg border px-2 py-2 text-center shadow-sm active:cursor-grabbing",
        GRID_COLORS[unit.statut],
        isDragging && "opacity-80 shadow-lg"
      )}
      {...attributes}
      {...listeners}
    >
      <span className="font-mono text-xs font-semibold">{unit.numero}</span>
      <span className="text-[10px] opacity-80">{unit.taille_libelle}</span>
      <Link
        href={`/admin/units/${unit.id}`}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="mt-0.5 text-[9px] underline opacity-70 hover:opacity-100"
      >
        détail
      </Link>
    </div>
  );
}

export function FloorPlanCanvas({ units }: { units: Unit[] }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    const initial: Record<string, { x: number; y: number }> = {};
    units.forEach((u, i) => {
      initial[u.id] =
        u.pos_x !== null && u.pos_y !== null ? { x: u.pos_x, y: u.pos_y } : fallbackPosition(i);
    });
    return initial;
  });

  const unitsById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);

  function handleDragEnd(event: DragEndEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const unitId = String(event.active.id);
    const current = positions[unitId];
    if (!current) return;

    const deltaXPct = (event.delta.x / rect.width) * 100;
    const deltaYPct = (event.delta.y / rect.height) * 100;
    const next = {
      x: Math.min(100, Math.max(0, current.x + deltaXPct)),
      y: Math.min(100, Math.max(0, current.y + deltaYPct)),
    };

    setPositions((prev) => ({ ...prev, [unitId]: next }));

    updateUnitPosition(unitId, next.x, next.y).catch((e) => {
      toast.error(e instanceof Error ? e.message : "Impossible d'enregistrer la position.");
    });
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div
        ref={canvasRef}
        className="relative h-[520px] w-full overflow-hidden rounded-xl border border-dashed border-border bg-muted/40"
      >
        {units.map((unit) => {
          const pos = positions[unit.id] ?? fallbackPosition(0);
          const liveUnit = unitsById.get(unit.id) ?? unit;
          return <DraggableUnit key={unit.id} unit={liveUnit} x={pos.x} y={pos.y} />;
        })}
        {units.length === 0 && (
          <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Aucun box sur cet étage.
          </p>
        )}
      </div>
    </DndContext>
  );
}
