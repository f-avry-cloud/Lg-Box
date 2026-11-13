import { BoutonReserver } from "@/components/site/bouton-reserver";
import { ACCES_NIVEAU, LIBELLE_NIVEAU, contenance, volumeM3, type Niveau } from "@/lib/site/config";
import { formatPrix, type Etat, type LigneOffre, type Offre } from "@/lib/site/offre";

const STATUT: Record<Etat, (n: number) => string> = {
  libre: (n) => (n > 1 ? `${n} box libres` : "1 box libre"),
  complet: () => "Complet",
  inconnu: () => "Sur demande",
};

function Porte({ ligne }: { ligne: LigneOffre }) {
  const surface = String(ligne.surface);
  return (
    <li>
      <article className={`s-porte s-porte--${ligne.etat}`}>
        <div className="s-porte__linteau">
          <span className="s-porte__plaque">
            {surface.replace(".", ",")}
            <small>m²</small>
          </span>
          <span className="s-porte__volume">{volumeM3(ligne.surface)} m³</span>
        </div>
        <div className="s-porte__rideau" aria-hidden="true" />
        <div className="s-porte__corps">
          <p className="s-porte__statut">
            <span className={`s-voyant s-voyant--${ligne.etat}`} aria-hidden="true" />
            {STATUT[ligne.etat](ligne.nombre)}
          </p>
          <p className="s-porte__prix">
            {formatPrix(ligne.prix)} <small>par mois</small>
          </p>
          <p className="s-porte__pour">{contenance(ligne.surface)}</p>
          {ligne.etat === "complet" ? (
            <BoutonReserver petit surface={surface} niveau={ligne.niveau} mode="prevenir">
              Me prévenir
            </BoutonReserver>
          ) : (
            <BoutonReserver petit surface={surface} niveau={ligne.niveau}>
              Réserver
            </BoutonReserver>
          )}
        </div>
      </article>
    </li>
  );
}

export function resumeEtat(offre: Offre): string {
  if (offre.etatGlobal === "inconnu") return "Disponibilités confirmées par téléphone";
  if (offre.etatGlobal === "complet") return "Complet aujourd'hui, liste d'attente ouverte";
  return offre.totalLibres > 1
    ? `${offre.totalLibres} box à louer aujourd'hui`
    : "1 box à louer aujourd'hui";
}

/**
 * Le tableau des portes : un volet roulant par surface. Volet levé, le box est
 * à louer ; volet baissé, il est pris et le bouton inscrit en liste d'attente.
 */
export function Portes({ offre, miseAJour }: { offre: Offre; miseAJour: string }) {
  const niveaux: Niveau[] = ["rdc", "etage"];
  return (
    <div>
      {niveaux.map((niveau) => {
        const lignes = offre.lignes.filter((l) => l.niveau === niveau);
        if (lignes.length === 0) return null;
        return (
          <section className="s-rangee" key={niveau} aria-label={LIBELLE_NIVEAU[niveau]}>
            <div className="s-rangee__titre">
              <h3>{LIBELLE_NIVEAU[niveau]}</h3>
              <span>{ACCES_NIVEAU[niveau]}</span>
            </div>
            <ul className="s-portes">
              {lignes.map((l) => (
                <Porte key={`${l.niveau}-${l.surface}`} ligne={l} />
              ))}
            </ul>
          </section>
        );
      })}
      <p className="s-maj">
        {offre.etatGlobal === "inconnu"
          ? "Les disponibilités changent d'un jour à l'autre : un appel suffit pour savoir ce qui est libre."
          : `Disponibilités tenues à jour par le centre. Dernière lecture : ${miseAJour}.`}{" "}
        Tarifs mensuels, sans caution ni frais de dossier.
      </p>
    </div>
  );
}

export function EtatGlobal({ offre }: { offre: Offre }) {
  return (
    <p className="s-etat">
      <span className={`s-voyant s-voyant--${offre.etatGlobal}`} aria-hidden="true" />
      {resumeEtat(offre)}
    </p>
  );
}

/** « 13 novembre à 10 h 12 », à l'heure de Paris. */
export function horodatage(date = new Date()): string {
  const jour = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  }).format(date);
  const heure = new Intl.DateTimeFormat("fr-FR", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  })
    .format(date)
    .replace(":", " h ");
  return `${jour} à ${heure}`;
}
