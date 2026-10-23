import { describe, expect, it } from "vitest";

import {
  contratAVenir,
  contratDuPour,
  contratOccupeOuReserve,
  sortieAVenir,
} from "@/lib/suivi/contrat";
import { bissextile, dernierJour, premierJour } from "@/lib/suivi/period";

describe("premierJour / dernierJour", () => {
  it("borne les mois de 31 et 30 jours", () => {
    expect(premierJour("2026-08")).toBe("2026-08-01");
    expect(dernierJour("2026-08")).toBe("2026-08-31");
    expect(dernierJour("2026-09")).toBe("2026-09-30");
  });

  it("gère février, année commune comme bissextile", () => {
    expect(dernierJour("2026-02")).toBe("2026-02-28");
    expect(dernierJour("2028-02")).toBe("2028-02-29");
  });

  it("applique la règle séculaire", () => {
    // 2100 n'est pas bissextile : c'est le cas que les tables écrites à la
    // main se trompent le plus souvent.
    expect(bissextile(2100)).toBe(false);
    expect(bissextile(2000)).toBe(true);
    expect(dernierJour("2100-02")).toBe("2100-02-28");
  });
});

describe("contratDuPour", () => {
  it("réclame le loyer d'un contrat sans date de fin", () => {
    expect(contratDuPour("2026-08", "2020-01-01", null)).toBe(true);
  });

  it("laisse dû tout mois commencé, même écourté", () => {
    // Sortie au 15 septembre : septembre reste entièrement dû.
    expect(contratDuPour("2026-09", "2020-01-01", "2026-09-15")).toBe(true);
    // Et octobre ne l'est plus.
    expect(contratDuPour("2026-10", "2020-01-01", "2026-09-15")).toBe(false);
  });

  it("réclame le mois de la date de fin, jamais le suivant", () => {
    expect(contratDuPour("2026-09", "2020-01-01", "2026-09-30")).toBe(true);
    expect(contratDuPour("2026-10", "2020-01-01", "2026-09-30")).toBe(false);
  });

  it("ne réclame rien avant l'entrée du locataire", () => {
    expect(contratDuPour("2026-07", "2026-08-01", null)).toBe(false);
    expect(contratDuPour("2026-08", "2026-08-01", null)).toBe(true);
  });

  it("réclame dès le mois d'entrée, même entré en fin de mois", () => {
    // Tout mois commencé est dû : entrer le 31 août rend août dû.
    expect(contratDuPour("2026-08", "2026-08-31", null)).toBe(true);
  });

  it("ne bloque pas un contrat sans date d'entrée connue", () => {
    // Sept contrats importés sont dans ce cas ; les exclure reviendrait à
    // cesser de réclamer leur loyer.
    expect(contratDuPour("2026-08", null, null)).toBe(true);
  });
});

describe("sortieAVenir", () => {
  it("signale une sortie programmée qui n'a pas encore pris effet", () => {
    expect(sortieAVenir("2026-08", "2026-09-30")).toBe(true);
    expect(sortieAVenir("2026-09", "2026-09-30")).toBe(true);
  });

  it("ne signale plus rien une fois la sortie passée", () => {
    expect(sortieAVenir("2026-10", "2026-09-30")).toBe(false);
  });

  it("ne signale rien sans date de fin", () => {
    expect(sortieAVenir("2026-08", null)).toBe(false);
  });
});

describe("contratAVenir", () => {
  it("reconnaît le bail signé pour le mois prochain", () => {
    // Le cas réel : signé le 23 octobre, effet au 1er novembre.
    expect(contratAVenir("2026-10", "2026-11-01", null)).toBe(true);
  });

  it("ne dit pas à venir un bail qui court déjà", () => {
    expect(contratAVenir("2026-10", "2020-01-01", null)).toBe(false);
  });

  it("ne dit pas à venir un bail commençant dans le mois affiché", () => {
    expect(contratAVenir("2026-10", "2026-10-31", null)).toBe(false);
  });

  it("ne dit jamais à venir un contrat sans date de début", () => {
    // Sept contrats repris n'en ont pas : ils courent depuis toujours.
    expect(contratAVenir("2026-10", null, null)).toBe(false);
  });

  it("écarte un bail futur déjà clos", () => {
    expect(contratAVenir("2026-10", "2026-12-01", "2026-11-30")).toBe(false);
  });
});

describe("contratOccupeOuReserve", () => {
  it("tient le box pris pour un bail en cours", () => {
    expect(contratOccupeOuReserve("2026-10", "2020-01-01", null)).toBe(true);
  });

  it("tient le box pris pour un bail qui commence le mois prochain", () => {
    // Le 4C : rendu par sa locataire fin septembre, repris au 1er novembre.
    // Le proposer à quelqu'un d'autre en octobre le louerait deux fois.
    expect(contratOccupeOuReserve("2026-10", "2026-11-01", null)).toBe(true);
  });

  it("rend le box à la location quand le bail est terminé", () => {
    expect(contratOccupeOuReserve("2026-10", "2026-05-02", "2026-09-30")).toBe(false);
  });
});
