import { describe, expect, it } from "vitest";

import {
  ecartRepartition,
  libelleEcart,
  loyerPropose,
  totalActuel,
  totalApres,
  type ContratDuLocataire,
  type Repartition,
} from "@/lib/suivi/affectation";

// Le cas réel qui a motivé tout ceci : un bail sur deux box importé comme un
// seul contrat au loyer global. La fiche du box 11 annonçait 270 €, qui est le
// loyer des deux box réunis.
const calonne: ContratDuLocataire[] = [
  { contrat_id: "c-11", box_numero: "11", loyer_mensuel_eur: 270 },
];

// Le cas correct, importé sur deux lignes : deux contrats, deux loyers.
const gau: ContratDuLocataire[] = [
  { contrat_id: "c-9", box_numero: "9", loyer_mensuel_eur: 180 },
  { contrat_id: "c-3", box_numero: "3", loyer_mensuel_eur: 120 },
];

describe("totalActuel", () => {
  it("somme les loyers de tous les contrats du locataire", () => {
    expect(totalActuel(gau)).toBe(300);
    expect(totalActuel(calonne)).toBe(270);
  });

  it("rend zéro pour un locataire sans contrat logé", () => {
    expect(totalActuel([])).toBe(0);
  });
});

describe("répartition d'un loyer global", () => {
  it("laisse le total inchangé quand on scinde 270 € en 140 + 130", () => {
    const repartition: Repartition = {
      loyerNouveau: 130,
      source: { contrat_id: "c-11", loyerNouveau: 140 },
    };

    expect(totalApres(calonne, repartition)).toBe(270);
    expect(ecartRepartition(calonne, repartition)).toBe(0);
  });

  it("signale l'écart quand la répartition ne retombe pas sur le total", () => {
    // Erreur de saisie plausible : on pose le loyer du second box sans
    // diminuer le premier d'autant.
    const repartition: Repartition = {
      loyerNouveau: 130,
      source: { contrat_id: "c-11", loyerNouveau: 200 },
    };

    expect(ecartRepartition(calonne, repartition)).toBe(60);
  });

  it("compte un loyer supplémentaire quand aucune source n'est choisie", () => {
    // Cas légitime : le locataire prend un box de plus et paiera davantage.
    const repartition: Repartition = { loyerNouveau: 130, source: null };

    expect(totalApres(calonne, repartition)).toBe(400);
    expect(ecartRepartition(calonne, repartition)).toBe(130);
  });

  it("ne touche qu'au contrat désigné quand le locataire en a plusieurs", () => {
    const repartition: Repartition = {
      loyerNouveau: 100,
      source: { contrat_id: "c-9", loyerNouveau: 80 },
    };

    // 80 (ex-180) + 120 inchangé + 100 nouveau
    expect(totalApres(gau, repartition)).toBe(300);
    expect(ecartRepartition(gau, repartition)).toBe(0);
  });

  it("accepte de vider le contrat d'origine, sans le supprimer", () => {
    // Un box dont tout le loyer bascule sur l'autre reste un contrat : c'est
    // au carnet de dire qu'il ne rapporte rien, pas de faire disparaître la
    // location.
    const repartition: Repartition = {
      loyerNouveau: 270,
      source: { contrat_id: "c-11", loyerNouveau: 0 },
    };

    expect(ecartRepartition(calonne, repartition)).toBe(0);
  });
});

describe("libelleEcart", () => {
  it("nomme la répartition sans écart", () => {
    expect(libelleEcart(0)).toContain("Total inchangé");
  });

  it("annonce une hausse et une baisse dans le bon sens", () => {
    expect(libelleEcart(130)).toBe("Le locataire paiera 130 € de plus par mois.");
    expect(libelleEcart(-40)).toBe("Le locataire paiera 40 € de moins par mois.");
  });
});

describe("loyerPropose", () => {
  it("propose le tarif indicatif du box quand il existe", () => {
    expect(loyerPropose(140)).toBe("140");
  });

  it("ne propose rien plutôt que d'inventer un montant", () => {
    // 26 des 67 box n'ont pas même de surface connue : un chiffre deviné qui
    // s'installe dans les comptes est pire qu'une case vide.
    expect(loyerPropose(null)).toBe("");
    expect(loyerPropose(0)).toBe("");
  });
});
