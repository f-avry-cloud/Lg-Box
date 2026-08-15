// Lecture du fichier locataires_seed.csv et transformation en locataires /
// box / contrats. Partagé par le script d'import (scripts/import-suivi.ts) et
// par le mode démo, pour qu'un même fichier produise exactement le même jeu de
// données des deux côtés.

import Papa from "papaparse";

import { BOX_A_IDENTIFIER, LOCATAIRE_A_IDENTIFIER } from "@/lib/suivi/types";

export type SeedRow = {
  nom: string;
  societe: string;
  box_numero: string;
  batiment: string;
  surface_m2: string;
  loyer_mensuel_eur: string;
  date_entree: string;
  telephone: string;
  email: string;
  remarque: string;
};

export type SeedLocataire = {
  /** Clé stable dérivée du CSV : rend l'import idempotent sans colonne id. */
  cle: string;
  nom: string;
  societe: string | null;
  telephone: string | null;
  email: string | null;
  date_entree: string | null;
};

export type SeedBox = {
  cle: string;
  numero: string;
  batiment: string;
  surface_m2: number | null;
};

export type SeedContrat = {
  cle: string;
  locataire_cle: string;
  box_cle: string | null;
  loyer_mensuel_eur: number;
  date_debut: string | null;
  remarque: string | null;
};

export type SeedData = {
  locataires: SeedLocataire[];
  box: SeedBox[];
  contrats: SeedContrat[];
  /** Somme des loyers mensuels, pour la vérification post-import. */
  totalLoyers: number;
};

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

function nullable(value: string | undefined): string | null {
  const v = clean(value);
  return v === "" ? null : v;
}

/**
 * Deux lignes du CSV appartiennent au même locataire si le nom et les
 * coordonnées coïncident — c'est le cas du locataire à deux box, qui doit
 * produire deux contrats mais une seule fiche.
 *
 * Le CSV contient une ligne sans nom ni coordonnées (un loyer encaissé dont
 * l'export ne dit pas de qui il vient). Elle reste un contrat à part entière —
 * il faut bien pointer ce règlement — mais elle est identifiée par son numéro
 * de ligne pour ne pas fusionner avec une autre ligne anonyme éventuelle.
 */
function cleLocataire(row: SeedRow, index: number): string {
  const nom = clean(row.nom);
  if (!nom) return `anonyme-ligne-${index}`;
  return [nom, clean(row.telephone), clean(row.email)].join("|").toLocaleLowerCase("fr");
}

function cleBox(row: SeedRow): string | null {
  const numero = clean(row.box_numero);
  if (!numero) return null;
  return `${clean(row.batiment)}|${numero}`.toLocaleLowerCase("fr");
}

export function parseSeedCsv(contenu: string): SeedData {
  const { data, errors } = Papa.parse<SeedRow>(contenu.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().replace(/^﻿/, ""),
  });

  if (errors.length > 0) {
    throw new Error(`CSV illisible ligne ${errors[0].row}: ${errors[0].message}`);
  }

  const locataires = new Map<string, SeedLocataire>();
  const box = new Map<string, SeedBox>();
  const contrats: SeedContrat[] = [];

  data.forEach((row, index) => {
    // Une ligne entièrement vide (fin de fichier) n'est pas un contrat ; une
    // ligne sans nom mais avec un loyer, si.
    if (Object.values(row).every((v) => clean(v) === "")) return;

    const locCle = cleLocataire(row, index);
    if (!locataires.has(locCle)) {
      locataires.set(locCle, {
        cle: locCle,
        nom: clean(row.nom) || LOCATAIRE_A_IDENTIFIER,
        societe: nullable(row.societe),
        telephone: nullable(row.telephone),
        email: nullable(row.email),
        date_entree: nullable(row.date_entree),
      });
    }

    const boxCle = cleBox(row);
    if (boxCle && !box.has(boxCle)) {
      const surface = clean(row.surface_m2);
      box.set(boxCle, {
        cle: boxCle,
        numero: clean(row.box_numero),
        batiment: clean(row.batiment) || "Non précisé",
        surface_m2: surface ? Number(surface) : null,
      });
    }

    contrats.push({
      // Le numéro de ligne entre dans la clé : deux contrats d'un même
      // locataire sans box identifié seraient sinon indistinguables.
      cle: `${locCle}#${boxCle ?? `ligne-${index}`}`,
      locataire_cle: locCle,
      box_cle: boxCle,
      loyer_mensuel_eur: Number(clean(row.loyer_mensuel_eur) || 0),
      date_debut: nullable(row.date_entree),
      remarque: nullable(row.remarque),
    });
  });

  return {
    locataires: [...locataires.values()],
    box: [...box.values()],
    contrats,
    totalLoyers: contrats.reduce((sum, c) => sum + c.loyer_mensuel_eur, 0),
  };
}

/** Ce qu'on affiche à la place du numéro tant que le box n'est pas établi. */
export function libelleBox(numero: string | null, batiment: string | null): string {
  if (!numero) return BOX_A_IDENTIFIER;
  return batiment ? `Box ${numero} · ${batiment}` : `Box ${numero}`;
}
