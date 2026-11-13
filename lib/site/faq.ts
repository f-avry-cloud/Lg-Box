// Questions fréquentes. Les réponses qui citent un prix ou une disponibilité
// sont composées à partir de l'offre du moment : la FAQ, les données
// structurées et /llms.txt disent ainsi toujours la même chose que la grille.

import { ADRESSE_LIGNE, SITE } from "@/lib/site/config";
import { formatPrix, formatSurface, type Offre } from "@/lib/site/offre";

export type Question = { q: string; r: string };

export function questions(offre: Offre): Question[] {
  const rdc = offre.lignes.filter((l) => l.niveau === "rdc" && l.dansLaGrille);
  const etage = offre.lignes.filter((l) => l.niveau === "etage" && l.dansLaGrille);
  const premier = rdc[0] ?? offre.lignes[0];
  const dernier = rdc[rdc.length - 1] ?? offre.lignes[offre.lignes.length - 1];

  const prix =
    premier && dernier
      ? `La location commence à ${formatPrix(premier.prix)} par mois pour un box de ${formatSurface(
          premier.surface
        )} et va jusqu'à ${formatPrix(dernier.prix)} par mois pour ${formatSurface(
          dernier.surface
        )} au rez-de-chaussée.${
          etage.length
            ? ` Les box à l'étage, accessibles par escalier, sont moins chers : à partir de ${formatPrix(
                etage[0].prix
              )} par mois pour ${formatSurface(etage[0].surface)}.`
            : ""
        } Il n'y a ni caution, ni frais de dossier.`
      : "Les tarifs sont communiqués par téléphone. Il n'y a ni caution, ni frais de dossier.";

  const libres = offre.lignes.filter((l) => l.etat === "libre");
  const dispo =
    offre.etatGlobal === "libre"
      ? `Oui. ${
          libres.length
            ? `En ce moment : ${libres
                .map(
                  (l) =>
                    `${l.nombre} box de ${formatSurface(l.surface)} ${
                      l.niveau === "etage" ? "à l'étage" : "au rez-de-chaussée"
                    } à ${formatPrix(l.prix)} par mois`
                )
                .join(", ")}.`
            : `${offre.totalLibres} box est à louer en ce moment.`
        } Les disponibilités affichées sur le site viennent directement du registre du centre. Pour les autres surfaces, vous pouvez vous inscrire sur la liste d'attente.`
      : offre.etatGlobal === "complet"
        ? "Le centre est complet aujourd'hui. Des box se libèrent régulièrement, avec un préavis de 8 jours : laissez vos coordonnées par téléphone, SMS ou e-mail et vous serez prévenu dès qu'une surface qui vous convient se libère."
        : `Les disponibilités changent d'un jour à l'autre. Appelez le ${SITE.telephone} ou envoyez un SMS : on vous dit tout de suite ce qui est libre.`;

  return [
    { q: "Combien coûte la location d'un box chez LG BOX ?", r: prix },
    { q: "Y a-t-il un box disponible en ce moment ?", r: dispo },
    {
      q: "Quelles surfaces de box proposez-vous ?",
      r: `Des box de 2 à 20 m², tous avec ${SITE.hauteurSousPlafond} de hauteur sous plafond, soit de 6 à 64 m³ environ. Un 2 m² suffit pour des cartons ou des vélos, un 8 m² accueille le contenu d'un T2, un 12 m² celui d'un T3, et un 18 à 20 m² une maison entière.`,
    },
    {
      q: "Y a-t-il une caution, un bail ou une durée minimale ?",
      r: `Non. Vous signez un contrat de location simple, sans caution, sans bail et sans frais de dossier. Vous arrêtez quand vous voulez en prévenant ${SITE.preavisJours} jours avant.`,
    },
    {
      q: "Quand puis-je accéder à mon box ?",
      r: "Quand vous voulez : 24 heures sur 24 et 7 jours sur 7, toute l'année. Vos clés vous sont remises à la signature du contrat et vous venez sans rendez-vous.",
    },
    {
      q: "Comment réserver un box ?",
      r: `Par téléphone ou par SMS au ${SITE.telephone}, ou par e-mail à ${SITE.email}. On vous confirme la surface libre et son prix, vous pouvez visiter, puis vous signez le contrat et repartez avec vos clés. Aucun paiement en ligne n'est demandé.`,
    },
    {
      q: "Mes affaires sont-elles en sécurité ?",
      r: `Le bâtiment est fermé et surveillé en continu par ${SITE.cameras} caméras, à l'intérieur comme sur le parking, avec alarme et détection incendie. Chaque box est une pièce fermée à clé, dont les fenêtres sont protégées par des volets roulants métalliques.`,
    },
    {
      q: "Les box sont-ils secs et sains ?",
      r: "Oui. Ce ne sont ni des conteneurs ni des cloisons en tôle : les box sont aménagés dans d'anciens logements de la Marine nationale, construits en dur, avec des doubles cloisons. Ils sont secs, aérés et éclairés.",
    },
    {
      q: "Où se trouve LG BOX ?",
      r: `${ADRESSE_LIGNE}, sur l'ancienne base de Guengat, à 10 minutes de Quimper en direction de Douarnenez. Le centre sert aussi Douarnenez, Châteaulin, Pont-l'Abbé, Audierne, le Cap-Sizun et la presqu'île de Crozon.`,
    },
    {
      q: "Le centre prête-t-il du matériel pour décharger ?",
      r: "Oui : un chariot et un diable sont à votre disposition gratuitement. Le parking est grand, les camions de déménagement et les remorques s'y garent sans difficulté, et des toilettes sont accessibles aux clients. Chaque box est livré avec des étagères.",
    },
    {
      q: "LG BOX s'adresse-t-il aussi aux professionnels ?",
      r: "Oui. Artisans, commerçants et entreprises y entreposent leur stock, leur matériel ou leurs archives, avec le même contrat sans engagement que les particuliers.",
    },
    {
      q: "Que peut-on stocker dans un box ?",
      r: "Des meubles, des cartons, de l'électroménager, des archives, du matériel de sport ou de chantier, un stock de marchandises. Comme dans tout garde-meubles, les produits dangereux, inflammables ou périssables n'ont pas leur place dans un box.",
    },
  ];
}
