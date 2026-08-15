"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { FeuilleModale } from "@/components/suivi/feuille-modale";
import { vibre } from "@/components/suivi/bouton-encaissement";
import { Button } from "@/components/ui/button";
import { updateUnitNumero, updateUnitSize, updateUnitZone } from "@/lib/actions/units";
import { KNOWN_ZONES } from "@/lib/units/floor-plan";
import type { BoxListe } from "@/lib/suivi/types";
import { cn } from "@/lib/utils";

/**
 * Édition d'un box depuis le téléphone : numéro, surface, bâtiment.
 *
 * Les trois mutations sont les Server Actions du back-office
 * (`lib/actions/units.ts`), pas des copies : `updateUnitSize` en particulier
 * sait convertir une surface en largeur/profondeur pour les box posés sur le
 * plan interactif, sans quoi le trigger units_sync_taille_m2 écraserait la
 * valeur saisie. Rejouer cette logique ici la ferait diverger au premier
 * changement côté back-office.
 */
export function FeuilleBox({
  box,
  onFermer,
}: {
  box: BoxListe | null;
  onFermer: () => void;
}) {
  const router = useRouter();
  const [numero, setNumero] = useState("");
  const [surface, setSurface] = useState("");
  const [batiment, setBatiment] = useState<string | null>(null);
  const [initialisePour, setInitialisePour] = useState<string | null>(null);
  const [enCours, demarreTransition] = useTransition();

  if (box && initialisePour !== box.id) {
    setInitialisePour(box.id);
    setNumero(box.numero);
    setSurface(box.surface_m2 != null ? String(box.surface_m2) : "");
    setBatiment(box.batiment);
  }

  if (!box) return null;

  // Le back-office pose « À localiser » sur les box importés du registre dont
  // l'emplacement reste à établir : cette valeur n'est pas proposée à la
  // saisie, mais elle doit rester visible tant qu'elle n'est pas remplacée.
  const zoneHorsListe =
    box.batiment !== null && !KNOWN_ZONES.some((z) => z.value === box.batiment);

  const surfaceValeur = Number(surface.replace(",", "."));
  const surfaceValide = surface === "" || (Number.isFinite(surfaceValeur) && surfaceValeur > 0);
  const numeroValide = numero.trim() !== "";

  const enregistre = () => {
    if (!numeroValide || !surfaceValide) return;

    demarreTransition(async () => {
      // Séquentiel et non en parallèle : les trois actions écrivent la même
      // ligne, et on veut pouvoir dire précisément laquelle a échoué.
      const etapes: Array<{ libelle: string; executer: () => Promise<{ success: boolean; error?: string }> }> = [];

      if (numero.trim() !== box.numero) {
        etapes.push({ libelle: "numéro", executer: () => updateUnitNumero(box.id, numero.trim()) });
      }
      if (batiment && batiment !== box.batiment) {
        etapes.push({ libelle: "bâtiment", executer: () => updateUnitZone(box.id, batiment) });
      }
      if (surface !== "" && surfaceValeur !== box.surface_m2) {
        etapes.push({
          libelle: "surface",
          executer: () => updateUnitSize(box.id, { tailleM2: surfaceValeur }),
        });
      }

      if (etapes.length === 0) {
        onFermer();
        return;
      }

      for (const etape of etapes) {
        const resultat = await etape.executer();
        if (!resultat.success) {
          vibre(60);
          toast.error(`${etape.libelle} : ${resultat.error ?? "enregistrement impossible"}`);
          return;
        }
      }

      vibre();
      toast.success(`Box ${numero.trim()} enregistré.`);
      onFermer();
      router.refresh();
    });
  };

  return (
    <FeuilleModale ouverte titre={`Box ${box.numero}`} onFermer={onFermer}>
      <label className="mb-1 block text-sm font-medium" htmlFor="box-numero">
        Numéro
      </label>
      <input
        id="box-numero"
        type="text"
        value={numero}
        onChange={(e) => setNumero(e.target.value)}
        className="mb-1 h-14 w-full rounded-xl border border-input bg-background px-4 text-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {!numeroValide && (
        <p className="mb-2 text-sm font-medium text-destructive">Le numéro ne peut pas être vide.</p>
      )}

      <label className="mb-1 mt-3 block text-sm font-medium" htmlFor="box-surface">
        Surface (m²)
      </label>
      <input
        id="box-surface"
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        value={surface}
        onChange={(e) => setSurface(e.target.value)}
        placeholder="Non renseignée"
        className="mb-1 h-14 w-full rounded-xl border border-input bg-background px-4 text-lg tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {!surfaceValide && (
        <p className="mb-2 text-sm font-medium text-destructive">
          La surface doit être un nombre positif.
        </p>
      )}

      <span className="mb-1 mt-3 block text-sm font-medium">Bâtiment</span>
      {zoneHorsListe && (
        // 70 des 137 box sont en « À localiser » : sans ce rappel, la grille
        // n'aurait aucun bouton allumé et laisserait croire que le bâtiment
        // n'est pas renseigné, alors qu'il l'est — mal.
        <p className="mb-2 rounded-lg bg-[var(--suivi-orange)]/10 px-3 py-2 text-sm font-medium text-[var(--suivi-orange)]">
          Actuellement : {box.batiment}. Choisissez un bâtiment pour le localiser.
        </p>
      )}
      <div className="mb-4 grid grid-cols-2 gap-2">
        {KNOWN_ZONES.map((zone) => (
          <button
            key={zone.value}
            type="button"
            onClick={() => setBatiment(zone.value)}
            className={cn(
              "suivi-tap min-h-14 rounded-xl border px-2 text-sm font-medium",
              batiment === zone.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background active:bg-secondary"
            )}
          >
            {zone.value}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="h-14 flex-1 text-base" onClick={onFermer}>
          Annuler
        </Button>
        <Button
          type="button"
          className="h-14 flex-1 text-base"
          disabled={enCours || !numeroValide || !surfaceValide}
          onClick={enregistre}
        >
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>

      <p className="mt-3 text-center text-sm text-[var(--suivi-gris)]">
        Les modifications s&apos;appliquent au box du back-office.
      </p>
    </FeuilleModale>
  );
}
