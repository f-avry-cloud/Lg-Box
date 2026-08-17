"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { BlocLocataireBox } from "@/components/suivi/bloc-locataire-box";
import { FeuilleModale } from "@/components/suivi/feuille-modale";
import { vibre } from "@/components/suivi/bouton-encaissement";
import { Button } from "@/components/ui/button";
import { creeBox, modifieBox, supprimeBox } from "@/lib/actions/suivi-box";
import { BlocAffectation } from "@/components/suivi/bloc-affectation";
import { detacheBoxDuContrat } from "@/lib/actions/suivi";
import type { BoxListe, CandidatAffectation } from "@/lib/suivi/types";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Création et édition d'un box du référentiel mobile (`sr_box`).
 *
 * Ces mutations ne touchent **que** les données de l'application : corriger un
 * numéro ou une surface depuis le téléphone ne modifie rien dans /admin. Le
 * report vers le back-office, s'il a lieu un jour, sera une décision séparée
 * et explicite.
 */
export function FeuilleBox({
  box,
  creation,
  batiments,
  candidats,
  onFermer,
}: {
  /** Box à modifier, ou null en création. */
  box: BoxListe | null;
  creation: boolean;
  batiments: string[];
  candidats: CandidatAffectation[];
  onFermer: () => void;
}) {
  const router = useRouter();
  const [numero, setNumero] = useState("");
  const [surface, setSurface] = useState("");
  const [tarif, setTarif] = useState("");
  const [batiment, setBatiment] = useState("");
  const [nouveauBatiment, setNouveauBatiment] = useState(false);
  const [initialisePour, setInitialisePour] = useState<string | null>(null);
  const [confirmeSuppression, setConfirmeSuppression] = useState(false);
  // Les champs du box sont repliés par défaut sur un box occupé : le parcours
  // courant est de consulter le locataire, pas de corriger une surface.
  const [champsOuverts, setChampsOuverts] = useState(false);
  const [enCours, demarreTransition] = useTransition();

  const cle = creation ? "creation" : box?.id ?? null;

  if (cle && initialisePour !== cle) {
    setInitialisePour(cle);
    setNumero(box && !creation ? box.numero : "");
    setSurface(box && !creation && box.surface_m2 != null ? String(box.surface_m2) : "");
    setTarif(box && !creation && box.tarif_indicatif_eur != null ? String(box.tarif_indicatif_eur) : "");
    setBatiment(box?.batiment ?? batiments[0] ?? "");
    setNouveauBatiment(false);
    setConfirmeSuppression(false);
    setChampsOuverts(creation || !box?.detail);
  }

  if (!creation && !box) return null;

  const surfaceValeur = Number(surface.replace(",", "."));
  const surfaceValide = surface === "" || (Number.isFinite(surfaceValeur) && surfaceValeur > 0);
  const tarifValeur = Number(tarif.replace(",", "."));
  const tarifValide = tarif === "" || (Number.isFinite(tarifValeur) && tarifValeur > 0);
  const numeroValide = numero.trim() !== "";
  const batimentValide = batiment.trim() !== "";
  const valide = numeroValide && batimentValide && surfaceValide && tarifValide;

  const enregistre = () => {
    if (!valide) return;

    demarreTransition(async () => {
      const saisie = {
        numero: numero.trim(),
        batiment: batiment.trim(),
        // Une case vide veut dire « je ne connais pas la surface » — un état
        // légitime pour 26 des 67 box du site, pas une erreur de saisie.
        surface_m2: surface === "" ? null : surfaceValeur,
        // Vide = pas de tarif de référence. Le loyer facturé reste celui du
        // contrat : ce champ ne fait que le proposer.
        tarif_indicatif_eur: tarif === "" ? null : Math.round(tarifValeur),
      };

      const resultat = creation ? await creeBox(saisie) : await modifieBox(box!.id, saisie);

      if (!resultat.success) {
        vibre(60);
        toast.error(resultat.error ?? "Enregistrement impossible.");
        return;
      }

      vibre();
      toast.success(creation ? `Box ${saisie.numero} créé.` : `Box ${saisie.numero} enregistré.`);
      onFermer();
      router.refresh();
    });
  };

  const supprime = () => {
    if (!box) return;
    demarreTransition(async () => {
      const resultat = await supprimeBox(box.id);
      if (!resultat.success) {
        vibre(60);
        toast.error(resultat.error ?? "Suppression impossible.");
        return;
      }
      vibre();
      toast.success(`Box ${box.numero} supprimé.`);
      onFermer();
      router.refresh();
    });
  };

  return (
    <FeuilleModale
      ouverte
      titre={creation ? "Nouveau box" : `Box ${box!.numero}`}
      onFermer={onFermer}
    >
      {!creation && box?.detail && <BlocLocataireBox box={box} />}

      {/* Champs du box, repliables : présents mais pas au premier plan. */}
      {!creation && box?.detail && (
        <button
          type="button"
          onClick={() => setChampsOuverts((o) => !o)}
          aria-expanded={champsOuverts}
          className="suivi-tap mb-3 flex min-h-12 w-full items-center justify-between rounded-xl border border-border px-3 text-sm font-semibold active:bg-secondary"
        >
          Modifier le box
          <ChevronDown
            className={cn("size-5 transition-transform", champsOuverts && "rotate-180")}
            aria-hidden
          />
        </button>
      )}

      <div className={cn(!champsOuverts && "hidden")}>
      <label className="mb-1 block text-sm font-medium" htmlFor="box-numero">
        Numéro
      </label>
      <input
        id="box-numero"
        type="text"
        value={numero}
        onChange={(e) => setNumero(e.target.value)}
        placeholder="2A, 10bis…"
        className="mb-1 h-14 w-full rounded-xl border border-input bg-background px-4 text-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {!numeroValide && numero !== "" && (
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
        placeholder="Laisser vide si inconnue"
        className="mb-1 h-14 w-full rounded-xl border border-input bg-background px-4 text-lg tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {!surfaceValide && (
        <p className="mb-2 text-sm font-medium text-destructive">
          La surface doit être un nombre positif.
        </p>
      )}

      <label className="mb-1 mt-3 block text-sm font-medium" htmlFor="box-tarif">
        Tarif indicatif (€ / mois)
      </label>
      <input
        id="box-tarif"
        type="number"
        inputMode="numeric"
        min={0}
        step="1"
        value={tarif}
        onChange={(e) => setTarif(e.target.value)}
        placeholder="Facultatif"
        className="mb-1 h-14 w-full rounded-xl border border-input bg-background px-4 text-lg tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {!tarifValide ? (
        <p className="mb-2 text-sm font-medium text-destructive">
          Le tarif doit être un nombre positif.
        </p>
      ) : (
        <p className="mb-2 text-sm text-[var(--suivi-gris)]">
          Sert à proposer un loyer à l&apos;affectation. Le loyer facturé reste celui du contrat
          {box?.detail ? ` — aujourd'hui ${box.detail.loyer_mensuel_eur} €.` : "."}
        </p>
      )}

      <span className="mb-1 mt-3 block text-sm font-medium">Bâtiment</span>
      {nouveauBatiment ? (
        <input
          type="text"
          value={batiment}
          onChange={(e) => setBatiment(e.target.value)}
          placeholder="Nom du bâtiment"
          aria-label="Nouveau bâtiment"
          className="mb-4 h-14 w-full rounded-xl border border-input bg-background px-4 text-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      ) : (
        <div className="mb-4 grid grid-cols-3 gap-2">
          {batiments.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBatiment(b)}
              className={cn(
                "suivi-tap min-h-14 rounded-xl border px-1 text-sm font-medium",
                batiment === b
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background active:bg-secondary"
              )}
            >
              {b}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setNouveauBatiment(true);
              setBatiment("");
            }}
            className="suivi-tap min-h-14 rounded-xl border border-dashed border-border bg-background px-1 text-sm font-medium active:bg-secondary"
          >
            Autre…
          </button>
        </div>
      )}

      </div>

      {/*
        Affectation dans le sens box → locataire : c'est ainsi que l'exploitant
        raisonne quand il identifie un box sur le terrain. Le sens inverse
        existe aussi, depuis la fiche du locataire.

        Le bloc gère les deux cas — locataire en attente de box, ou déjà logé
        et qui en prend un second. Voir `bloc-affectation.tsx`.
      */}
      {!creation && box && !box.detail && (
        <BlocAffectation box={box} candidats={candidats} onFermer={onFermer} />
      )}

      {!creation && box?.locataire && !box.detail && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-border bg-secondary/40 p-3">
          <span className="min-w-0 flex-1 truncate text-base font-bold">{box.locataire}</span>
          <button
            type="button"
            disabled={enCours}
            onClick={() => {
              demarreTransition(async () => {
                const resultat = await detacheBoxDuContrat(box.contrat_id!);
                if (!resultat.success) {
                  vibre(60);
                  toast.error(resultat.error ?? "Détachement impossible.");
                  return;
                }
                vibre();
                toast.success("Locataire détaché.");
                onFermer();
                router.refresh();
              });
            }}
            className="suivi-tap min-h-11 shrink-0 rounded-lg px-3 text-sm font-semibold text-destructive active:bg-secondary"
          >
            Détacher
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="h-14 flex-1 text-base" onClick={onFermer}>
          Annuler
        </Button>
        <Button
          type="button"
          className="h-14 flex-1 text-base"
          disabled={enCours || !valide}
          onClick={enregistre}
        >
          {enCours ? "Enregistrement…" : creation ? "Créer" : "Enregistrer"}
        </Button>
      </div>

      {!creation && (
        <div className="mt-3 border-t border-border pt-3">
          {confirmeSuppression ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1"
                onClick={() => setConfirmeSuppression(false)}
              >
                Non, garder
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-12 flex-1"
                disabled={enCours}
                onClick={supprime}
              >
                Supprimer
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmeSuppression(true)}
              className="suivi-tap min-h-11 w-full text-sm font-medium text-destructive"
            >
              Supprimer ce box
            </button>
          )}
        </div>
      )}

      <p className="mt-3 text-center text-sm text-[var(--suivi-gris)]">
        Ces données appartiennent à l&apos;application. Le back-office n&apos;est pas modifié.
      </p>
    </FeuilleModale>
  );
}
