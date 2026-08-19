import { describe, expect, it } from "vitest";

import { lienSms, lienTel, nettoieNumero } from "@/lib/suivi/telephone";

describe("nettoieNumero", () => {
  it("retire les espaces d'un numéro saisi à la française", () => {
    // Un `tel:` contenant des espaces n'est pas toujours composé correctement.
    expect(nettoieNumero("06 12 34 56 78")).toBe("0612345678");
    expect(nettoieNumero("+33 6 12 34 56 78")).toBe("+33612345678");
  });

  it("retire aussi points, tirets, parenthèses et espaces insécables", () => {
    expect(nettoieNumero("06.12.34.56.78")).toBe("0612345678");
    expect(nettoieNumero("06-12-34-56-78")).toBe("0612345678");
    expect(nettoieNumero("(+33) 6 12 34 56 78")).toBe("+33612345678");
    expect(nettoieNumero("06 12 34 56 78")).toBe("0612345678");
  });

  it("garde le + de tête, et lui seul", () => {
    expect(nettoieNumero("+33612345678")).toBe("+33612345678");
    // Un + au milieu est une coquille, pas un indicatif.
    expect(nettoieNumero("06+12345678")).toBe("0612345678");
  });

  it("ne convertit pas la forme du numéro", () => {
    // Deviner l'indicatif d'un numéro qu'on n'a pas saisi soi-même, c'est se
    // tromper un jour sur un numéro étranger.
    expect(nettoieNumero("0612345678")).toBe("0612345678");
    expect(nettoieNumero("+41791234567")).toBe("+41791234567");
  });

  it("laisse passer un numéro déjà propre sans le toucher", () => {
    expect(nettoieNumero("+33639980142")).toBe("+33639980142");
  });

  it("rend null quand il n'y a rien à composer", () => {
    expect(nettoieNumero(null)).toBeNull();
    expect(nettoieNumero(undefined)).toBeNull();
    expect(nettoieNumero("")).toBeNull();
    expect(nettoieNumero("   ")).toBeNull();
    expect(nettoieNumero("non renseigné")).toBeNull();
  });
});

describe("liens natifs", () => {
  it("composent sur le numéro nettoyé", () => {
    expect(lienTel("06 12 34 56 78")).toBe("tel:0612345678");
    expect(lienSms("+33 6 12 34 56 78")).toBe("sms:+33612345678");
  });

  it("rendent null sans numéro", () => {
    expect(lienTel(null)).toBeNull();
    expect(lienSms("")).toBeNull();
  });
});
