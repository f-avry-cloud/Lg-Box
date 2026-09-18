/* =========================================================================
   Toutes les données éditoriales du site public LG BOX.
   Un seul endroit à modifier pour changer un prix, un texte ou une photo.
   ========================================================================= */

export const site = {
  nom: "LG BOX",
  baseline: "Location de box & garde-meubles — Quimper, Finistère sud",
  origin: "https://www.lg-box.fr",
  tel: "06 38 64 97 35",
  telHref: "tel:+33638649735",
  email: "info@lg-box.fr",
  adresse: "ZA de Kergueff",
  cp: "29180",
  ville: "Guengat",
  entite: "SCI Marine — LG BOX",
  siret: "433 958 071 00014",
  lat: 47.9925,
  lon: -4.2261,
  mapsQuery: "LG+BOX+ZA+de+Kergueff+29180+Guengat",
  nbBox: 65,
  hauteur: "3,20 m",
  cameras: 35,
  prixMin: 45,
  prixMax: 200,
  preavis: "8 jours",
};

/* Faits chiffrés du héros et des bandeaux. */
export const chiffres = [
  { valeur: "65", suffixe: "", label: "box dans un bâtiment fermé" },
  { valeur: "2", suffixe: " → 20 m²", label: "surfaces disponibles", fixe: true },
  { valeur: "24", suffixe: "h/24", label: "accès libre, 7j/7", fixe: true },
  { valeur: "45", suffixe: " €", label: "le premier tarif, par mois" },
];

export const bandeau = [
  "Sans engagement de durée",
  "Ni caution, ni frais de dossier",
  "Box sain, sec et en dur",
  "35 caméras de vidéosurveillance",
  "Accès 24h/24 et 7j/7",
  "À 10 minutes de Quimper",
  "Préavis de 8 jours seulement",
  "Diables et chariots prêtés",
];

/* Les six arguments de la page d’accueil. */
export const atouts = [
  {
    ico: "shield",
    titre: "Du solide, pas de la tôle",
    texte:
      "Chaque box est un ancien appartement de l’ancienne base de la Marine nationale, bâti en dur à double paroi pour loger les militaires. Sain, propre, sec — sans équivalent dans la région.",
  },
  {
    ico: "key",
    titre: "Vos clés, vos horaires",
    texte:
      "Un jeu de clés vous est remis : vous entrez et sortez comme vous voulez, 24h/24 et 7j/7, en libre-service et sans rendez-vous. Chaque porte est numérotée, vous seul accédez à votre box.",
  },
  {
    ico: "camera",
    titre: "Surveillé de près",
    texte:
      "Bâtiment fermé, 35 caméras intérieures et extérieures, télésurveillance contre les intrusions, détecteurs et alarme incendie. Vos affaires dorment tranquilles.",
  },
  {
    ico: "box",
    titre: "Déjà équipé",
    texte:
      "Étagères de rangement, volet roulant en aluminium, éclairage : votre box est prêt à ranger le jour où vous arrivez. Et 3,20 m de hauteur sous plafond à exploiter.",
  },
  {
    ico: "free",
    titre: "Zéro engagement",
    texte:
      "Pas de durée minimale, pas de caution, pas de frais de dossier. Vous partez quand vous voulez en prévenant 8 jours avant. Le mois commencé est le seul engagement.",
  },
  {
    ico: "truck",
    titre: "Facile à charger",
    texte:
      "Grand parking, accès de plain-pied pour les camions de déménagement et les remorques, diables et chariots prêtés à vous comme à vos déménageurs.",
  },
];

/* Surfaces : le curseur de la page d’accueil et la grille de tarifs.
   Les prix sont des estimations issues de la grille publique 45 € → 200 €
   TTC/mois ; le tarif exact dépend du rez-de-chaussée ou de l’étage. */
export const surfaces = [
  { m2: 2,  prix: 45,  fits: ["10 à 15 cartons", "Vélos, skis, pneus", "Archives d’un bureau"] },
  { m2: 4,  prix: 60,  fits: ["Un studio meublé", "Électroménager", "Matériel de sport"] },
  { m2: 6,  prix: 80,  fits: ["Le contenu d’un T1", "Canapé, lit, armoire", "Cartons d’un déménagement"] },
  { m2: 9,  prix: 105, fits: ["Le contenu d’un T2", "Un mobilier complet", "Le stock d’un artisan"] },
  { m2: 12, prix: 130, fits: ["Le contenu d’un T3", "Salon + deux chambres", "Palettes de marchandises"] },
  { m2: 15, prix: 155, fits: ["Le contenu d’un T4", "Un déménagement entier", "Stock professionnel"] },
  { m2: 20, prix: 200, fits: ["Une maison complète", "Le matériel d’une entreprise", "3,20 m de hauteur en prime"] },
];

