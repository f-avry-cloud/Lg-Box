# Données de départ — Suivi des règlements

| Fichier | Versionné | Rôle |
|---|---|---|
| `locataires_seed.csv` | **non** | Export réel des contrats actifs (noms, téléphones, e-mails de locataires réels). |
| `locataires_demo.csv` | oui | Même structure, noms pseudonymisés et coordonnées de test. |

Ce dépôt GitHub est **public**. Le fichier réel est donc listé dans
`.gitignore` : déposez-le ici en local, il ne partira jamais sur GitHub.

- `npm run suivi:import` l'utilise par défaut pour peupler les tables `sr_*` ;
- le mode démo (`SUIVI_DEMO=1`) l'utilise en priorité s'il le trouve, sinon il
  se rabat sur le jeu pseudonymisé embarqué dans `lib/suivi/demo-data.ts`.

Les deux fichiers produisent les mêmes totaux : 63 contrats, 8 710 €,
62 locataires, 39 box identifiés.

Colonnes attendues :

```
nom,societe,box_numero,batiment,surface_m2,loyer_mensuel_eur,date_entree,telephone,email,remarque
```

Après édition de `locataires_demo.csv`, régénérez le module embarqué :

```bash
npm run suivi:demo-data
```

Voir `docs/suivi-reglements.md` pour le détail.
