import { describe, expect, it } from "vitest";

import {
  compteDisponibilite,
  estALouer,
  etatBox,
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

  it("laisse le contrat l'emporter sur le drapeau", () => {
    // Sortie programmée à la fin du mois : le box est promis, pas encore rendu.
    expect(etatBox({ occupe: true, libre: true })).toBe("loue");
  });
});

describe("estALouer", () => {
  it("ne propose que ce qui est confirmé vide", () => {
    expect(estALouer({ occupe: false, libre: true })).toBe(true);
    expect(estALouer({ occupe: false, libre: false })).toBe(false);
    expect(estALouer({ occupe: true, libre: true })).toBe(false);
  });
});

describe("compteDisponibilite", () => {
  const parc = [
    { occupe: true, libre: false },
    { occupe: true, libre: false },
    { occupe: true, libre: true },   // sortie programmée : encore loué
    { occupe: false, libre: false },
    { occupe: false, libre: true },
  ];

  it("répartit les trois états", () => {
    const c = compteDisponibilite(parc);
    expect(c).toMatchObject({ loues: 3, occupantInconnu: 1, libres: 1, total: 5 });
  });

  it("compte l'occupant inconnu comme occupé dans le taux", () => {
    // 4 occupés sur 5 : annoncer 60 % parce qu'un box n'est pas rapproché
    // donnerait une image fausse d'un centre plein.
    expect(compteDisponibilite(parc).tauxOccupation).toBe(80);
  });

  it("rend zéro sur un parc vide plutôt qu'une division par zéro", () => {
    expect(compteDisponibilite([]).tauxOccupation).toBe(0);
  });
});
