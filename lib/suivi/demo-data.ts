// Jeu de données de démonstration de l'application « Suivi des règlements ».
//
// Ce fichier est GÉNÉRÉ à partir de data/locataires_demo.csv :
//   npm run suivi:demo-data
//
// Il reprend la structure exacte du fichier réel locataires_seed.csv — mêmes
// box, mêmes bâtiments, mêmes surfaces, mêmes loyers, mêmes dates d'entrée,
// même locataire à deux box, mêmes 23 « box à identifier » — mais les noms
// sont des pseudonymes et les coordonnées sont des valeurs réservées à la
// fiction (plage ARCEP +33 6 39 98 xx xx, domaine example.org). Le dépôt
// étant public, aucune donnée personnelle réelle n'y est versionnée : le
// vrai CSV se dépose en local dans data/locataires_seed.csv, que le mode
// démo utilise en priorité s'il le trouve.

export const DEMO_CSV = `nom,societe,box_numero,batiment,surface_m2,loyer_mensuel_eur,date_entree,telephone,email,remarque
ABADIE Alain,,2,RDJ,8,110,2023-03-01,+33639980000,abadie.0@example.org,
ABIVEN Anaïs,,,,,120,2024-05-13,+33639980049,abiven.49@example.org,box à identifier
ANDRIEU Armelle,,4,Bat II,18,180,2026-06-01,+33639980026,andrieu.26@example.org,
BERTIN Brigitte,,8,Etage,5,90,2023-07-01,+33639980001,bertin.1@example.org,
BOSSER Benoît,,4,RDJ,8,120,2025-05-15,+33639980050,bosser.50@example.org,
BOURGEOIS Bertrand,,,,,120,2024-05-01,+33639980027,bourgeois.27@example.org,box à identifier
CADIOU Christelle,,8,Bat I,8,150,2019-09-01,+33639980028,cadiou.28@example.org,
CHAUVET Cédric,,,,,150,2019-11-01,+33639980002,chauvet.2@example.org,box à identifier
CORNIC Camille,,5,Etage,5,90,2019-12-15,+33639980051,,
DANIEL Dominique,,11,Bat III,12,140,2021-04-01,+33639980052,daniel.52@example.org,
DELAUNAY Delphine,,8,Bat III,18,180,2026-07-01,+33639980003,delaunay.3@example.org,
DENIS Damien,,1,Etage,12,120,2021-12-01,+33639980029,denis.29@example.org,
EOZENOU Erwan,,9,Bat II,12,120,2025-08-01,+33639980053,,
ESTEVE Émile,,,,,140,2022-09-19,,esteve.4@example.org,box à identifier
EVRARD Élodie,,10,Bat III,12,140,,+33639980030,evrard.30@example.org,
FAVRE Franck,,10,Etage,5,90,2025-02-01,+33639980031,favre.31@example.org,
FLOCH Florence,,5,RDJ,5,100,2025-09-01,+33639980054,floch.54@example.org,
FOUCHER Fabien,,,,,120,2018-04-01,+33639980005,foucher.5@example.org,box à identifier
GARNIER Gaëlle,,,,,170,2019-09-01,+33639980006,,box à identifier
GOASDOUE Gilles,,2A,Bat I,12,140,2025-03-01,+33639980055,goasdoue.55@example.org,
GUILLOU Gwenaël,,11,Bat I,12,140,2025-09-15,+33639980032,guillou.32@example.org,
HAMON Hélène,Kerlann Services,,,,150,2019-10-01,+33639980033,hamon.33@example.org,box à identifier
HELIAS Hugues,,,,,150,2024-02-01,+33639980056,helias.56@example.org,box à identifier
HERVE Hervé,,4,Bat I,12,140,2026-02-01,+33639980007,herve.7@example.org,
IMBERT Isabelle,,,,,270,2023-07-01,+33639980008,imbert.8@example.org,second box à identifier (contrat portant sur 2 box)
INIZAN Ivan,,,,,130,2020-06-01,+33639980034,inizan.34@example.org,box à identifier
JAOUEN Irène,,14,Bat I,12,140,2017-11-01,+33639980057,jaouen.57@example.org,
JEGOU Josiane,,,,,80,2024-05-01,+33639980035,jegou.35@example.org,box à identifier
JOUBERT Julien,,2C,Bat I,8,120,2024-08-01,+33639980009,,
KERBRAT Joël,,1,RDJ,12,120,2025-01-01,+33639980058,kerbrat.58@example.org,
KERNEIS Katell,,22,Bat III,5,100,2025-10-01,+33639980036,kerneis.36@example.org,
KERVELLA Karine,,3,Etage,6,100,2022-03-01,+33639980010,kervella.10@example.org,
LAMBERT Loïc,,1,Bat IV,12,140,2024-05-01,+33639980011,lambert.11@example.org,
LOZACH Ludovic,,,,,180,2024-07-01,+33639980037,lozach.37@example.org,box à identifier
MAHE Marion,,2,Bat III,15,150,2021-05-04,+33639980038,mahe.38@example.org,
MARCHAND Maëlle,,,,,180,2023-10-31,+33639980012,marchand.12@example.org,box à identifier
MOAL Morgane,,,,,200,,,moal.59@example.org,box à identifier
NEDELEC Noémie,,,,,170,2019-12-20,+33639980039,nedelec.39@example.org,box à identifier
NICOLAS Nathan,,,,,220,,,nicolas.60@example.org,box à identifier
NOEL Nicolas,,13,Etage,18,160,2026-01-01,+33639980013,noel.13@example.org,
OLIVIER Odile,,1,Bat III,18,180,2023-11-01,+33639980014,olivier.14@example.org,
OLLIVIER Olivier,,9A,Etage,8,110,,+33639980040,ollivier.40@example.org,
PERROT Pascal,Atelier du Ponant,,,,120,2023-08-01,+33639980015,perrot.15@example.org,box à identifier
PLOUZENNEC Patricia,,9D,Etage,6,90,2023-12-09,+33639980041,plouzennec.41@example.org,
QUEMENER Régis,,3,Bat III,12,120,2026-05-15,+33639980042,quemener.42@example.org,
QUENTIN Quentin,,5,Bat IV,18,130,2021-09-01,+33639980016,quentin.16@example.org,
RIOU Sylvie,,,,,150,,,,box à identifier
ROUSSEL Rozenn,,10,Bat I,12,140,2026-05-01,+33639980017,roussel.17@example.org,
SALAUN Sébastien,Marée Basse Éditions,4,Etage,5,90,2020-02-15,+33639980018,salaun.18@example.org,
SEZNEC Tanguy,,4,Bat III,12,140,2025-09-01,+33639980044,seznec.44@example.org,
TANGUY Thérèse,,,,,120,,+33639980019,tanguy.19@example.org,box à identifier
THOMAS Ursule,Cap Horizon,,,,110,2017-12-01,+33639980045,thomas.45@example.org,box à identifier
URIEN Vincent,,9C,Etage,12,120,2025-11-01,+33639980046,urien.46@example.org,
URVOY Ulysse,,2,Etage,18,180,2025-11-01,+33639980020,urvoy.20@example.org,
VAILLANT Valérie,,7,Bat I,18,170,2020-06-01,+33639980021,vaillant.21@example.org,
VOISIN Wanda,,4C,Bat IV,8,120,2026-05-02,+33639980047,voisin.47@example.org,
WALTER Yves,,6,Bat I,18,180,2024-08-14,+33639980048,walter.48@example.org,
WEBER Wilfried,,,,,180,2021-08-01,+33639980022,weber.22@example.org,box à identifier
XAVIER Xavier,,,,,80,2016-02-15,+33639980023,,box à identifier
YVON Yannick,,3,RDJ,8,120,2025-09-02,+33639980024,yvon.24@example.org,
YVON Yannick,,9,Bat III,18,180,2025-09-02,+33639980024,yvon.24@example.org,
ZELLER Zoé,,,,,110,2021-10-01,+33639980025,zeller.25@example.org,box à identifier
,,,,,140,,,,box à identifier
`;
