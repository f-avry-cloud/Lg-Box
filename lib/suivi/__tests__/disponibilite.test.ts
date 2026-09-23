import { describe, expect, it } from "vitest";

import {
  compteDisponibilite,
  estALouer,
  etatBox,
  occupantsParBox,
} from "@/lib/suivi/disponibilite";

describe("etatBox", () => {
  it("dit loué dès qu'un contrat court", () => {
    expect(etatBox({ occupe: true, libre: false })).toBe("loue");
  });

  it("ne déclare libre qu'un box explicitement confirmé", () => {
    expect(etatBox({ occupe: false, libre: true })).toBe("libre");
  });

  it("présume occupé un box sans contrat et non confirmé", () => {
    // Le point de tout ce module : 25 box sont dans ce cas, et les annoncer
    // libres reviendrait à proposer à la location des box déjà pris.
    expect(etatBox({ occupe: false, libre: false })).toBe("occupant_inconnu");
  });

  it("laisse le drapeau l'emporter sur le contrat", () => {
    // Locataire parti en cours de mois, loyer réglé jusqu'à l'échéance : la
    // case est à relouer aujourd'hui, même si le bail court encore.
    expect(etatBox({ occupe: true, libre: true })).toBe("libre");
  });
});

describe("estALouer", () => {
  it("ne propose que ce qui est confirmé vide", () => {
    expect(estALouer({ occupe: false, libre: true })).toBe(true);
    expect(estALouer({ occupe: false, libre: false })).toBe(false);
    // Vidé avant l'échéance : proposable, quoi qu'en dise le bail.
    expect(estALouer({ occupe: true, libre: true })).toBe(true);
  });
});

describe("compteDisponibilite", () => {
  const parc = [
    { occupe: true, libre: false },
    { occupe: true, libre: false },
    { occupe: true, libre: true },   // vidé avant l'échéance : à relouer
    { occupe: false, libre: false },
    { occupe: false, libre: true },
  ];

  it("répartit les trois états", () => {
    const c = compteDisponibilite(parc);
    expect(c).toMatchObject({ loues: 2, occupantInconnu: 1, libres: 2, total: 5 });
  });

  it("compte l'occupant inconnu comme occupé dans le taux", () => {
    // 3 occupés sur 5 : annoncer 40 % parce qu'un box n'est pas rapproché
    // donnerait une image fausse d'un centre plein.
    expect(compteDisponibilite(parc).tauxOccupation).toBe(60);
  });

  it("rend zéro sur un parc vide plutôt qu'une division par zéro", () => {
    expect(compteDisponibilite([]).tauxOccupation).toBe(0);
  });
});

describe("occupantsParBox", () => {
  const contrat = (
    box_id: string | null,
    date_debut: string | null,
    date_fin: string | null,
    valeur: string
  ) => ({ box_id, date_debut, date_fin, valeur });

  it("écarte un bail résilié — le cas du 6 RDJ", () => {
    // Rendu le 31 août : la case ne doit plus porter le nom de la partante,
    // sans quoi le plan la montre louée pendant que les totaux la comptent vide.
    const occupants = occupantsParBox(
      [contrat("rdj6", "2020-01-01", "2026-08-31", "PUSNEL")],
      "2026-09-23"
    );
    expect(occupants.has("rdj6")).toBe(false);
  });

  it("garde un box dont la sortie est programmée jusqu'à l'échéance", () => {
    const occupants = occupantsParBox(
      [contrat("b4c", "2026-05-02", "2026-09-30", "PORÉE")],
      "2026-09-23"
    );
    expect(occupants.get("b4c")).toBe("PORÉE");
  });

  it("ignore un bail qui n'a pas encore commencé", () => {
    const occupants = occupantsParBox(
      [contrat("b1", "2026-10-01", null, "ARRIVANT")],
      "2026-09-23"
    );
    expect(occupants.has("b1")).toBe(false);
  });

  it("retient l'arrivant quand deux bails se succèdent sur le même box", () => {
    const occupants = occupantsParBox(
      [
        contrat("b7", "2020-06-01", "2026-08-31", "CHEVALIER"),
        contrat("b7", "2026-09-01", null, "ELIAS"),
      ],
      "2026-09-23"
    );
    expect(occupants.get("b7")).toBe("ELIAS");
  });

  it("préfère le bail daté à celui dont le début est inconnu", () => {
    const occupants = occupantsParBox(
      [contrat("b2", null, null, "ANCIEN"), contrat("b2", "2026-09-01", null, "RÉCENT")],
      "2026-09-23"
    );
    expect(occupants.get("b2")).toBe("RÉCENT");
  });

  it("n'écarte jamais un contrat aux deux bornes absentes", () => {
    const occupants = occupantsParBox([contrat("b3", null, null, "SANS DATES")], "2026-09-23");
    expect(occupants.get("b3")).toBe("SANS DATES");
  });

  it("laisse de côté un contrat sans box", () => {
    const occupants = occupantsParBox([contrat(null, null, null, "SANS BOX")], "2026-09-23");
    expect(occupants.size).toBe(0);
  });
});
