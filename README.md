# Médocs — suivi de mes traitements

Application web **100 % statique** (hébergeable gratuitement sur **GitHub Pages**)
pour suivre le stock de mes médicaments, de mon insuline et de mes capteurs de
glycémie, et savoir **quand retourner à la pharmacie**.

Les données sont enregistrées dans **un simple fichier `data.json`** de votre
dépôt GitHub. L'application le lit et l'écrit depuis le navigateur via l'API
GitHub : c'est ce qui fait que la **même donnée est partagée entre le PC et le
téléphone**. Interface en français, responsive, installable sur le téléphone.

## Comment ça marche

```
Navigateur (PC ou téléphone)  ──lit/écrit──▶  data.json  (dans votre dépôt GitHub)
        ▲                                          │
        └───────────── synchronisation ◀───────────┘
```

- Le site (le code) est servi par GitHub Pages.
- Les **données** vivent dans `data.json` (branche `medocs-data` par défaut).
- Chaque appareil a besoin, **une fois**, d'un **jeton d'accès GitHub** (collé
  dans l'app, conservé uniquement dans le navigateur) pour pouvoir écrire.

## Fonctionnalités

- **Médicaments** : stock + posologie matin/midi/soir, date de fin de stock,
  saisie des prises (oubli / reprise) qui ajuste le stock **et** la date.
  *Ex. : Metformine 90 cp, 1 matin + 1 soir → 45 j, stock jusqu'au 04/08/2026.*
- **Insuline rapide & lente** : unités, cartouches, boîtes ; protocole par
  injection ; dose réelle ajustable. *Ex. : 5 cartouches × 300 u = 1500 u,
  37 u/jour → 40 jours.*
- **Capteur Dexcom One+** : date + heure de pose → fin (10 j) + tolérance (12 h).
  *Posé le 21/06 à 10:00 → fonctionne jusqu'au 01/07 10:00, à changer avant
  01/07 22:00.* (Validité/tolérance réglables sur la fiche.)
- **Réapprovisionnement** à tout moment, **passage en pharmacie** (1×/mois).

## Mise en route

### 1. Publier le site (une fois)
1. Mergez/poussez ce code sur la branche **`main`** du dépôt.
2. Dans GitHub : **Settings → Pages → Build and deployment → Source : GitHub
   Actions**. Le workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
   construit et publie le site à chaque push sur `main`.
3. L'adresse est `https://<votre-compte>.github.io/medocs/`.

### 2. Préparer le stockage des données (une fois)
Une branche **`medocs-data`** contenant un fichier **`data.json`** sert de base
de données. (Elle peut être créée automatiquement ; sinon créez une branche
`medocs-data` avec un fichier `data.json` contenant `{"version":1}`.)

### 3. Se connecter (sur chaque appareil)
1. Ouvrez l'adresse du site → l'écran de connexion s'affiche.
2. Cliquez sur **« ouvrir GitHub »** pour créer un jeton (cochez **repo**),
   générez-le, copiez-le.
3. Collez le jeton (le compte et le dépôt sont pré-remplis), validez.

> Le jeton reste **dans le navigateur** de l'appareil. À refaire une fois sur le
> téléphone. Pour vous déconnecter : menu **Paramètres** → *Se déconnecter*.

## Bon à savoir

- **Synchronisation** : chaque appareil relit `data.json` au retour sur l'app et
  toutes les 20 s. Une modification faite sur le téléphone apparaît donc sur le
  PC (et inversement) en quelques secondes.
- **« Dernière modification gagne »** : si vous modifiez exactement au même
  moment sur deux appareils, la dernière écriture l'emporte (l'app retente
  automatiquement en cas de conflit). Sans risque en usage solo.
- **Confidentialité** : si vous le souhaitez, gardez le dépôt **privé** (le site
  publié reste public mais ne contient **aucune donnée** — tout est chargé via
  l'API avec votre jeton).
- **Jeton** : un jeton GitHub expire ; il faudra le recréer de temps en temps.

## Développement local

```bash
npm install
npm run dev            # http://localhost:3000/medocs
npm test               # tests de la logique stock/dates/capteur
npm run build          # export statique dans ./out
```

## Configuration

| Réglage           | Où                              | Défaut         |
| ----------------- | ------------------------------- | -------------- |
| Base path du site | `PAGES_BASE_PATH` (build)       | `/medocs`      |
| Branche données   | écran de connexion (avancé)     | `medocs-data`  |
| Fichier données   | écran de connexion (avancé)     | `data.json`    |
| Fuseau horaire    | `APP_TZ` dans `src/domain/dates.ts` | `Europe/Paris` |

Le workflow GitHub Actions fixe automatiquement `PAGES_BASE_PATH` au nom du
dépôt. Pour un domaine personnalisé ou un dépôt `<compte>.github.io`, mettez
`PAGES_BASE_PATH=""`.

## Pile technique

- **Next.js 16** en **export statique** (App Router, React 19, TypeScript)
- **Tailwind CSS v4**
- **API GitHub** comme stockage (fichier `data.json`)
- **Vitest** — logique de calcul couverte par des tests
- PWA (manifest + icônes) — installable sur téléphone

## Architecture

```
src/
  domain/      logique pure + tests : types, dates, calc, data (JSON),
               mutations, state (vue du tableau de bord)
  lib/         github.ts (lecture/écriture data.json), format.ts
  state/       MedocsProvider — chargement, synchro, file d'écriture
  components/  interface : Setup, Dashboard, cartes, formulaires, UI
.github/workflows/deploy.yml   publication GitHub Pages
```
