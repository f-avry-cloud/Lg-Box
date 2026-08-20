import { describe, expect, it } from "vitest";

import {
  chargeDuePour,
  chargesCumulees,
  chargesDuMois,
  estTerminee,
  parCategorie,
  cashFlow,
  totalCharges,
  trieCharges,
  type Charge,
} from "@/lib/suivi/charges";

function charge(libelle: string, montant: number, extra: Partial<Charge> = {}): Charge {
  return {
    id: `c-${libelle}`,
    libelle,
    montant_eur: montant,
    categorie: "autre",
    recurrente: true,
    periode_debut: "2026-01",
    periode_fin: null,
    note: null,
    ...extra,
  };
}

describe("chargeDuePour", () => {
  it("réclame une récurrente sans échéance à partir de son début", () => {
    const assurance = charge("Assurance", 120, { periode_debut: "2026-03" });
    expect(chargeDuePour("2026-02", assurance)).toBe(false);
    expect(chargeDuePour("2026-03", assurance)).toBe(true);
    expect(chargeDuePour("2030-11", assurance)).toBe(true);
  });

  it("arrête une récurrente après sa dernière période", () => {
    const abo = charge("Abonnement", 30, { periode_debut: "2026-01", periode_fin: "2026-06" });
    expect(chargeDuePour("2026-06", abo)).toBe(true);
    expect(chargeDuePour("2026-07", abo)).toBe(false);
  });

  it("ne fait peser une ponctuelle que sur son seul mois", () => {
    const travaux = charge("Réfection toiture", 4200, {
      recurrente: false,
      periode_debut: "2026-05",
      periode_fin: "2026-05",
    });
    expect(chargeDuePour("2026-04", travaux)).toBe(false);
    expect(chargeDuePour("2026-05", travaux)).toBe(true);
    expect(chargeDuePour("2026-06", travaux)).toBe(false);
  });

  it("traite une ponctuelle sans fin renseignée comme un mois unique", () => {
    // La contrainte de base l'autorise (periode_fin null) : le calcul ne doit
    // pas pour autant l'étaler sur tous les mois suivants.
    const ponctuelle = charge("Achat", 300, { recurrente: false, periode_debut: "2026-05" });
    expect(chargeDuePour("2026-05", ponctuelle)).toBe(true);
    expect(chargeDuePour("2026-06", ponctuelle)).toBe(false);
  });
});

describe("chargesDuMois / totalCharges", () => {
  it("additionne ce qui pèse sur le mois, et rien d'autre", () => {
    const liste = [
      charge("Loyer", 1500),
      charge("Assurance", 120, { periode_debut: "2026-09" }),
      charge("Travaux", 800, { recurrente: false, periode_debut: "2026-08", periode_fin: "2026-08" }),
    ];

    expect(totalCharges(chargesDuMois(liste, "2026-08"))).toBe(2300);
    // En septembre : le loyer et l'assurance qui démarre, plus de travaux.
    expect(totalCharges(chargesDuMois(liste, "2026-09"))).toBe(1620);
  });

  it("rend zéro sur un mois sans charge", () => {
    expect(totalCharges(chargesDuMois([], "2026-08"))).toBe(0);
  });
});

describe("chargesCumulees", () => {
  it("cumule de janvier au mois affiché, celui-ci compris", () => {
    // 1 500 € par mois sur huit mois.
    expect(chargesCumulees([charge("Loyer", 1500)], "2026-08")).toBe(12000);
  });

  it("ne compte pas les mois à venir", () => {
    // C'est le point qui fausserait tout : le cumul des recettes s'arrête au
    // mois affiché, celui des charges doit s'arrêter au même endroit.
    expect(chargesCumulees([charge("Loyer", 1500)], "2026-01")).toBe(1500);
  });

  it("ignore les mois antérieurs au début de la charge", () => {
    const assurance = charge("Assurance", 100, { periode_debut: "2026-06" });
    // Juin, juillet, août : trois mois.
    expect(chargesCumulees([assurance], "2026-08")).toBe(300);
  });

  it("compte une ponctuelle une seule fois dans le cumul", () => {
    const travaux = charge("Travaux", 4200, {
      recurrente: false,
      periode_debut: "2026-03",
      periode_fin: "2026-03",
    });
    expect(chargesCumulees([travaux], "2026-08")).toBe(4200);
  });

  it("ne compte pas une charge d'une autre année", () => {
    const ancienne = charge("Loyer 2025", 1000, {
      periode_debut: "2025-01",
      periode_fin: "2025-12",
    });
    expect(chargesCumulees([ancienne], "2026-08")).toBe(0);
  });
});

describe("cashFlow", () => {
  it("soustrait les charges des encaissements", () => {
    expect(cashFlow(8710, 2300)).toEqual({ entrees: 8710, sorties: 2300, solde: 6410 });
  });

  it("rend un solde négatif quand le mois coûte plus qu'il ne rapporte", () => {
    expect(cashFlow(1000, 4200).solde).toBe(-3200);
  });
});

describe("parCategorie", () => {
  it("regroupe et classe du plus lourd au plus léger", () => {
    const postes = parCategorie([
      charge("Loyer", 1500, { categorie: "loyer" }),
      charge("Assurance", 120, { categorie: "assurance" }),
      charge("Électricité", 300, { categorie: "energie" }),
      charge("Eau", 80, { categorie: "energie" }),
    ]);

    expect(postes.map((p) => [p.categorie, p.montant, p.nombre])).toEqual([
      ["loyer", 1500, 1],
      ["energie", 380, 2],
      ["assurance", 120, 1],
    ]);
  });
});

describe("trieCharges", () => {
  it("met les récurrentes d'abord, puis les plus lourdes", () => {
    const trie = trieCharges([
      charge("Petite ponctuelle", 50, { recurrente: false }),
      charge("Assurance", 120),
      charge("Gros travaux", 4200, { recurrente: false }),
      charge("Loyer", 1500),
    ]);

    expect(trie.map((c) => c.libelle)).toEqual([
      "Loyer",
      "Assurance",
      "Gros travaux",
      "Petite ponctuelle",
    ]);
  });
});

describe("estTerminee", () => {
  it("signale une récurrente arrêtée avant le mois affiché", () => {
    const abo = charge("Abonnement", 30, { periode_fin: "2026-06" });
    expect(estTerminee(abo, "2026-06")).toBe(false);
    expect(estTerminee(abo, "2026-07")).toBe(true);
  });

  it("ne termine jamais une récurrente sans échéance", () => {
    expect(estTerminee(charge("Loyer", 1500), "2099-12")).toBe(false);
  });

  it("termine une ponctuelle dès le mois suivant", () => {
    const travaux = charge("Travaux", 900, { recurrente: false, periode_debut: "2026-05" });
    expect(estTerminee(travaux, "2026-05")).toBe(false);
    expect(estTerminee(travaux, "2026-06")).toBe(true);
  });
});
