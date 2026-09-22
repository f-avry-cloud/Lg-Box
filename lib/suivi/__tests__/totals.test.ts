import { describe, expect, it } from "vitest";

import {
  calculeTotaux,
  cumuleEncaisse,
  encaisseLigne,
  filtreLignes,
  initiales,
  resumeFacturation,
  statutLigne,
  trieLignes,
} from "@/lib/suivi/totals";
import type { LigneMois, Reglement, ReglementStatut } from "@/lib/suivi/types";

function ligne(
  nom: string,
  loyer: number,
  statut?: ReglementStatut,
  montant = 0,
  extra: Partial<LigneMois> = {}
): LigneMois {
  const reglement: Reglement | null = statut
    ? {
        id: `r-${nom}`,
        contrat_id: `c-${nom}`,
        periode: "2026-08",
        statut,
        montant_encaisse_eur: montant,
        date_encaissement: null,
        moyen: null,
        note: null,
        date_facturation: null,
        updated_at: "2026-08-01T00:00:00.000Z",
      }
    : null;

  return {
    contrat_id: `c-${nom}`,
    locataire_id: `l-${nom}`,
    nom,
    societe: null,
    box_numero: null,
    batiment: null,
    loyer_mensuel_eur: loyer,
    reglement,
    ...extra,
  };
}

describe("statutLigne", () => {
  it("traite l'absence de ligne de règlement comme « attendu »", () => {
    expect(statutLigne(ligne("MARTIN", 100))).toBe("attendu");
  });
});

describe("encaisseLigne", () => {
  it("compte le loyer plein pour un « payé » pointé en un tap", () => {
    expect(encaisseLigne(ligne("MARTIN", 140, "paye"))).toBe(140);
  });

  it("respecte le montant saisi quand il est renseigné", () => {
    expect(encaisseLigne(ligne("MARTIN", 140, "paye", 150))).toBe(150);
    expect(encaisseLigne(ligne("MARTIN", 140, "partiel", 60))).toBe(60);
  });

  it("ne compte rien pour « attendu » et « retard »", () => {
    expect(encaisseLigne(ligne("MARTIN", 140))).toBe(0);
    expect(encaisseLigne(ligne("MARTIN", 140, "retard"))).toBe(0);
  });
});

describe("calculeTotaux", () => {
  it("sépare l'encaissé du reste à encaisser", () => {
    const totaux = calculeTotaux([
      ligne("A", 100, "paye"),
      ligne("B", 200),
      ligne("C", 150, "partiel", 50),
    ]);

    expect(totaux.encaisse).toBe(150);
    expect(totaux.reste).toBe(300);
    expect(totaux.regles).toBe(1);
    expect(totaux.total).toBe(3);
  });

  it("ne produit pas de reste négatif quand un locataire règle un arriéré", () => {
    const totaux = calculeTotaux([ligne("A", 100, "paye", 250)]);
    expect(totaux.encaisse).toBe(250);
    expect(totaux.reste).toBe(0);
  });

  it("rend des totaux nuls sur un mois vide", () => {
    expect(calculeTotaux([])).toEqual({ encaisse: 0, reste: 0, regles: 0, total: 0 });
  });
});

describe("filtreLignes", () => {
  const lignes = [
    ligne("DUPONT Jean", 100, "paye"),
    ligne("MARTIN Claire", 200),
    ligne("BERNARD Luc", 150, "partiel", 50, { box_numero: "12", batiment: "Bat I" }),
  ];

  it("isole les réglés et les non-réglés", () => {
    expect(filtreLignes(lignes, "regles", "").map((l) => l.nom)).toEqual(["DUPONT Jean"]);
    expect(filtreLignes(lignes, "attente", "").map((l) => l.nom)).toEqual([
      "MARTIN Claire",
      "BERNARD Luc",
    ]);
  });

  it("classe un règlement partiel comme restant en attente", () => {
    // Un partiel n'est pas soldé : il doit rester sous les yeux de l'exploitant.
    expect(filtreLignes(lignes, "attente", "").some((l) => l.nom === "BERNARD Luc")).toBe(true);
  });

  it("cherche par nom comme par numéro de box, sans tenir compte de la casse", () => {
    expect(filtreLignes(lignes, "tous", "martin").map((l) => l.nom)).toEqual(["MARTIN Claire"]);
    expect(filtreLignes(lignes, "tous", "12").map((l) => l.nom)).toEqual(["BERNARD Luc"]);
    expect(filtreLignes(lignes, "tous", "bat i").map((l) => l.nom)).toEqual(["BERNARD Luc"]);
  });

  it("retrouve les lignes sans box par leur libellé affiché", () => {
    expect(filtreLignes(lignes, "tous", "identifier").map((l) => l.nom)).toEqual([
      "DUPONT Jean",
      "MARTIN Claire",
    ]);
  });
});

