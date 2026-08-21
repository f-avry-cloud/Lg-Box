import { describe, expect, it } from "vitest";

import { libelleRang, nombreEnAttente, rangDansFile, trieDemandes } from "@/lib/suivi/demandes";
import type { DemandeReservation, StatutDemande } from "@/lib/suivi/types";

function demande(
  id: string,
  statut: StatutDemande,
  created_at: string
): DemandeReservation {
  return {
    id,
    nom: id,
    email: null,
    telephone: null,
    taille_souhaitee: null,
    date_souhaitee: null,
    message: null,
    statut,
    origine: "manuelle",
    created_at,
  };
}

describe("trieDemandes", () => {
  it("place les nouvelles en tête, puis la liste d'attente, puis le reste", () => {
    const trie = trieDemandes([
      demande("refusée", "refusee", "2026-08-01T00:00:00Z"),
      demande("attente", "liste_attente", "2026-07-01T00:00:00Z"),
      demande("nouvelle", "nouvelle", "2026-06-01T00:00:00Z"),
      demande("convertie", "convertie", "2026-08-15T00:00:00Z"),
    ]);

    expect(trie.map((d) => d.id)).toEqual(["nouvelle", "attente", "convertie", "refusée"]);
  });

  it("montre la demande à traiter la plus récente en premier", () => {
    const trie = trieDemandes([
      demande("ancienne", "nouvelle", "2026-06-01T00:00:00Z"),
      demande("récente", "nouvelle", "2026-08-01T00:00:00Z"),
    ]);

    expect(trie.map((d) => d.id)).toEqual(["récente", "ancienne"]);
  });

  it("sert la liste d'attente dans l'ordre d'arrivée", () => {
    // Le point de la fonction : sur ce groupe, le tri s'inverse. Celui qui a
    // appelé en janvier passe avant celui qui a appelé en juin.
    const trie = trieDemandes([
      demande("juin", "liste_attente", "2026-06-01T00:00:00Z"),
      demande("janvier", "liste_attente", "2026-01-01T00:00:00Z"),
      demande("mars", "liste_attente", "2026-03-01T00:00:00Z"),
    ]);

    expect(trie.map((d) => d.id)).toEqual(["janvier", "mars", "juin"]);
  });
});

describe("rangDansFile", () => {
  const file = [
    demande("juin", "liste_attente", "2026-06-01T00:00:00Z"),
    demande("janvier", "liste_attente", "2026-01-01T00:00:00Z"),
    demande("nouvelle", "nouvelle", "2026-02-01T00:00:00Z"),
  ];

  it("numérote à partir de 1, dans l'ordre d'arrivée", () => {
    expect(rangDansFile(file, "janvier")).toBe(1);
    expect(rangDansFile(file, "juin")).toBe(2);
  });

  it("ne numérote pas ce qui n'est pas dans la file", () => {
    expect(rangDansFile(file, "nouvelle")).toBeNull();
    expect(rangDansFile(file, "inconnu")).toBeNull();
  });
});

describe("nombreEnAttente", () => {
  it("ne compte que la liste d'attente", () => {
    expect(
      nombreEnAttente([
        demande("a", "liste_attente", "2026-01-01T00:00:00Z"),
        demande("b", "liste_attente", "2026-02-01T00:00:00Z"),
        demande("c", "nouvelle", "2026-03-01T00:00:00Z"),
        demande("d", "refusee", "2026-04-01T00:00:00Z"),
      ])
    ).toBe(2);
  });
});

describe("libelleRang", () => {
  it("écrit « 1re » pour le premier, « e » ensuite", () => {
    expect(libelleRang(1)).toBe("1re de la file");
    expect(libelleRang(2)).toBe("2e de la file");
    expect(libelleRang(11)).toBe("11e de la file");
  });
});
