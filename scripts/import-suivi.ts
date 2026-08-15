/**
 * Import idempotent du CSV des locataires dans les tables sr_* de
 * l'application « Suivi des règlements ».
 *
 *   npm run suivi:import                      # data/locataires_seed.csv
 *   npm run suivi:import -- --file autre.csv
 *   npm run suivi:import -- --dry-run         # vérifie le CSV sans rien écrire
 *
 * Le script crée les locataires, les box et les contrats — et rien d'autre.
 * Il ne touche jamais aux tables du back-office (customers/units/contracts) ni
 * aux règlements déjà pointés. Relancé deux fois de suite, il ne crée aucun
 * doublon : chaque entité est retrouvée sur sa clé naturelle.
 *
 * Nécessite NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (les tables
 * sr_* sont protégées par RLS et réservées au personnel).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { parseSeedCsv, type SeedData } from "../lib/suivi/seed-csv";
import type { Database } from "../types/database";

type Args = { file: string; dryRun: boolean };

function lisArgs(argv: string[]): Args {
  const args: Args = { file: "data/locataires_seed.csv", dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--file" && argv[i + 1]) {
      args.file = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--dry-run") {
      args.dryRun = true;
    }
  }
  return args;
}

function resume(seed: SeedData): void {
  const sansBox = seed.contrats.filter((c) => c.box_cle === null).length;
  console.log(`  locataires : ${seed.locataires.length}`);
  console.log(`  box identifiés : ${seed.box.length}`);
  console.log(`  contrats : ${seed.contrats.length} (dont ${sansBox} sans box identifié)`);
  console.log(`  loyers mensuels : ${seed.totalLoyers.toLocaleString("fr-FR")} €`);
}

/** Clé naturelle d'un locataire côté base, alignée sur celle du CSV. */
function cleLocataireBase(l: {
  nom: string;
  telephone: string | null;
  email: string | null;
}): string {
  return [l.nom, l.telephone ?? "", l.email ?? ""].join("|").toLocaleLowerCase("fr");
}

