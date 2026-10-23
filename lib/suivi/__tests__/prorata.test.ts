import { describe, expect, it } from "vitest";

import { joursDuMois, libelleProrata, loyerDuPour, moisDEntree } from "@/lib/suivi/prorata";

describe("joursDuMois", () => {
  it("compte les jours du mois affiché", () => {
    expect(joursDuMois("2026-10")).toBe(31);
    expect(joursDuMois("2026-11")).toBe(30);
  });

  it("suit février, bissextile compris", () => {
    expect(joursDuMois("2026-02")).toBe(28);
    expect(joursDuMois("2028-02")).toBe(29);
  });
});

describe("loyerDuPour", () => {
  it("prorate le mois d'entrée, jour d'entrée compris", () => {
    // Le cas réel : emménagement le 13 octobre, loyer 120 €.
    // Du 13 au 31 inclus, 19 jours sur 31 : 120 × 19 / 31 = 73,5 → 74 €.
    const du = loyerDuPour("2026-10", 120, "2026-10-13");
    expect(du.montant).toBe(74);
    expect(du.prorata).toMatchObject({ jours: 19, joursDuMois: 31, loyerPlein: 120 });
  });

  it("repart au loyer plein le mois suivant", () => {
    const du = loyerDuPour("2026-11", 120, "2026-10-13");
    expect(du.montant).toBe(120);
    expect(du.prorata).toBeNull();
  });

  it("ne prorate pas une entrée au 1er", () => {
    const du = loyerDuPour("2026-11", 120, "2026-11-01");
    expect(du.montant).toBe(120);
    expect(du.prorata).toBeNull();
  });

  it("compte un seul jour pour une entrée le dernier du mois", () => {
    const du = loyerDuPour("2026-10", 310, "2026-10-31");
    expect(du.montant).toBe(10);
    expect(du.prorata?.jours).toBe(1);
  });

  it("laisse le loyer plein aux contrats repris sans date d'entrée", () => {
    // Sept contrats du carnet sont dans ce cas : ils courent depuis toujours,
    // et les proratiser cesserait de réclamer leur loyer.
    expect(loyerDuPour("2026-10", 140, null)).toEqual({ montant: 140, prorata: null });
  });

  it("ne prorate pas les mois qui suivent ni ceux qui précèdent", () => {
    expect(loyerDuPour("2026-12", 120, "2026-10-13").montant).toBe(120);
    expect(loyerDuPour("2026-09", 120, "2026-10-13").montant).toBe(120);
  });

  it("ne prorate pas la sortie — tout mois commencé est dû", () => {
    // La règle d'exploitation est dissymétrique, et c'est voulu : seule
    // l'arrivée se prorate, le départ laisse le mois entier réclamé.
    expect(loyerDuPour("2026-10", 120, "2020-01-01").montant).toBe(120);
  });

  it("arrondit à l'euro", () => {
    // 90 × 10 / 31 = 29,03 → 29 €.
    expect(loyerDuPour("2026-10", 90, "2026-10-22").montant).toBe(29);
  });
});

describe("libelleProrata", () => {
  it("dit le compte de jours plutôt que la formule", () => {
    const { prorata } = loyerDuPour("2026-10", 120, "2026-10-13");
    expect(libelleProrata(prorata!)).toBe("Entrée le 13 — 19 jours sur 31, puis 120 €");
  });
});

describe("moisDEntree", () => {
  it("reconnaît le mois où le bail commence", () => {
    expect(moisDEntree("2026-10", "2026-10-13")).toBe(true);
    expect(moisDEntree("2026-11", "2026-10-13")).toBe(false);
    expect(moisDEntree("2026-10", null)).toBe(false);
  });
});
