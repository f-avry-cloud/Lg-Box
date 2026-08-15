import { describe, expect, it } from "vitest";

import { DEMO_CSV } from "@/lib/suivi/demo-data";
import { libelleBox, parseSeedCsv } from "@/lib/suivi/seed-csv";
import { BOX_A_IDENTIFIER, LOCATAIRE_A_IDENTIFIER } from "@/lib/suivi/types";

const ENTETE =
  "nom,societe,box_numero,batiment,surface_m2,loyer_mensuel_eur,date_entree,telephone,email,remarque";

describe("parseSeedCsv", () => {
  it("crée un locataire, un box et un contrat par ligne complète", () => {
    const seed = parseSeedCsv(
      `${ENTETE}\nDUPONT Jean,,12,Bat I,8,110,2023-03-01,+33600000000,j@example.org,`
    );

    expect(seed.locataires).toHaveLength(1);
    expect(seed.box).toHaveLength(1);
    expect(seed.contrats).toHaveLength(1);
    expect(seed.box[0]).toMatchObject({ numero: "12", batiment: "Bat I", surface_m2: 8 });
    expect(seed.totalLoyers).toBe(110);
  });

  it("regroupe en un seul locataire les deux box d'un même preneur", () => {
    const seed = parseSeedCsv(
      `${ENTETE}\n` +
        `GAU Joël,,3,RDJ,8,120,2025-09-02,+33700000000,g@example.org,\n` +
        `GAU Joël,,9,Bat III,18,180,2025-09-02,+33700000000,g@example.org,`
    );

    expect(seed.locataires).toHaveLength(1);
    expect(seed.contrats).toHaveLength(2);
    expect(new Set(seed.contrats.map((c) => c.locataire_cle)).size).toBe(1);
    expect(seed.totalLoyers).toBe(300);
  });

  it("garde les contrats dont le box n'est pas encore identifié", () => {
    const seed = parseSeedCsv(
      `${ENTETE}\nBARBOT Isabelle,,,,,150,2019-11-01,+33600000000,b@example.org,box à identifier`
    );

    expect(seed.box).toHaveLength(0);
    expect(seed.contrats).toHaveLength(1);
    expect(seed.contrats[0].box_cle).toBeNull();
    // Le loyer compte dans le total malgré le box inconnu.
    expect(seed.totalLoyers).toBe(150);
  });

  it("garde la ligne dont le locataire lui-même n'est pas identifié", () => {
    const seed = parseSeedCsv(`${ENTETE}\n,,,,,140,,,,box à identifier`);

    expect(seed.contrats).toHaveLength(1);
    expect(seed.locataires[0].nom).toBe(LOCATAIRE_A_IDENTIFIER);
    expect(seed.totalLoyers).toBe(140);
  });

  it("ne fusionne pas deux lignes anonymes distinctes", () => {
    const seed = parseSeedCsv(`${ENTETE}\n,,,,,140,,,,\n,,,,,90,,,,`);
    expect(seed.locataires).toHaveLength(2);
    expect(seed.contrats).toHaveLength(2);
  });

  it("ignore une ligne entièrement vide", () => {
    const seed = parseSeedCsv(`${ENTETE}\n,,,,,,,,,\nDUPONT Jean,,12,Bat I,8,110,,,,`);
    expect(seed.contrats).toHaveLength(1);
  });

  it("ne dédoublonne pas deux box de même numéro dans des bâtiments différents", () => {
    const seed = parseSeedCsv(
      `${ENTETE}\n` +
        `A,,8,Etage,5,90,,,,\n` +
        `B,,8,Bat III,18,180,,,,`
    );
    expect(seed.box).toHaveLength(2);
  });
});

describe("jeu de démonstration embarqué", () => {
  // Le mode démo doit reproduire exactement la structure du fichier réel :
  // c'est ce qui permet de vérifier les écrans sans manipuler de données
  // personnelles. Ces chiffres viennent de data/locataires_seed.csv.
  const seed = parseSeedCsv(DEMO_CSV);

  it("contient 63 contrats pour 8 710 € de loyers mensuels", () => {
    expect(seed.contrats).toHaveLength(63);
    expect(seed.totalLoyers).toBe(8710);
  });

  it("reproduit les 62 locataires, dont un à deux box", () => {
    expect(seed.locataires).toHaveLength(62);
    expect(seed.contrats.length - seed.locataires.length).toBe(1);
  });

  it("reproduit les 39 box identifiés et les 24 contrats sans box", () => {
    expect(seed.box).toHaveLength(39);
    expect(seed.contrats.filter((c) => c.box_cle === null)).toHaveLength(24);
  });

  it("ne contient aucune adresse e-mail hors domaine de test", () => {
    const emails = seed.locataires.map((l) => l.email).filter(Boolean) as string[];
    expect(emails.length).toBeGreaterThan(0);
    expect(emails.every((e) => e.endsWith("@example.org"))).toBe(true);
  });
});

describe("libelleBox", () => {
  it("annonce clairement un box non identifié", () => {
    expect(libelleBox(null, null)).toBe(BOX_A_IDENTIFIER);
  });

  it("affiche numéro et bâtiment quand ils sont connus", () => {
    expect(libelleBox("12", "Bat I")).toBe("Box 12 · Bat I");
    expect(libelleBox("12", null)).toBe("Box 12");
  });
});
