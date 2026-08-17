import { describe, expect, it } from "vitest";

import {
  aEnvoyer,
  expediteurComplet,
  interpoleMail,
  parametrageIncomplet,
  phraseEnvoi,
  resumeEnvoi,
  type DestinataireFacture,
  type ParametresMail,
} from "@/lib/suivi/mail";

function destinataire(
  nom: string,
  extra: Partial<DestinataireFacture> = {}
): DestinataireFacture {
  return {
    contrat_id: `c-${nom}`,
    nom,
    email: `${nom.toLowerCase()}@example.org`,
    box: "12",
    loyer: 140,
    dejaEnvoye: false,
    ...extra,
  };
}

const parametres: ParametresMail = {
  expediteur_nom: "LG BOX",
  expediteur_email: "contact@lg-box.fr",
  repondre_a: null,
  copie_email: null,
  objet: "Loyer {mois} — LG BOX",
  corps: "Bonjour {nom},\n\nBox {box} — {loyer} €",
};

describe("interpoleMail", () => {
  it("remplace toutes les variables du modèle", () => {
    expect(
      interpoleMail(parametres.corps, { nom: "MARTEL Claire", box: "12", loyer: 140 }, "2026-08")
    ).toBe("Bonjour MARTEL Claire,\n\nBox 12 — 140 €");
  });

  it("écrit le mois en minuscules, dans le corps d'une phrase", () => {
    expect(interpoleMail("Loyer de {mois}", { nom: "X", box: null, loyer: 0 }, "2026-08")).toBe(
      "Loyer de août 2026"
    );
  });

  it("remplace toutes les occurrences d'une même variable", () => {
    expect(interpoleMail("{nom} / {nom}", { nom: "A", box: null, loyer: 0 }, "2026-08")).toBe(
      "A / A"
    );
  });

  it("laisse visible une variable inconnue plutôt que d'ouvrir un trou", () => {
    // Une faute de frappe doit sauter aux yeux dans l'aperçu, pas produire un
    // mail amputé parti à soixante personnes.
    expect(interpoleMail("{loyerr}", { nom: "A", box: null, loyer: 140 }, "2026-08")).toBe(
      "{loyerr}"
    );
  });

  it("écrit un tiret quand le box n'est pas identifié", () => {
    expect(interpoleMail("Box {box}", { nom: "A", box: null, loyer: 0 }, "2026-08")).toBe("Box —");
  });
});

describe("resumeEnvoi / aEnvoyer", () => {
  it("sépare les prêts, les sans-adresse et les déjà servis", () => {
    const liste = [
      destinataire("Alpha"),
      destinataire("Beta", { email: null }),
      destinataire("Gamma", { dejaEnvoye: true }),
    ];

    expect(resumeEnvoi(liste)).toEqual({ aEnvoyer: 1, sansEmail: 1, dejaEnvoyes: 1 });
    expect(aEnvoyer(liste).map((d) => d.nom)).toEqual(["Alpha"]);
  });

  it("ne relance pas un destinataire déjà servi, même avec une adresse", () => {
    // C'est le garde-fou du bouton rejoué : sans lui, un second tap enverrait
    // une deuxième facture à tout le monde.
    expect(aEnvoyer([destinataire("Alpha", { dejaEnvoye: true })])).toEqual([]);
  });
});

describe("parametrageIncomplet", () => {
  it("laisse passer un paramétrage complet", () => {
    expect(parametrageIncomplet(parametres)).toEqual([]);
  });

  it("réclame l'adresse d'expédition quand rien n'est paramétré", () => {
    expect(parametrageIncomplet(null)).toEqual(["l'adresse d'expédition"]);
  });

  it("liste tout ce qui manque, pas seulement le premier manque", () => {
    expect(parametrageIncomplet({ ...parametres, expediteur_email: "  ", corps: "" })).toEqual([
      "l'adresse d'expédition",
      "le corps du message",
    ]);
  });
});

describe("expediteurComplet", () => {
  it("compose l'en-tête attendu par le fournisseur d'envoi", () => {
    expect(expediteurComplet(parametres)).toBe("LG BOX <contact@lg-box.fr>");
  });

  it("se réduit à l'adresse quand aucun nom n'est donné", () => {
    expect(expediteurComplet({ ...parametres, expediteur_nom: "  " })).toBe("contact@lg-box.fr");
  });
});

describe("phraseEnvoi", () => {
  it("accorde le pluriel et élide le mois", () => {
    expect(phraseEnvoi(1, "2026-08")).toBe("Envoyer 1 facture d'août 2026 par mail ?");
    expect(phraseEnvoi(12, "2026-09")).toBe("Envoyer 12 factures de septembre 2026 par mail ?");
  });

  it("ne promet rien quand il n'y a rien à envoyer", () => {
    expect(phraseEnvoi(0, "2026-08")).toBe("Aucune facture d'août 2026 n'est prête à partir.");
  });
});