async function main(): Promise<void> {
  const { file, dryRun } = lisArgs(process.argv.slice(2));
  const chemin = resolve(process.cwd(), file);

  console.log(`Lecture de ${chemin}`);
  const seed = parseSeedCsv(readFileSync(chemin, "utf-8"));
  resume(seed);

  if (dryRun) {
    console.log("\n--dry-run : aucune écriture en base.");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (voir .env.local)."
    );
  }

  const supabase = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // --- Locataires -----------------------------------------------------------
  const { data: locatairesExistants, error: erreurLecture } = await supabase
    .from("sr_locataires")
    .select("id, nom, telephone, email");
  if (erreurLecture) throw new Error(erreurLecture.message);

  const idParCleLocataire = new Map<string, string>();
  for (const l of locatairesExistants ?? []) {
    idParCleLocataire.set(cleLocataireBase(l), l.id);
  }

  const nouveauxLocataires = seed.locataires.filter((l) => !idParCleLocataire.has(l.cle));
  if (nouveauxLocataires.length > 0) {
    const { data, error } = await supabase
      .from("sr_locataires")
      .insert(
        nouveauxLocataires.map((l) => ({
          nom: l.nom,
          societe: l.societe,
          telephone: l.telephone,
          email: l.email,
          date_entree: l.date_entree,
          actif: true,
        }))
      )
      .select("id, nom, telephone, email");
    if (error) throw new Error(`locataires : ${error.message}`);
    for (const l of data ?? []) idParCleLocataire.set(cleLocataireBase(l), l.id);
  }
  console.log(`\nLocataires : ${nouveauxLocataires.length} créés, ${
    seed.locataires.length - nouveauxLocataires.length
  } déjà présents.`);

  // --- Box ------------------------------------------------------------------
  // (batiment, numero) porte un index unique : un upsert suffit et reste
  // idempotent, y compris si la surface a été corrigée dans le CSV.
  const idParCleBox = new Map<string, string>();
  if (seed.box.length > 0) {
    const { data, error } = await supabase
      .from("sr_box")
      .upsert(
        seed.box.map((b) => ({
          numero: b.numero,
          batiment: b.batiment,
          surface_m2: b.surface_m2,
        })),
        { onConflict: "batiment,numero" }
      )
      .select("id, numero, batiment");
    if (error) throw new Error(`box : ${error.message}`);
    for (const b of data ?? []) {
      idParCleBox.set(`${b.batiment}|${b.numero}`.toLocaleLowerCase("fr"), b.id);
    }
  }
  console.log(`Box : ${idParCleBox.size} présents en base.`);

  // --- Contrats -------------------------------------------------------------
  const { data: contratsExistants, error: erreurContrats } = await supabase
    .from("sr_contrats")
    .select("id, locataire_id, box_id");
  if (erreurContrats) throw new Error(erreurContrats.message);

  // Un contrat est identifié par son locataire et son box. Les contrats dont
  // le box reste à établir partagent la clé « locataire + aucun box » : le
  // CSV n'en contient qu'un par locataire, on le vérifie plus bas.
  const contratsConnus = new Set(
    (contratsExistants ?? []).map((c) => `${c.locataire_id}|${c.box_id ?? "sans-box"}`)
  );

  const aInserer: Array<{
    locataire_id: string;
    box_id: string | null;
    loyer_mensuel_eur: number;
    date_debut: string | null;
    remarque: string | null;
  }> = [];
  const clesVues = new Set<string>();

  for (const contrat of seed.contrats) {
    const locataireId = idParCleLocataire.get(contrat.locataire_cle);
    if (!locataireId) throw new Error(`Locataire introuvable pour ${contrat.cle}`);

    const boxId = contrat.box_cle ? idParCleBox.get(contrat.box_cle) ?? null : null;
    const cle = `${locataireId}|${boxId ?? "sans-box"}`;

    if (clesVues.has(cle)) {
      throw new Error(
        `Le CSV contient deux contrats indistinguables (même locataire, même box) : ${contrat.cle}. ` +
          `Renseignez le numéro de box pour les départager avant d'importer.`
      );
    }
    clesVues.add(cle);

    if (contratsConnus.has(cle)) continue;

    aInserer.push({
      locataire_id: locataireId,
      box_id: boxId,
      loyer_mensuel_eur: contrat.loyer_mensuel_eur,
      date_debut: contrat.date_debut,
      remarque: contrat.remarque,
    });
  }

  if (aInserer.length > 0) {
    const { error } = await supabase.from("sr_contrats").insert(aInserer);
    if (error) throw new Error(`contrats : ${error.message}`);
  }
  console.log(`Contrats : ${aInserer.length} créés, ${
    seed.contrats.length - aInserer.length
  } déjà présents.`);

  // --- Vérification ---------------------------------------------------------
  const { data: apres, error: erreurVerif } = await supabase
    .from("sr_contrats")
    .select("loyer_mensuel_eur")
    .is("date_fin", null);
  if (erreurVerif) throw new Error(erreurVerif.message);

  const total = (apres ?? []).reduce((somme, c) => somme + c.loyer_mensuel_eur, 0);
  console.log(
    `\nEn base après import : ${apres?.length ?? 0} contrats actifs, ${total.toLocaleString(
      "fr-FR"
    )} € de loyers mensuels.`
  );

  if ((apres?.length ?? 0) !== seed.contrats.length || total !== seed.totalLoyers) {
    console.warn(
      `\n⚠ L'état en base (${apres?.length ?? 0} contrats / ${total} €) diffère du CSV ` +
        `(${seed.contrats.length} contrats / ${seed.totalLoyers} €). ` +
        `C'est normal si la base contient déjà des contrats saisis à la main.`
    );
  }
}

main().catch((erreur) => {
  console.error(`\nÉchec de l'import : ${erreur instanceof Error ? erreur.message : erreur}`);
  process.exit(1);
});
