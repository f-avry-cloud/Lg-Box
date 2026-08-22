import { describe, expect, it } from "vitest";

import {
  chercheLocataires,
  contratsEnCours,
  estArchive,
  etatLocataire,
  filtreParEtat,
  trieLocataires,
  type LocataireAnnuaire,
} from "@/lib/suivi/locataires";

function locataire(nom: string, extra: Partial<LocataireAnnuaire> = {}): LocataireAnnuaire {
  return {
    id: `l-${nom}`,
    nom,
    societe: null,
    telephone: null,
    email: null,
    box: ["12"],
    enCours: 1,
    loyer: 130,
    depuis: "2024-01-01",
    partiLe: null,
    contrats: 1,
    ...extra,
  };
}

describe("etatLocataire", () => {
  it("dit actif tant qu'un box est loué", () => {
    expect(etatLocataire(locataire("DUPONT"))).toBe("actif");
  });

  it("archive celui dont tous les contrats sont terminés", () => {
    const parti = locataire("MARTIN", {
      box: [],
      enCours: 0,
      loyer: 0,
      contrats: 2,
      partiLe: "2026-03-31",
    });
    expect(etatLocataire(parti)).toBe("archive");
    expect(estArchive(parti)).toBe(true);
  });

  it("n'archive pas un locataire noté sans contrat", () => {
    // Quelqu'un noté à la volée, en attendant de lui établir son contrat.
    // L'archiver le ferait disparaître au moment précis où il faut penser
    // à lui.
    const nouveau = locataire("BERNARD", {
      box: [],
      enCours: 0,
      loyer: 0,
      contrats: 0,
      depuis: null,
    });
    expect(etatLocataire(nouveau)).toBe("sans_contrat");
    expect(estArchive(nouveau)).toBe(false);
  });

  it("garde actif un contrat en cours dont le box n'est pas rattaché", () => {
    // Le piège de cet écran, et il touche 21 des 62 locataires du carnet :
    // juger l'état sur le numéro de box les enverrait aux archives alors
    // qu'ils paient tous les mois.
    const sansBox = locataire("CALONNE", { box: [], enCours: 1, loyer: 270, contrats: 1 });
    expect(etatLocataire(sansBox)).toBe("actif");
    expect(estArchive(sansBox)).toBe(false);
  });
});

describe("filtreParEtat", () => {
  const liste = [
    locataire("ACTIF"),
    locataire("SANS CONTRAT", { box: [], enCours: 0, contrats: 0 }),
    locataire("PARTI", { box: [], enCours: 0, contrats: 1, partiLe: "2026-01-31" }),
  ];

  it("garde le sans-contrat du côté des actifs", () => {
    expect(filtreParEtat(liste, "actifs").map((l) => l.nom)).toEqual(["ACTIF", "SANS CONTRAT"]);
  });

  it("ne montre en archives que ceux qui sont partis", () => {
    expect(filtreParEtat(liste, "archives").map((l) => l.nom)).toEqual(["PARTI"]);
  });

  it("rend tout le monde sur « tous »", () => {
    expect(filtreParEtat(liste, "tous")).toHaveLength(3);
  });
});

describe("chercheLocataires", () => {
  const liste = [
    locataire("CALONNE Éric", { box: ["11"], telephone: "+33612345678" }),
    locataire("GAU Joël", { box: ["24", "25"], societe: "SARL GAU" }),
    locataire("MARTEL Claire", { email: "claire@example.org" }),
  ];

  it("ignore les accents et la casse", () => {
    expect(chercheLocataires(liste, "eric").map((l) => l.nom)).toEqual(["CALONNE Éric"]);
    expect(chercheLocataires(liste, "JOEL").map((l) => l.nom)).toEqual(["GAU Joël"]);
  });

  it("trouve par numéro de box — c'est parfois tout ce dont on se souvient", () => {
    expect(chercheLocataires(liste, "25").map((l) => l.nom)).toEqual(["GAU Joël"]);
  });

  it("trouve par société, téléphone ou adresse", () => {
    expect(chercheLocataires(liste, "sarl").map((l) => l.nom)).toEqual(["GAU Joël"]);
    expect(chercheLocataires(liste, "612345").map((l) => l.nom)).toEqual(["CALONNE Éric"]);
    expect(chercheLocataires(liste, "example.org").map((l) => l.nom)).toEqual(["MARTEL Claire"]);
  });

  it("rend la liste entière sur une recherche vide", () => {
    expect(chercheLocataires(liste, "   ")).toHaveLength(3);
  });
});

describe("trieLocataires", () => {
  it("classe par nom, accents ignorés", () => {
    const trie = trieLocataires([
      locataire("ZOLA"),
      locataire("Étienne"),
      locataire("Adam"),
    ]);
    expect(trie.map((l) => l.nom)).toEqual(["Adam", "Étienne", "ZOLA"]);
  });
});

describe("contratsEnCours", () => {
  it("écarte les contrats terminés avant la période", () => {
    const contrats = [
      { box_id: "a", date_debut: "2024-01-01", date_fin: null },
      { box_id: "b", date_debut: "2024-01-01", date_fin: "2026-05-31" },
    ];
    expect(contratsEnCours(contrats, "2026-08").map((c) => c.box_id)).toEqual(["a"]);
  });

  it("garde un contrat qui se termine le mois affiché — le mois est dû", () => {
    const contrats = [{ box_id: "a", date_debut: "2024-01-01", date_fin: "2026-08-31" }];
    expect(contratsEnCours(contrats, "2026-08")).toHaveLength(1);
  });
});
