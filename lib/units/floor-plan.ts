import type { SupabaseClient } from "@supabase/supabase-js";

import type { ContractStatus, Database, Unit, UnitFloor, UnitStatus } from "@/types/database";

// Locataire actuel d'un box (contrat actif ou en préavis) — construit côté
// page (app/admin/units/page.tsx) à partir d'une jointure contrats+clients en
// mémoire, sur le même principe que les autres Map id->info du projet.
// Affiché dans le panneau d'info du plan interactif (UnitInfoPanel).
export type UnitTenantInfo = {
  contractId: string;
  customerId: string;
  customerName: string;
  prixMensuel: number;
  statut: ContractStatus;
};

// Colonnes strictement nécessaires au plan interactif — un Unit complet (liste
// des box, fiche détail...) en est un sur-ensemble structurel compatible.
// Réutilisée telle quelle par saveUnitPositions (lib/actions/units.ts) pour
// relire les units après écriture, plutôt que de dupliquer la liste.
export const FLOOR_PLAN_COLUMNS =
  "id, numero, zone, floor, statut, pos_x, pos_y, largeur_cm, profondeur_cm, rotation_deg, taille_m2" as const;

export type FloorPlanUnit = Pick<
  Unit,
  "id" | "numero" | "zone" | "floor" | "statut" | "pos_x" | "pos_y" | "largeur_cm" | "profondeur_cm" | "rotation_deg" | "taille_m2"
>;

// Charge les box d'un site pour un niveau donné, triés par zone puis numéro —
// c'est ce tri qui détermine l'ordre de rendu des <rect> (peu importe pour le
// visuel, mais rend le DOM stable entre deux chargements).
export async function loadFloorUnits(
  supabase: SupabaseClient<Database>,
  siteId: string,
  floor: UnitFloor
): Promise<FloorPlanUnit[]> {
  const { data, error } = await supabase
    .from("units")
    .select(FLOOR_PLAN_COLUMNS)
    .eq("site_id", siteId)
    .eq("floor", floor)
    .order("zone")
    .order("numero");
  if (error) throw error;
  return data ?? [];
}

export const GRID_SNAP_CM = 10;
export const MIN_UNIT_SIZE_CM = 100;
const VIEWBOX_MARGIN_CM = 150;
// viewBox de repli quand un niveau n'a aucun box positionné (évite un SVG
// dégénéré 0x0 qui ne peut rien afficher, y compris un message "vide").
const FALLBACK_VIEWBOX = { minX: 0, minY: 0, width: 2000, height: 1500 };

export type ViewBox = { minX: number; minY: number; width: number; height: number };

// Le viewBox englobe tous les box du niveau plus une marge — pas de constante
// d'échelle : 1 unité SVG = 1 cm, le viewBox borne juste le cadrage.
export function computeViewBox(units: FloorPlanUnit[], margin: number = VIEWBOX_MARGIN_CM): ViewBox {
  const placed = units.filter(
    (u): u is FloorPlanUnit & { pos_x: number; pos_y: number; largeur_cm: number; profondeur_cm: number } =>
      u.pos_x !== null && u.pos_y !== null && u.largeur_cm !== null && u.profondeur_cm !== null
  );
  if (placed.length === 0) return FALLBACK_VIEWBOX;

  const minX = Math.min(...placed.map((u) => u.pos_x)) - margin;
  const minY = Math.min(...placed.map((u) => u.pos_y)) - margin;
  const maxX = Math.max(...placed.map((u) => u.pos_x + u.largeur_cm)) + margin;
  const maxY = Math.max(...placed.map((u) => u.pos_y + u.profondeur_cm)) + margin;

  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

export function snapToGrid(value: number, step: number = GRID_SNAP_CM): number {
  return Math.round(value / step) * step;
}

// Ratio pixel -> cm à appliquer aux deltas de souris pendant un drag/resize —
// recalculé à chaque évènement à partir de la taille réellement affichée du
// SVG, jamais une constante d'échelle fixe (le viewBox peut être redimensionné
// par le navigateur indépendamment du zoom/de la fenêtre).
export function computeScale(viewBox: ViewBox, clientWidth: number, clientHeight: number): { x: number; y: number } {
  return {
    x: clientWidth > 0 ? viewBox.width / clientWidth : 1,
    y: clientHeight > 0 ? viewBox.height / clientHeight : 1,
  };
}

// Classes Tailwind alignées sur la palette déjà utilisée pour le statut des
// box ailleurs dans l'app (voir components/units/units-view.tsx, status-badge.tsx).
export const STATUS_STYLES: Record<UnitStatus, { fill: string; stroke: string; text: string }> = {
  libre: { fill: "fill-success/15", stroke: "stroke-success", text: "fill-success" },
  loue: { fill: "fill-primary/15", stroke: "stroke-primary", text: "fill-primary" },
  reserve: { fill: "fill-warning/15", stroke: "stroke-warning", text: "fill-warning" },
  hors_service: { fill: "fill-muted", stroke: "stroke-border", text: "fill-muted-foreground" },
};

export const FLOOR_LABELS: Record<UnitFloor, string> = {
  sous_sol: "Sous-sol",
  rez_de_chaussee: "Rez-de-chaussée",
  premier_etage: "1er étage",
};

export const FLOOR_ORDER: UnitFloor[] = ["sous_sol", "rez_de_chaussee", "premier_etage"];

// Les 6 espaces identifiés par le vendeur — remplace le choix d'étage
// (technique, sans signification pour le staff) par le bâtiment réel. Le
// floor sous-jacent (utilisé par le plan interactif) est dérivé
// automatiquement de ce choix plutôt que sélectionné séparément.
export const KNOWN_ZONES: { value: string; floor: UnitFloor }[] = [
  { value: "Bâtiment 1", floor: "rez_de_chaussee" },
  { value: "Bâtiment 2", floor: "rez_de_chaussee" },
  { value: "Bâtiment 3", floor: "rez_de_chaussee" },
  { value: "Bâtiment 4", floor: "rez_de_chaussee" },
  { value: "Rez-de-jardin", floor: "sous_sol" },
  { value: "Étage", floor: "premier_etage" },
];
