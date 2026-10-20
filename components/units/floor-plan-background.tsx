import { FLOOR_BACKGROUNDS } from "@/lib/units/floor-plan-walls";
import type { UnitFloor } from "@/types/database";

// Fond de plan : murs, sols et portes relevés du bâtiment, dessinés sous les
// box. Purement visuel — il ne porte aucune donnée métier (ni surface, ni
// prix) et n'intercepte aucun clic, pour ne pas gêner la sélection des box.
//
// Les couleurs sont posées en style direct plutôt qu'en classes utilitaires :
// ces variables de thème sont toujours définies, là où une classe du type
// `fill-foreground/75` dépend de la génération CSS et peut, si elle manque,
// rendre tout le fond invisible sans le moindre message d'erreur.
//
// Le trait des portes est en épaisseur d'écran constante (non-scaling-stroke) :
// le plan est dessiné en centimètres et fortement réduit à l'affichage, une
// épaisseur exprimée dans le repère du dessin y serait invisible.
export function FloorPlanBackground({ floor }: { floor: UnitFloor }) {
  const bg = FLOOR_BACKGROUNDS[floor];
  if (!bg) return null;

  return (
    <g transform={bg.transform} style={{ pointerEvents: "none" }} aria-hidden="true">
      {bg.paths.map((p, i) =>
        p.cls === "door" ? (
          <path
            key={i}
            transform={p.t}
            d={p.d}
            fill="none"
            stroke="var(--muted-foreground)"
            strokeOpacity={0.7}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ) : (
          <path
            key={i}
            transform={p.t}
            d={p.d}
            fill={p.cls === "wall" ? "var(--foreground)" : "var(--muted-foreground)"}
            fillOpacity={p.cls === "wall" ? 0.8 : 0.12}
          />
        )
      )}
    </g>
  );
}
