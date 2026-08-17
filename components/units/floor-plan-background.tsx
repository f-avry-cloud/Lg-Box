import { FLOOR_BACKGROUNDS } from "@/lib/units/floor-plan-walls";
import type { UnitFloor } from "@/types/database";

// Fond de plan : murs, sols et portes relevés du bâtiment, dessinés sous les
// box. Purement visuel — il ne porte aucune donnée métier (ni surface, ni
// prix) et n'intercepte aucun clic, pour ne pas gêner la sélection des box.
export function FloorPlanBackground({ floor }: { floor: UnitFloor }) {
  const bg = FLOOR_BACKGROUNDS[floor];
  if (!bg) return null;

  return (
    <g transform={bg.transform} className="pointer-events-none" aria-hidden="true">
      {bg.paths.map((p, i) =>
        p.cls === "door" ? (
          <path
            key={i}
            transform={p.t}
            d={p.d}
            fill="none"
            className="stroke-muted-foreground/60"
            strokeWidth={0.012}
            strokeMiterlimit={4}
          />
        ) : (
          <path
            key={i}
            transform={p.t}
            d={p.d}
            className={p.cls === "wall" ? "fill-foreground/75" : "fill-muted-foreground/10"}
          />
        )
      )}
    </g>
  );
}