export const tarifsVedette = 9;

/* Étapes de la location. */
export const etapes = [
  { titre: "Vous appelez", texte: "Un coup de fil au 06 38 64 97 35 ou un mail : on vous dit tout de suite quelle surface est libre et à quel prix." },
  { titre: "On visite ensemble", texte: "Vous passez voir le bâtiment et le box. Rien ne remplace le fait de toucher les murs et de mesurer la porte." },
  { titre: "Vous signez, on vous remet les clés", texte: "Un contrat simple, sans caution ni frais de dossier. Le box est à vous le jour même." },
  { titre: "Vous allez et venez", texte: "24h/24, 7j/7, avec les diables et les chariots du centre. Vous partez quand vous voulez, préavis de 8 jours." },
];

/* Avis publiés sur le site actuel. */
export const avis = [
  {
    texte: "Box très sécurisé, très propre. Personne très aimable à l’écoute et très rigoureux. Je suis restée 3 ans et je recommande à 100 %.",
    auteur: "Cliente particulière",
  },
  {
    texte: "Propreté des locaux, box sain et sec, sécurité, accès facile, tout est bien pensé et organisé. Merci au propriétaire toujours à l’écoute. Je recommande vivement !",
    auteur: "Client particulier",
  },
  {
    texte: "Excellentes prestations : propreté et entretien des locaux, sécurité, accès très facile aux box, matériel à disposition pour transporter les meubles et cartons.",
    auteur: "Client professionnel",
  },
  {
    texte: "Excellent accueil du propriétaire, box sain et sec, très facile d’accès. À recommander.",
    auteur: "Client particulier",
  },
];

/* Questions fréquentes — reprises de la page FAQ actuelle. */
export const faq = [
  {
    q: "Quels sont vos tarifs de location ?",
    r: "Le premier tarif est de 45 €/mois pour un espace de stockage de 2 m². Au-delà, comptez de 45 € à 200 € TTC par mois selon la surface louée. Deux grilles coexistent : le tarif rez-de-chaussée, avec un accès de plain-pied, et le tarif étage, avec un accès par escalier — un peu moins cher à surface égale.",
  },
  {
    q: "Y a-t-il une durée minimale de location ?",
    r: "Non. Il n’y a aucune durée minimale pour louer votre espace de stockage : votre seule obligation est de respecter un préavis de 8 jours pour informer le propriétaire de votre départ.",
  },
  {
    q: "Comment résilier mon contrat ?",
    r: "Vous pouvez résilier le contrat de location à tout moment, en respectant un préavis de 8 jours. Un appel ou un courriel suffit à lancer la démarche.",
  },
  {
    q: "Faut-il verser une caution ou des frais de dossier ?",
    r: "Non. Le centre de stockage ne vous demandera aucune caution, et il n’y a pas de frais de dossier.",
  },
  {
    q: "Dois-je assurer les biens entreposés ?",
    r: "Oui, il est demandé au client de souscrire une assurance pour protéger ses biens. Une extension de votre contrat habitation suffit le plus souvent.",
  },
  {
    q: "Qui peut entrer dans mon box ?",
    r: "Vous seul. Les clés vous sont remises à la signature, chaque porte de box est numérotée et aucune autre personne n’est autorisée à pénétrer dans le bâtiment.",
  },
  {
    q: "À quelles heures puis-je accéder à mon box ?",
    r: "Quand vous voulez : l’accès est libre et gratuit 24h/24 et 7j/7, en libre-service, sans rendez-vous ni horaire d’ouverture à respecter.",
  },
  {
    q: "Mes affaires craignent-elles l’humidité ?",
    r: "Les box de LG BOX sont d’anciens appartements militaires bâtis en dur, à double paroi, secs et aérés. Tous les box loués sont solides, propres et sans humidité — il n’existe pas d’équivalent dans la région.",
  },
  {
    q: "Quelles surfaces proposez-vous ?",
    r: "Près de 65 box, de 2 m² à 20 m², avec une hauteur de 3,20 m que l’on peut exploiter en superposant les cartons et le mobilier. Le bâtiment est fermé et sécurisé : ce ne sont pas des containers posés sur un parking.",
  },
  {
    q: "Le site est-il sécurisé ?",
    r: "Le bâtiment est fermé et équipé de 35 caméras de vidéosurveillance intérieures et extérieures, d’une télésurveillance contre les intrusions, de détecteurs et d’une alarme incendie.",
  },
  {
    q: "Avez-vous du matériel pour charger et décharger ?",
    r: "Oui : diables et chariots de manutention sont mis à la disposition des clients comme des déménageurs, et le grand parking permet aux camions de s’approcher au plus près des portes.",
  },
  {
    q: "Où se trouve exactement LG BOX ?",
    r: "ZA de Kergueff, 29180 Guengat — sur l’ancienne base de la Marine nationale, à 10 minutes de Quimper et à 15 minutes du centre de Douarnenez, en Finistère sud.",
  },
  {
    q: "Louez-vous aux professionnels ?",
    r: "Oui. Le service s’adresse aux particuliers comme aux professionnels : déménagement, stockage, entreposage de stock, garde-meubles et archivage.",
  },
  {
    q: "Comment réserver un box ?",
    r: "Un appel au 06 38 64 97 35 ou un message à info@lg-box.fr. On vous indique les surfaces libres, on visite, et le box peut être à vous le jour même.",
  },
];

