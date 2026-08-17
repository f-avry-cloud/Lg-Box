"use client";

import { useMemo, useRef, useState } from "react";
import { Maximize2, MapPin } from "lucide-react";

import { FloorPlanBackground } from "@/components/units/floor-plan-background";
import { vibre } from "@/components/suivi/bouton-encaissement";
import {
  borneTranslation,
  borneZoom,
  calculeCadre,
  estPlace,
  etiquette,
  niveauDominant,
  statsBatiment,
  taillePolice,
  ZOOM_MIN,
  type BoxPlan,
} from "@/lib/suivi/plan";
import { cn } from "@/lib/utils";

export type GroupePlanVue = { batiment: string; boxes: BoxPlan[] };

/**
 * Plan interactif conçu pour un écran de téléphone.
 *
 * Le choix structurant est de **naviguer par bâtiment, pas par niveau**. Le
 * rez-de-chaussée du site fait près de 60 m de large pour 12 m de profondeur :
 * cadré en entier sur un téléphone, chaque box tombe sous la vingtaine de
 * pixels et le plan devient un ruban illisible. Bâtiment par bâtiment, les
 * proportions redeviennent proches du carré (1:1 à 1,5:1) et remplissent
 * l'écran — le plan est lisible sans zoomer, et le zoom sert au détail.
 */
