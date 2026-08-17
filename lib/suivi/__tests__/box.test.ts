import { describe, expect, it } from "vitest";

import { groupeParBatiment, parseBoxReferenceCsv } from "@/lib/suivi/box";
import { BOX_REFERENCE_CSV } from "@/lib/suivi/box-reference";
import { BATIMENT_A_LOCALISER, BATIMENT_NON_PRECISE, type BoxListe } from "@/lib/suivi/types";

function box(
  numero: string,
  batiment: string | null,
  surface: number | null = null,
  extra: Partial<BoxListe> = {}
): BoxListe {
  return {
    id: `${batiment ?? "-"}|${numero}`,
    numero,
    batiment,
    surface_m2: surface,
    statut: "libre",
    prix_mensuel_standard: 0,
    locataire: null,
    contrat_id: null,
    detail: null,
    ...extra,
  };
}

describe("groupeParBatiment", () => {
  it("regroupe les box par bâtiment", () => {
    const groupes = groupeParBatiment([
      box("1", "Bâtiment 1"),
      box("2", "Bâtiment 1"),
      box("1", "Étage"),
    ]);

    expect(groupes.map((g) => g.batiment)).toEqual(["Bâtiment 1", "Étage"]);
    expect(groupes[0].box).toHaveLength(2);
  });

  it("trie les numéros dans l'ordre naturel, pas lexicographique", () => {
    const groupes = groupeParBatiment([
      box("10", "Bâtiment 1"),
      box("2", "Bâtiment 1"),
      box("2C", "Bâtiment 1"),
      box("2A", "Bâtiment 1"),
      box("1", "Bâtiment 1"),
    ]);

    expect(groupes[0].box.map((b) => b.numero)).toEqual(["1", "2", "2A", "2C", "10"]);
  });

  it("range « À localiser » après les vrais bâtiments", () => {
    // Le cas réel du site : la file d'attente pèse plus lourd que n'importe
    // quel bâtiment, et son « À » la placerait en tête d'un tri alphabétique.
    const groupes = groupeParBatiment([
      box("1", BATIMENT_A_LOCALISER),
      box("2", BATIMENT_A_LOCALISER),
      box("1", "Étage"),
      box("1", "Bâtiment 1"),
    ]);

    expect(groupes.map((g) => g.batiment)).toEqual([
      "Bâtiment 1",
      "Étage",
      BATIMENT_A_LOCALISER,
    ]);
  });

  it("range aussi les box sans bâtiment en fin de liste", () => {
    const groupes = groupeParBatiment([
      box("1", null),
      box("2", "   "),
      box("1", "Bâtiment 2"),
    ]);

    expect(groupes.map((g) => g.batiment)).toEqual(["Bâtiment 2", BATIMENT_NON_PRECISE]);
    expect(groupes[1].box).toHaveLength(2);
  });

  it("classe les bâtiments numérotés dans l'ordre naturel", () => {
    const groupes = groupeParBatiment([
      box("1", "Bâtiment 10"),
      box("1", "Bâtiment 2"),
      box("1", "Bâtiment 1"),
    ]);

    expect(groupes.map((g) => g.batiment)).toEqual([
      "Bâtiment 1",
      "Bâtiment 2",
      "Bâtiment 10",
    ]);
  });

  it("ne totalise que les surfaces connues", () => {
    const groupes = groupeParBatiment([
      box("1", "Bâtiment 1", 12),
      box("2", "Bâtiment 1", null),
      box("3", "Bâtiment 1", 8.5),
    ]);

    expect(groupes[0].surface_totale).toBe(20.5);
  });

  it("rend une liste vide sans box", () => {
    expect(groupeParBatiment([])).toEqual([]);
  });
});

describe("parseBoxReferenceCsv", () => {
  it("lit le référentiel fourni par l'exploitant", () => {
    const ref = parseBoxReferenceCsv(BOX_REFERENCE_CSV);
    expect(ref).toHaveLength(67);
    expect(ref.filter((b) => b.surface_m2 !== null)).toHaveLength(41);
  });

  it("traite une surface vide comme inconnue, jamais comme zéro", () => {
    const ref = parseBoxReferenceCsv("batiment,numero,surface_m2\nBât I,1,\nBât I,2,12");
    expect(ref[0].surface_m2).toBeNull();
    expect(ref[1].surface_m2).toBe(12);
  });

  it("reproduit les effectifs par bâtiment du site", () => {
    const parBatiment = new Map<string, number>();
    for (const b of parseBoxReferenceCsv(BOX_REFERENCE_CSV)) {
      parBatiment.set(b.batiment, (parBatiment.get(b.batiment) ?? 0) + 1);
    }
    expect(Object.fromEntries(parBatiment)).toEqual({
      "Bât I": 15,
      "Bât II": 9,
      "Bât III": 9,
      "Bât IV": 9,
      RDJ: 6,
      Étage: 19,
    });
  });

  it("totalise 467 m² de surface connue", () => {
    const total = parseBoxReferenceCsv(BOX_REFERENCE_CSV).reduce(
      (s, b) => s + (b.surface_m2 ?? 0),
      0
    );
    expect(total).toBe(467);
  });
});
