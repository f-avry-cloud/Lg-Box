// Référentiel des box du site, fourni par l'exploitant.
//
// GÉNÉRÉ depuis data/box_reference.csv : npm run suivi:box-data
//
// Sert au mode démo, pour qu'il présente la même structure que la production
// (67 box, dont une partie libre) plutôt que les seuls box déduits du carnet
// d'encaissement — sans quoi aucun box libre n'existerait et l'affectation
// d'un locataire serait intestable hors base.
// Ces données ne sont pas personnelles : numéros et surfaces uniquement.

export const BOX_REFERENCE_CSV = `batiment,numero,surface_m2
Bât I,1,
Bât I,2A,12
Bât I,2B,
Bât I,2C,8
Bât I,4,12
Bât I,5,
Bât I,6,18
Bât I,7,18
Bât I,8,8
Bât I,9,
Bât I,10,12
Bât I,11,12
Bât I,12,
Bât I,14,12
Bât I,15,
Bât II,1,
Bât II,2,
Bât II,3,
Bât II,4,18
Bât II,5,
Bât II,6,
Bât II,7,
Bât II,8,
Bât II,9,12
Bât III,1,18
Bât III,2,15
Bât III,3,12
Bât III,4,12
Bât III,8,18
Bât III,9,18
Bât III,10,12
Bât III,11,12
Bât III,22,5
Bât IV,1,12
Bât IV,2,
Bât IV,3,
Bât IV,4A,
Bât IV,4B,
Bât IV,4C,8
Bât IV,5,18
Bât IV,6,
Bât IV,7,
RDJ,1,12
RDJ,2,8
RDJ,3,8
RDJ,4,8
RDJ,5,5
RDJ,6,12
Étage,1,12
Étage,2,18
Étage,3,6
Étage,3bis,
Étage,4,5
Étage,5,5
Étage,6,
Étage,7,
Étage,8,5
Étage,9,
Étage,9A,8
Étage,9B,
Étage,9C,12
Étage,9D,6
Étage,10,5
Étage,10bis,
Étage,11,12
Étage,12,
Étage,13,18`;
