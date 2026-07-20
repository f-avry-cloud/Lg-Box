import { STATUS_STYLES, type FloorPlanUnit } from "@/lib/units/floor-plan";
import { cn } from "@/lib/utils";

const CORNER_RADIUS = 8;
const FONT_SIZE_NUMERO = 46;
const FONT_SIZE_TAILLE = 26;

// Un box = un <rect> + deux <text> (numéro, taille), pivotés ensemble autour
// du coin haut-gauche (pos_x, pos_y) — repère partagé par FloorPlan (lecture
// seule) et FloorPlanEditor (drag/resize), pour ne pas dupliquer la géométrie.
export function UnitShape({
  unit,
  selected = false,
  dirty = false,
  onClick,
  rectRef,
}: {
  unit: FloorPlanUnit;
  selected?: boolean;
  dirty?: boolean;
  onClick?: () => void;
  rectRef?: (el: SVGRectElement | null) => void;
}) {
  if (unit.pos_x === null || unit.pos_y === null || unit.largeur_cm === null || unit.profondeur_cm === null) {
    return null;
  }

  const style = STATUS_STYLES[unit.statut];
  const cx = unit.pos_x + unit.largeur_cm / 2;
  const cy = unit.pos_y + unit.profondeur_cm / 2;

  return (
    <g
      data-unit-id={unit.id}
      transform={`rotate(${unit.rotation_deg} ${unit.pos_x} ${unit.pos_y})`}
      onClick={onClick}
      className={onClick ? "cursor-pointer" : undefined}
    >
      <rect
        ref={rectRef}
        data-unit-id={unit.id}
        x={unit.pos_x}
        y={unit.pos_y}
        width={unit.largeur_cm}
        height={unit.profondeur_cm}
        rx={CORNER_RADIUS}
        ry={CORNER_RADIUS}
        vectorEffect="non-scaling-stroke"
        strokeWidth={selected ? 3 : dirty ? 2.5 : 1.5}
        strokeDasharray={dirty && !selected ? "6 4" : undefined}
        className={cn(style.fill, style.stroke, selected && "stroke-foreground")}
      />
      <text
        x={cx}
        y={cy - FONT_SIZE_NUMERO * 0.35}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={FONT_SIZE_NUMERO}
        className={cn(style.text, "pointer-events-none font-semibold select-none")}
      >
        {unit.numero}
      </text>
      {unit.taille_m2 !== null && (
        <text
          x={cx}
          y={cy + FONT_SIZE_TAILLE * 0.9}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={FONT_SIZE_TAILLE}
          className={cn(style.text, "pointer-events-none opacity-80 select-none")}
        >
          {unit.taille_m2} m²
        </text>
      )}
    </g>
  );
}
