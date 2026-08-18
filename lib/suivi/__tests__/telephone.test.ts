import { describe, expect, it } from "vitest";

import {
  estIOS,
  lienAppelOnoff,
  lienSms,
  lienSmsOnoff,
  lienTel,
  nettoieNumero,
} from "@/lib/suivi/telephone";

describe("nettoieNumero", () => {
  it("retire les espaces d'un numéro saisi à la française", () => {
    // Un espace laissé dans l'entrée du raccourci fait échouer la composition,
    // sans message d'erreur.
    expect(nettoieNumero("06 12 34 56 78")).toBe("0612345678");
    expect(nettoieNumero("+33 6 12 34 56 78")).toBe("+33612345678");
  });

  it("retire aussi points, tirets, parenthèses et espaces insécables", () => {
    expect(nettoieNumero("06.12.34.56.78")).toBe("0612345678");
    expect(nettoieNumero("06-12-34-56-78")).toBe("0612345678");
    expect(nettoieNumero("(+33) 6 12 34 56 78")).toBe("+33612345678");
    expect(nettoieNumero("06 12 34 56 78")).toBe("0612345678");
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

describe("liens de raccourci", () => {
  it("encode le nom du raccourci, espace comprise", () => {
    expect(lienAppelOnoff("0612345678")).toBe(
      "shortcuts://run-shortcut?name=Appel%20ONOFF&input=text&text=0612345678"
    );
    expect(lienSmsOnoff("0612345678")).toBe(
      "shortcuts://run-shortcut?name=SMS%20ONOFF&input=text&text=0612345678"
    );
  });

  it("annonce le type de source dans `input`, jamais le numéro", () => {
    // `input` porte « text » ou « clipboard ». Y glisser le numéro fait lancer
    // le raccourci sans entrée : il réclame alors la valeur dans une fenêtre
    // qui ne mène nulle part, sans le moindre message d'erreur.
    const lien = lienSmsOnoff("0612345678")!;
    expect(lien).toContain("&input=text&");
    expect(lien).not.toContain("input=0612345678");
  });

  it("encode le + du numéro", () => {
    // Non encodé, le + serait relu comme une espace par l'analyseur de la
    // chaîne de requête, et le raccourci recevrait « 33612345678 » précédé
    // d'un blanc.
    expect(lienSmsOnoff("+33 6 12 34 56 78")).toBe(
      "shortcuts://run-shortcut?name=SMS%20ONOFF&input=text&text=%2B33612345678"
    );
  });

  it("nettoie avant de construire le lien", () => {
    expect(lienAppelOnoff("06.12.34.56.78")).toContain("text=0612345678");
  });

  it("rend null sans numéro exploitable", () => {
    expect(lienAppelOnoff(null)).toBeNull();
    expect(lienSmsOnoff("—")).toBeNull();
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

describe("estIOS", () => {
  const IPHONE =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  const IPAD_MODERNE =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
  const MAC =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
  const ANDROID =
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";

  it("reconnaît un iPhone", () => {
    expect(estIOS(IPHONE)).toBe(true);
  });

  it("reconnaît un iPad récent, qui se déclare Macintosh", () => {
    // Un iPad moderne ment sur son identité ; seul l'écran tactile le trahit.
    expect(estIOS(IPAD_MODERNE, 5)).toBe(true);
  });

  it("ne prend pas un Mac pour un iPad", () => {
    expect(estIOS(MAC, 0)).toBe(false);
    expect(estIOS(IPAD_MODERNE, 0)).toBe(false);
  });

  it("laisse Android au lien natif", () => {
    expect(estIOS(ANDROID, 5)).toBe(false);
  });
});
