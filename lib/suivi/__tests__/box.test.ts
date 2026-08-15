import { describe, expect, it } from "vitest";

import { groupeParBatiment } from "@/lib/suivi/box";
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
