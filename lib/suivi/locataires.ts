// L'annuaire des locataires : état, recherche, tri.
//
// L'écran n'apporte aucune donnée nouvelle — tout est déjà atteignable par la
// liste du mois, la fiche d'un box ou le plan. Il apporte un chemin : partir
// d'un nom plutôt que d'un box ou d'un mois.

import { contratDuPour } from "@/lib/suivi/contrat";

/** Ce qu'on sait d'un locataire dans l'annuaire. */
export type LocataireAnnuaire = {
  id: string;
  nom: string;
  societe: string | null;
  telephone: string | null;
  email: string | null;
  /** Numéros des box actuellement loués, dans l'ordre. Peut être vide alors
   *  même qu'un contrat court : le rattachement du box se fait à part. */
  box: string[];
  /** Contrats qui courent à la période affichée. C'est lui qui dit l'état. */
  enCours: number;
  /** Somme des loyers en cours. Zéro quand plus rien ne court. */
  loyer: number;
  /** Premier jour connu de la location, tous contrats confondus. */
  depuis: string | null;
  /** Dernier jour de la dernière location terminée. Null tant qu'une court. */
  partiLe: string | null;
  /** Nombre de contrats, terminés compris. Zéro = jamais rattaché à un box. */
  contrats: number;
};

/**
 * Trois états, dont deux seulement font des onglets.
 *
 * **L'état se lit sur les contrats en cours, jamais sur les numéros de box** —
 * et c'est le piège de cet écran. Un contrat peut courir sans que son box soit
 * encore rattaché : c'est le cas de 21 des 62 locataires du carnet, hérités
 * d'un import incomplet. Les juger sur leur box les enverrait aux archives
 * alors qu'ils paient tous les mois.
 *
 * `sans_contrat` mérite d'exister à part : un locataire noté à la volée, en
 * attendant de lui établir son contrat, n'est pas un ancien locataire. Le
 * ranger dans les archives le ferait disparaître au moment précis où il faut
 * penser à lui. Il est donc compté avec les actifs, et l'écran le signale.
 */
export type EtatLocataire = "actif" | "sans_contrat" | "archive";

export function etatLocataire(locataire: LocataireAnnuaire): EtatLocataire {
  if (locataire.enCours > 0) return "actif";
  return locataire.contrats > 0 ? "archive" : "sans_contrat";
}

/** Un locataire archivé est parti : tous ses contrats sont terminés. */
export function estArchive(locataire: LocataireAnnuaire): boolean {
  return etatLocataire(locataire) === "archive";
}

export type FiltreLocataires = "actifs" | "archives" | "tous";

export function filtreParEtat(
  locataires: LocataireAnnuaire[],
  filtre: FiltreLocataires
): LocataireAnnuaire[] {
  if (filtre === "tous") return locataires;
  if (filtre === "archives") return locataires.filter(estArchive);
  return locataires.filter((l) => !estArchive(l));
}

/**
 * Insensible aux accents et à la casse : on tape « eric » depuis un clavier de
 * téléphone, pas « ÉRIC ». Le numéro de box compte aussi comme terme de
 * recherche — c'est parfois tout ce dont on se souvient.
 */
function normalise(valeur: string): string {
  return valeur
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr")
    .trim();
}

export function chercheLocataires(
  locataires: LocataireAnnuaire[],
  recherche: string
): LocataireAnnuaire[] {
  const terme = normalise(recherche);
  if (!terme) return locataires;

  return locataires.filter((l) =>
    [l.nom, l.societe ?? "", l.telephone ?? "", l.email ?? "", ...l.box].some((champ) =>
      normalise(champ).includes(terme)
    )
  );
}

/**
 * Ordre alphabétique, accents ignorés.
 *
 * Un annuaire se parcourt à l'œil : tout autre tri — par loyer, par date
 * d'entrée — obligerait à lire la liste entière pour trouver un nom.
 */
export function trieLocataires(locataires: LocataireAnnuaire[]): LocataireAnnuaire[] {
  return [...locataires].sort((a, b) =>
    a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" })
  );
}

/**
 * Les box loués d'un locataire, à la période donnée, et le loyer qui va avec.
 *
 * Rassemblé ici parce que la règle est la même que partout ailleurs dans
 * l'app : un contrat compte tant qu'il court, `contratDuPour` en décide, et
 * un box rattaché à un contrat terminé n'est plus loué par personne.
 */
export function contratsEnCours<
  T extends { box_id: string | null; date_debut: string | null; date_fin: string | null },
>(contrats: T[], periode: string): T[] {
  return contrats.filter((c) => contratDuPour(periode, c.date_debut, c.date_fin));
}