describe("trieLignes", () => {
  it("remonte les non-réglés, puis classe par ordre alphabétique français", () => {
    const trie = trieLignes([
      ligne("ÉTIENNE Paul", 100),
      ligne("ADAM Marie", 100, "paye"),
      ligne("ESTEVE Luc", 100),
    ]);

    // ÉTIENNE et ESTEVE se rangent ensemble malgré l'accent ; ADAM, réglé,
    // passe en dernier même s'il est premier dans l'alphabet.
    expect(trie.map((l) => l.nom)).toEqual(["ESTEVE Luc", "ÉTIENNE Paul", "ADAM Marie"]);
  });

  it("garde groupées les deux lignes d'un locataire à deux box", () => {
    const trie = trieLignes([
      ligne("GAU Joël", 180, undefined, 0, { contrat_id: "c2", box_numero: "9" }),
      ligne("BERNARD Luc", 100),
      ligne("GAU Joël", 120, undefined, 0, { contrat_id: "c1", box_numero: "3" }),
    ]);

    expect(trie.map((l) => l.box_numero)).toEqual([null, "3", "9"]);
  });
});

describe("initiales", () => {
  it("prend la première et la dernière initiale", () => {
    expect(initiales("DUPONT Jean")).toBe("DJ");
    expect(initiales("LE HÉNAFF Julie")).toBe("LJ");
    expect(initiales("CRESPIN-CADORET Sophie")).toBe("CS");
  });

  it("se rabat sur les deux premières lettres d'un nom unique", () => {
    expect(initiales("ELIAS")).toBe("EL");
  });
});

describe("cumuleEncaisse", () => {
  it("compte un « payé » sans montant au loyer plein", () => {
    // C'est le geste courant : un tap, pas de saisie. L'oublier ferait
    // afficher un chiffre d'affaires annuel proche de zéro.
    expect(
      cumuleEncaisse([{ statut: "paye", montant_encaisse_eur: 0, loyer_mensuel_eur: 140 }])
    ).toBe(140);
  });

  it("additionne les mois de l'année, partiels compris", () => {
    expect(
      cumuleEncaisse([
        { statut: "paye", montant_encaisse_eur: 0, loyer_mensuel_eur: 140 },
        { statut: "paye", montant_encaisse_eur: 150, loyer_mensuel_eur: 140 },
        { statut: "partiel", montant_encaisse_eur: 60, loyer_mensuel_eur: 140 },
      ])
    ).toBe(350);
  });

  it("ignore le facturé : réclamé n'est pas encaissé", () => {
    expect(
      cumuleEncaisse([{ statut: "facture", montant_encaisse_eur: 0, loyer_mensuel_eur: 140 }])
    ).toBe(0);
  });

  it("rend zéro sur une année sans règlement", () => {
    expect(cumuleEncaisse([])).toBe(0);
  });
});

describe("resumeFacturation", () => {
  it("ne compte que les loyers encore attendus, et leur montant", () => {
    const resume = resumeFacturation([
      ligne("Attendu", 140),
      ligne("Payé", 200, "paye"),
      ligne("Facturé", 90, "facture"),
      ligne("Partiel", 100, "partiel", 40),
    ]);

    expect(resume).toEqual({ aFacturer: 1, dejaFacturees: 1, montant: 140 });
  });

  it("annonce zéro quand le mois est déjà entièrement réclamé", () => {
    // Le bouton doit alors se désactiver plutôt que promettre une action sans
    // effet : la facturation est rejouable, mais elle ne doit pas mentir.
    const resume = resumeFacturation([ligne("A", 140, "facture"), ligne("B", 90, "paye")]);
    expect(resume.aFacturer).toBe(0);
    expect(resume.montant).toBe(0);
  });
});

describe("encaisseLigne face au statut « facturé »", () => {
  it("laisse le loyer entier dans le reste à encaisser", () => {
    const lignes = [ligne("A", 140, "facture")];
    expect(encaisseLigne(lignes[0])).toBe(0);
    expect(calculeTotaux(lignes)).toEqual({ encaisse: 0, reste: 140, regles: 0, total: 1 });
  });
});
