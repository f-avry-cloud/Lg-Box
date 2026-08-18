import { describe, expect, it } from "vitest";

import {
  avancementReprise,
  filtreReprise,
  sansCoordonnees,
  statutReprise,
  trieReprise,
  type LocataireReprise,
} from "@/lib/suivi/reprise";

function ligne(
  nom: string,
  etat: Partial<LocataireReprise["etat"]> = {},
  extra: Partial<LocataireReprise> = {}
): LocataireReprise {
  return {
    locataire_id: `l-${nom}`,
    nom,
    societe: null,
    telephone: "+33639980000",
    email: `${nom.toLowerCase()}@example.org`,
    box: ["12"],
    etat: { contacte: false, message_laisse: false, note: null, ...etat },
    ...extra,
  };
}

describe("statutReprise", () => {
  it("part de « à contacter »", () => {
    expect(statutReprise({ contacte: false, message_laisse: false, note: null })).toBe("a_faire");
  });

  it("retient « contacté » même si un message avait été laissé avant", () => {
    // Les deux faits coexistent : on a laissé un message, puis on a eu la
    // personne. C'est l'aboutissement qui compte pour l'avancement.
    expect(statutReprise({ contacte: true, message_laisse: true, note: null })).toBe("contacte");
  });

  it("distingue un message laissé d'un appel abouti", () => {
    expect(statutReprise({ contacte: false, message_laisse: true, note: null })).toBe("message");
  });
});

describe("trieReprise", () => {
  it("place ce qui reste à faire en tête, puis l'alphabétique", () => {
    const trie = trieReprise([
      ligne("Zoé", { contacte: true }),
      ligne("Alice", { message_laisse: true }),
      ligne("Bernard"),
      ligne("Anne"),
    ]);

    expect(trie.map((l) => l.nom)).toEqual(["Anne", "Bernard", "Alice", "Zoé"]);
  });

  it("range les accents avec leur lettre", () => {
    const trie = trieReprise([ligne("Étienne"), ligne("Eva"), ligne("Fabien")]);
    expect(trie.map((l) => l.nom)).toEqual(["Étienne", "Eva", "Fabien"]);
  });
});

describe("filtreReprise", () => {
  const lignes = [
    ligne("Alice", { contacte: true }),
    ligne("Bernard", { message_laisse: true }),
    ligne("Chloé"),
  ];

  it("garde les non aboutis, message laissé compris", () => {
    // Un message laissé n'est pas un contact : la ligne reste à traiter.
    expect(filtreReprise(lignes, "a_faire", "").map((l) => l.nom)).toEqual(["Bernard", "Chloé"]);
  });

  it("montre tout le monde sur « tous »", () => {
    expect(filtreReprise(lignes, "tous", "")).toHaveLength(3);
  });

  it("cherche sur le nom, le numéro de box et le téléphone", () => {
    const avecBox = [ligne("Alice", {}, { box: ["4A"] }), ligne("Bernard", {}, { box: ["7"] })];
    expect(filtreReprise(avecBox, "tous", "4a").map((l) => l.nom)).toEqual(["Alice"]);
    expect(filtreReprise(avecBox, "tous", "6399").map((l) => l.nom)).toEqual(["Alice", "Bernard"]);
  });

  it("ignore la casse et les espaces autour du terme", () => {
    expect(filtreReprise(lignes, "tous", "  CHLOÉ ").map((l) => l.nom)).toEqual(["Chloé"]);
  });
});

describe("avancementReprise", () => {
  it("compte les aboutis, les messages et ce qui reste", () => {
    const avancement = avancementReprise([
      ligne("A", { contacte: true }),
      ligne("B", { message_laisse: true }),
      ligne("C"),
      ligne("D"),
    ]);

    expect(avancement).toEqual({
      total: 4,
      contactes: 1,
      messages: 1,
      // Un message laissé reste à finir : il compte dans les restants.
      restants: 3,
      pourcentage: 25,
    });
  });

  it("ne divise pas par zéro sur une liste vide", () => {
    expect(avancementReprise([]).pourcentage).toBe(0);
  });
});

describe("sansCoordonnees", () => {
  it("signale un locataire qu'on ne peut ni appeler ni écrire", () => {
    expect(sansCoordonnees(ligne("A", {}, { telephone: null, email: null }))).toBe(true);
  });

  it("suffit d'un e-mail pour pouvoir le joindre", () => {
    expect(sansCoordonnees(ligne("A", {}, { telephone: null }))).toBe(false);
  });
});
