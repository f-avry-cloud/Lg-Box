"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import interact from "interactjs";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { UnitShape } from "@/components/units/unit-shape";
import { saveUnitPositions } from "@/lib/actions/units";
import {
  computeScale,
  computeViewBox,
  snapToGrid,
  MIN_UNIT_SIZE_CM,
  type FloorPlanUnit,
  type ViewBox,
} from "@/lib/units/floor-plan";
import type { UnitFloor } from "@/types/database";

const NUDGE_STEP_CM = 10;
const NUDGE_STEP_FINE_CM = 1;

// Plan interactif admin : même rendu SVG que FloorPlan (via UnitShape), avec
// interact.js branché sur chaque <rect> pour le drag et le resize. Toute la
// conversion pixel -> cm passe par computeScale(viewBox, ...), recalculée à
// chaque évènement à partir du rendu réel du SVG — jamais une échelle fixe.
//
// L'appelant (units-view.tsx) monte une instance dédiée par niveau — floor
// et units ne changent donc jamais après le montage de CETTE instance, d'où
// des états initialisés une seule fois (useState paresseux) plutôt qu'un
// effet de réinitialisation au changement de niveau.
export function FloorPlanEditor({
  floor,
  units,
  onDirtyChange,
}: {
  floor: UnitFloor;
  units: FloorPlanUnit[];
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [unitsMap, setUnitsMap] = useState<Map<string, FloorPlanUnit>>(() => new Map(units.map((u) => [u.id, u])));
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewBox] = useState<ViewBox>(() => computeViewBox(units));
  const [saving, setSaving] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const rectRefs = useRef<Map<string, SVGRectElement>>(new Map());
  const viewBoxRef = useRef(viewBox);
  const selectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    viewBoxRef.current = viewBox;
  }, [viewBox]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    onDirtyChange?.(dirtyIds.size > 0);
  }, [dirtyIds, onDirtyChange]);

  const markDirty = useCallback((id: string) => {
    setDirtyIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  function getScale() {
    const svg = svgRef.current;
    const rect = svg?.getBoundingClientRect();
    return computeScale(viewBoxRef.current, rect?.width ?? 0, rect?.height ?? 0);
  }

  const unitIdsKey = useMemo(() => Array.from(unitsMap.keys()).join(","), [unitsMap]);

  // Attache interact.js sur chaque <rect> du niveau courant. Ne se relance
  // que si l'ensemble des box affichés change (changement de niveau) — pas à
  // chaque déplacement, ce qui casserait un drag en cours.
  useEffect(() => {
    if (!unitIdsKey) return;
    const ids = unitIdsKey.split(",");
    const interactables = ids.map((id) => {
      const el = rectRefs.current.get(id);
      if (!el) return null;

      return interact(el)
        .draggable({
          listeners: {
            move(event) {
              const { x: scaleX, y: scaleY } = getScale();
              setUnitsMap((prev) => {
                const current = prev.get(id);
                if (!current || current.pos_x === null || current.pos_y === null) return prev;
                const next = new Map(prev);
                next.set(id, {
                  ...current,
                  pos_x: snapToGrid(current.pos_x + event.dx * scaleX),
                  pos_y: snapToGrid(current.pos_y + event.dy * scaleY),
                });
                return next;
              });
              markDirty(id);
            },
          },
        })
        .resizable({
          edges: { left: true, right: true, top: true, bottom: true },
          margin: 8,
          listeners: {
            move(event) {
              const { x: scaleX, y: scaleY } = getScale();
              setUnitsMap((prev) => {
                const current = prev.get(id);
                if (
                  !current ||
                  current.pos_x === null ||
                  current.pos_y === null ||
                  current.largeur_cm === null ||
                  current.profondeur_cm === null
                ) {
                  return prev;
                }
                const largeur = Math.max(
                  MIN_UNIT_SIZE_CM,
                  snapToGrid(current.largeur_cm + event.deltaRect.width * scaleX)
                );
                const profondeur = Math.max(
                  MIN_UNIT_SIZE_CM,
                  snapToGrid(current.profondeur_cm + event.deltaRect.height * scaleY)
                );
                const posX = snapToGrid(current.pos_x + event.deltaRect.left * scaleX);
                const posY = snapToGrid(current.pos_y + event.deltaRect.top * scaleY);

                const next = new Map(prev);
                next.set(id, { ...current, largeur_cm: largeur, profondeur_cm: profondeur, pos_x: posX, pos_y: posY });
                return next;
              });
              markDirty(id);
            },
          },
        })
        .on("tap", () => setSelectedId(id));
    });

    return () => {
      interactables.forEach((i) => i?.unset());
    };
  }, [unitIdsKey, markDirty]);

  // Déplacement fin au clavier pour le box sélectionné — ±10 cm, ±1 cm avec
  // Majuscule. Ignoré si le focus est dans un champ de saisie.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const id = selectedIdRef.current;
      if (!id) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      const step = event.shiftKey ? NUDGE_STEP_FINE_CM : NUDGE_STEP_CM;
      let dx = 0;
      let dy = 0;
      if (event.key === "ArrowLeft") dx = -step;
      else if (event.key === "ArrowRight") dx = step;
      else if (event.key === "ArrowUp") dy = -step;
      else if (event.key === "ArrowDown") dy = step;
      else return;

      event.preventDefault();
      setUnitsMap((prev) => {
        const current = prev.get(id);
        if (!current || current.pos_x === null || current.pos_y === null) return prev;
        const next = new Map(prev);
        next.set(id, { ...current, pos_x: current.pos_x + dx, pos_y: current.pos_y + dy });
        return next;
      });
      markDirty(id);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [markDirty]);

  async function handleSave() {
    const updates = Array.from(dirtyIds)
      .map((id) => unitsMap.get(id))
      .filter(
        (u): u is FloorPlanUnit & { pos_x: number; pos_y: number; largeur_cm: number; profondeur_cm: number } =>
          Boolean(u && u.pos_x !== null && u.pos_y !== null && u.largeur_cm !== null && u.profondeur_cm !== null)
      )
      .map((u) => ({
        id: u.id,
        pos_x: u.pos_x,
        pos_y: u.pos_y,
        largeur_cm: u.largeur_cm,
        profondeur_cm: u.profondeur_cm,
        rotation_deg: u.rotation_deg,
      }));
    if (updates.length === 0) return;

    setSaving(true);
    const result = await saveUnitPositions(updates);
    setSaving(false);

    if (!result.success) {
      toast.error(result.error ?? "Impossible d'enregistrer les positions.");
      return;
    }

    setUnitsMap((prev) => {
      const next = new Map(prev);
      (result.units ?? []).forEach((u) => next.set(u.id, u));
      return next;
    });
    setDirtyIds(new Set());
    toast.success(`${updates.length} box enregistré${updates.length > 1 ? "s" : ""}.`);
  }

  const orderedUnits = useMemo(() => Array.from(unitsMap.values()), [unitsMap]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Glissez un box pour le déplacer, tirez un bord pour le redimensionner (grille de 10 cm, taille mini{" "}
          {MIN_UNIT_SIZE_CM} cm). Flèches du clavier pour un box sélectionné (±10 cm, ±1 cm avec Majuscule).
        </p>
        <Button size="sm" onClick={handleSave} disabled={dirtyIds.size === 0 || saving}>
          {saving ? "Enregistrement..." : dirtyIds.size > 0 ? `Enregistrer (${dirtyIds.size})` : "Enregistrer"}
        </Button>
      </div>

      {orderedUnits.length === 0 ? (
        <div className="flex h-[420px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground">
          Aucun box sur ce niveau.
        </div>
      ) : (
        <svg
          ref={svgRef}
          key={floor}
          width="100%"
          viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
          className="touch-none rounded-xl border border-border bg-card select-none"
          role="img"
          aria-label={`Plan éditable des box — niveau ${floor}`}
        >
          {orderedUnits.map((unit) => (
            <UnitShape
              key={unit.id}
              unit={unit}
              selected={unit.id === selectedId}
              dirty={dirtyIds.has(unit.id)}
              rectRef={(el) => {
                if (el) rectRefs.current.set(unit.id, el);
                else rectRefs.current.delete(unit.id);
              }}
            />
          ))}
        </svg>
      )}
    </div>
  );
}
