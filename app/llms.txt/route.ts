// /llms.txt — la fiche du centre en texte brut, pour les assistants IA
// (ChatGPT, Claude, Perplexity, Gemini…). Même source que les pages : les prix
// et les disponibilités sont lus en base, jamais recopiés à la main.

import { ADRESSE_LIGNE, LIBELLE_NIVEAU, SITE, volumeM3 } from "@/lib/site/config";
import { lireOffre } from "@/lib/site/data";
import { questions } from "@/lib/site/faq";
import { formatPrix, formatSurface } from "@/lib/site/offre";

export const revalidate = 300;

const ETAT = { libre: "disponible", complet: "complet (liste d'attente)", inconnu: "sur demande" };

export async function GET() {
  const offre = await lireOffre();
  const date = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date());

  const grille = offre.lignes
    .map(
      (l) =>
        `- ${formatSurface(l.surface)} (${volumeM3(l.surface)} m³), ${LIBELLE_NIVEAU[
          l.niveau
        ].toLowerCase()} : ${formatPrix(l.prix)} par mois — ${
          l.etat === "libre" ? `${l.nombre} ${ETAT.libre}${l.nombre > 1 ? "s" : ""}` : ETAT[l.etat]
        }`
    )
    .join("\n");

  const resume =
    offre.etatGlobal === "libre"
      ? `${offre.totalLibres} box à louer en ce moment.`
      : offre.etatGlobal === "complet"
        ? "Centre complet en ce moment ; une liste d'attente est ouverte."
        : "Disponibilités à confirmer par téléphone.";

  const texte = `# LG BOX

> Location de box de stockage et garde-meubles en self-stockage à Guengat (Finistère), à 10 minutes de Quimper. Box en dur de 2 à 20 m², accès 24h/24 et 7j/7, sans caution, sans bail, préavis de ${SITE.preavisJours} jours.

Informations à jour au ${date} (heure de Paris). Les tarifs et les disponibilités ci-dessous sont lus dans le registre du centre.

## L'essentiel

- Activité : location de box de stockage (self-stockage, garde-meubles) pour particuliers et professionnels
- Adresse : ${SITE.nom}, ${ADRESSE_LIGNE}, France
- Téléphone et SMS : ${SITE.telephone} (${SITE.telephoneE164})
- E-mail : ${SITE.email}
- Accès aux box : 24h/24, 7j/7, toute l'année, avec clés remises au locataire
- Surfaces : de 2 à 20 m², hauteur sous plafond ${SITE.hauteurSousPlafond}
- Conditions : sans caution, sans bail, sans frais de dossier, sans durée minimale ; préavis de ${SITE.preavisJours} jours
- Sécurité : ${SITE.cameras} caméras, alarme, détection incendie, volets roulants métalliques
- Équipement : étagères et éclairage dans chaque box, chariot et diable prêtés, grand parking, toilettes
- Bâtiment : anciens logements de la Marine nationale (ancienne base de Guengat), construits en dur, doubles cloisons, secs et aérés
- Secteur desservi : ${SITE.villesDesservies.map((v) => v.nom).join(", ")}, Cap-Sizun, pays bigouden
- Réservation : par téléphone, SMS ou e-mail ; pas de paiement en ligne

## Tarifs mensuels et disponibilités

${resume}

${grille}

## Pages

- [Accueil](${SITE.url}/) : présentation et disponibilités du jour
- [Tarifs et disponibilités](${SITE.url}/tarifs) : grille complète par surface et par niveau
- [Les box](${SITE.url}/box-stockage) : caractéristiques, sécurité, photos
- [Garde-meubles à Quimper](${SITE.url}/garde-meuble-quimper) : usages, durée, choix de la surface
- [Questions fréquentes](${SITE.url}/faq)
- [Contact et accès](${SITE.url}/contact) : réservation, adresse, itinéraire

## Questions fréquentes

${questions(offre)
  .map(({ q, r }) => `### ${q}\n\n${r}`)
  .join("\n\n")}
`;

  return new Response(texte, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