/* Photothèque : déposez les fichiers dans site/static/images/ sous ces noms.
   Tant qu’une photo est absente, le bloc affiche un dégradé travaillé plutôt
   qu’une image cassée. */
export const photos = {
  batiment: { file: "batiment-lg-box-guengat.jpg", alt: "Le bâtiment LG BOX, ancienne base de la Marine nationale à Guengat près de Quimper", legende: "Le bâtiment, ZA de Kergueff à Guengat" },
  couloir: { file: "couloir-box-stockage.jpg", alt: "Couloir intérieur desservant les box de stockage LG BOX à Guengat", legende: "Des couloirs larges, éclairés, au sec" },
  interieur: { file: "box-interieur-etageres.jpg", alt: "Intérieur d’un box de stockage LG BOX équipé d’étagères de rangement", legende: "Étagères de rangement livrées avec le box" },
  volet: { file: "volet-roulant-aluminium-box.jpg", alt: "Volet roulant en aluminium fermant un box de garde-meubles LG BOX", legende: "Volet roulant aluminium et porte numérotée" },
  parking: { file: "parking-acces-camion.jpg", alt: "Parking et accès camion de déménagement devant les box LG BOX à Guengat", legende: "Le camion se gare devant la porte" },
  securite: { file: "videosurveillance-securite.jpg", alt: "Caméra de vidéosurveillance du centre de stockage LG BOX", legende: "35 caméras, intérieur et extérieur" },
  manutention: { file: "materiel-manutention-diable.jpg", alt: "Diables et chariots de manutention prêtés aux clients LG BOX", legende: "Diables et chariots à disposition" },
  cartons: { file: "box-2m2-stockage-cartons.jpg", alt: "Box de 2 m² rempli de cartons de déménagement chez LG BOX", legende: "2 m², déjà de quoi vider un garage" },
};

/* Arborescence : les URL existantes sont conservées à l’identique pour ne
   perdre ni les positions acquises ni les liens entrants. */
export const nav = [
  { url: "index.html", court: "Accueil", titre: "LG BOX, location de box à Guengat" },
  { url: "location-box-quimper-finistere.html", court: "Le centre", titre: "Le centre de stockage" },
  { url: "garde-meuble-quimper-finistere-sud.html", court: "Garde-meubles", titre: "Garde-meubles Quimper" },
  { url: "location-box-pas-cher-quimper-29.html", court: "Tarifs", titre: "Tarifs et surfaces" },
  { url: "garde-meubles-quimper-avis.html", court: "Avis", titre: "Avis clients" },
  { url: "faq.html", court: "FAQ", titre: "Questions fréquentes" },
  { url: "location-box-quimper-contact.html", court: "Contact", titre: "Nous contacter" },
];

export const navSecondaire = [
  { url: "garde-meuble-box-stockage-douarnenez.html", court: "Douarnenez", titre: "Box de stockage Douarnenez" },
  { url: "location-box-quimper-adresse.html", court: "Adresse & accès", titre: "Adresse et itinéraire" },
  { url: "location-box-quimper-plan-site.html", court: "Plan du site", titre: "Plan du site" },
  { url: "location-box-quimper-mentions.html", court: "Mentions légales", titre: "Mentions légales" },
];