export function PlanInteractif({
  groupes,
  onOuvrirBox,
}: {
  groupes: GroupePlanVue[];
  onOuvrirBox: (boxId: string) => void;
}) {
  const [batimentActif, setBatimentActif] = useState(groupes[0]?.batiment ?? "");
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const [translation, setTranslation] = useState({ x: 0, y: 0 });
  const [boxTouche, setBoxTouche] = useState<string | null>(null);
  // État plutôt que ref : la transition CSS dépend de « un geste est en
  // cours », donc du rendu. Une ref lue au rendu ne le déclencherait pas.
  const [enGeste, setEnGeste] = useState(false);

  const conteneur = useRef<HTMLDivElement>(null);
  // Repères du geste en cours : distance entre deux doigts pour le pincement,
  // point de départ pour le glissement.
  const geste = useRef<{
    distance: number;
    zoomDepart: number;
    x: number;
    y: number;
    translationDepart: { x: number; y: number };
    deplace: boolean;
  } | null>(null);

  const groupe = groupes.find((g) => g.batiment === batimentActif) ?? groupes[0];
  const boxes = useMemo(() => groupe?.boxes ?? [], [groupe]);
  const places = useMemo(() => boxes.filter(estPlace), [boxes]);
  const nonPlaces = useMemo(() => boxes.filter((b) => !estPlace(b)), [boxes]);
  const cadre = useMemo(() => calculeCadre(boxes), [boxes]);
  // Les murs relevés du bâtiment, partagés avec le plan du back-office.
  const niveau = useMemo(() => niveauDominant(boxes), [boxes]);
  const stats = useMemo(() => statsBatiment(boxes), [boxes]);

  const reinitialise = () => {
    setZoom(ZOOM_MIN);
    setTranslation({ x: 0, y: 0 });
  };

  const changeBatiment = (batiment: string) => {
    setBatimentActif(batiment);
    // Le cadrage d'un bâtiment n'a aucun sens pour le suivant : on repart
    // toujours de la vue d'ensemble.
    reinitialise();
    vibre(8);
  };

  const distanceEntre = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const surDebut = (e: React.TouchEvent) => {
    setEnGeste(true);
    if (e.touches.length === 2) {
      geste.current = {
        distance: distanceEntre(e.touches),
        zoomDepart: zoom,
        x: 0,
        y: 0,
        translationDepart: translation,
        deplace: true,
      };
    } else if (e.touches.length === 1) {
      geste.current = {
        distance: 0,
        zoomDepart: zoom,
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        translationDepart: translation,
        deplace: false,
      };
    }
  };

  const surMouvement = (e: React.TouchEvent) => {
    const g = geste.current;
    const boite = conteneur.current?.getBoundingClientRect();
    if (!g || !boite) return;

    if (e.touches.length === 2 && g.distance > 0) {
      const suivant = borneZoom((g.zoomDepart * distanceEntre(e.touches)) / g.distance);
      setZoom(suivant);
      setTranslation((t) => ({
        x: borneTranslation(t.x, suivant, boite.width),
        y: borneTranslation(t.y, suivant, boite.height),
      }));
      return;
    }

    if (e.touches.length === 1 && zoom > ZOOM_MIN) {
      const dx = e.touches[0].clientX - g.x;
      const dy = e.touches[0].clientY - g.y;
      // Au-delà de quelques pixels, le geste est un déplacement : on annule
      // l'ouverture du box qui aurait suivi un simple tap.
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) g.deplace = true;
      setTranslation({
        x: borneTranslation(g.translationDepart.x + dx, zoom, boite.width),
        y: borneTranslation(g.translationDepart.y + dy, zoom, boite.height),
      });
    }
  };

  const surFin = () => {
    geste.current = null;
    setEnGeste(false);
  };

  const ouvre = (box: BoxPlan) => {
    // Un glissement ne doit pas ouvrir la fiche du box qu'on a effleuré.
    if (geste.current?.deplace) return;
    vibre();
    onOuvrirBox(box.id);
  };

  if (!groupe) {
    return (
      <p className="px-4 py-12 text-center t-corps text-[var(--suivi-gris)]">
        Aucun box à afficher.
      </p>
    );
  }

  return (
    <div className="suivi-scroll-simple">
      {/* Sélecteur de bâtiment : la navigation principale du plan. */}
      <div className="flex gap-2 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groupes.map((g) => {
          const actif = g.batiment === groupe.batiment;
          const s = statsBatiment(g.boxes);
          return (
            <button
              key={g.batiment}
              type="button"
              onClick={() => changeBatiment(g.batiment)}
              aria-pressed={actif}
              className={cn(
                "suivi-tap flex min-h-12 shrink-0 flex-col items-start justify-center rounded-xl border px-3 py-1",
                actif
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground active:bg-secondary"
              )}
            >
              <span className="text-sm font-bold leading-tight">{g.batiment}</span>
              <span
                className={cn(
                  "text-xs leading-tight tabular-nums",
                  actif ? "text-primary-foreground/80" : "text-[var(--suivi-gris)]"
                )}
              >
                {s.occupes}/{s.total} occupés
              </span>
            </button>
          );
        })}
      </div>

      {/* Le plan. */}
      <div
        ref={conteneur}
        onTouchStart={surDebut}
        onTouchMove={surMouvement}
        onTouchEnd={surFin}
        onTouchCancel={surFin}
        className="suivi-tap relative mx-3 overflow-hidden suivi-carte"
        // Hauteur bornée pour que la légende et le compte restent visibles
        // sous le plan, au-dessus de la barre d'onglets — sur un iPhone 13,
        // 58 dvh les repoussaient hors écran.
        style={{ height: "min(46dvh, 24rem)", touchAction: "none" }}
      >
        {places.length === 0 ? (
          <p className="flex h-full items-center justify-center px-6 text-center t-corps text-[var(--suivi-gris)]">
            Aucun box de {groupe.batiment} n&apos;est encore placé sur le plan.
          </p>
        ) : (
          <svg
            viewBox={`${cadre.x} ${cadre.y} ${cadre.largeur} ${cadre.hauteur}`}
            className="h-full w-full"
            style={{
              transform: `translate(${translation.x}px, ${translation.y}px) scale(${zoom})`,
              transformOrigin: "center",
              transition: enGeste ? "none" : "transform 180ms ease-out",
            }}
            role="img"
            aria-label={`Plan de ${groupe.batiment} — ${stats.occupes} box occupés sur ${stats.total}`}
          >
            {/*
              Fond de plan : murs, sols et portes relevés. Le même composant
              que le back-office — le plan doit être le même dessin, pas une
              seconde interprétation qui dériverait de l'original.
            */}
            {niveau && <FloorPlanBackground floor={niveau} />}

            {places.map((box) => {
              const police = taillePolice(box.largeur, box.profondeur);
              const centreX = box.x + box.largeur / 2;
              const centreY = box.y + box.profondeur / 2;
              const actif = boxTouche === box.id;

              return (
                <g
                  key={box.id}
                  transform={
                    box.rotation ? `rotate(${box.rotation} ${centreX} ${centreY})` : undefined
                  }
                  onPointerDown={() => setBoxTouche(box.id)}
                  onPointerUp={() => setBoxTouche(null)}
                  onPointerLeave={() => setBoxTouche(null)}
                  onClick={() => ouvre(box)}
                  style={{ cursor: "pointer" }}
                >
                  <rect
                    x={box.x}
                    y={box.y}
                    width={box.largeur}
                    height={box.profondeur}
                    rx={18}
                    fill={box.occupe ? "var(--suivi-vert)" : "var(--card)"}
                    fillOpacity={box.occupe ? (actif ? 1 : 0.9) : 1}
                    stroke={box.occupe ? "var(--suivi-vert)" : "var(--suivi-gris)"}
                    strokeWidth={actif ? 14 : 6}
                    strokeOpacity={box.occupe ? 1 : 0.55}
                  />
                  <text
                    x={centreX}
                    y={centreY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={police}
                    fontWeight={700}
                    fill={box.occupe ? "#ffffff" : "var(--foreground)"}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {etiquette(box.numero, box.largeur)}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {/* Retour au cadrage d'ensemble, visible seulement s'il sert. */}
        {zoom > ZOOM_MIN && (
          <button
            type="button"
            onClick={reinitialise}
            aria-label="Recadrer le plan"
            className="suivi-tap absolute right-3 top-3 flex size-11 items-center justify-center rounded-full border border-border bg-card/95 shadow-md backdrop-blur"
          >
            <Maximize2 className="size-5" />
          </button>
        )}
      </div>

      {/* Légende et chiffres du bâtiment affiché. */}
      <div className="mx-3 mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 suivi-carte px-3 py-2 text-sm">
        <span className="flex items-center gap-1.5">
          <span
            className="size-3 rounded"
            style={{ backgroundColor: "var(--suivi-vert)" }}
            aria-hidden
          />
          {stats.occupes} occupés
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-3 rounded border-2"
            style={{ borderColor: "var(--suivi-gris)" }}
            aria-hidden
          />
          {stats.libres} libres
        </span>
        <span className="ml-auto font-semibold tabular-nums">
          {stats.surfaceConnue > 0 && `${Number(stats.surfaceConnue.toFixed(2))} m²`}
        </span>
      </div>

      <p className="px-4 pt-2 text-center t-meta">
        Pincez pour zoomer, glissez pour déplacer, tapez un box pour l&apos;ouvrir.
      </p>

      {/*
        Les box sans géométrie ne sont pas escamotés : ils existent, ils sont
        parfois loués, et les cacher donnerait un plan faussement complet.
      */}
      {nonPlaces.length > 0 && (
        <section className="mx-3 mb-4 mt-3 rounded-2xl border border-dashed border-[var(--suivi-orange)]/50 bg-[var(--suivi-orange)]/5 p-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-[var(--suivi-orange)]">
            <MapPin className="size-4" aria-hidden />
            {`${nonPlaces.length} box non placé${nonPlaces.length > 1 ? "s" : ""} sur le plan`}
          </h3>
          <div className="flex flex-wrap gap-2">
            {nonPlaces.map((box) => (
              <button
                key={box.id}
                type="button"
                onClick={() => onOuvrirBox(box.id)}
                className={cn(
                  "suivi-tap flex min-h-12 min-w-16 flex-col items-center justify-center rounded-xl border px-2",
                  box.occupe
                    ? "border-[var(--suivi-vert)] bg-[var(--suivi-vert)] text-white"
                    : "border-border bg-card"
                )}
              >
                <span className="text-sm font-bold">{box.numero}</span>
                <span className="text-xs opacity-80">{box.occupe ? "occupé" : "libre"}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
