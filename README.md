# Médocs — suivi de mes traitements

Application web (utilisable sur ordinateur **et** téléphone, avec synchronisation)
pour suivre le stock de mes médicaments, de mon insuline et de mes capteurs de
glycémie, et savoir **quand retourner à la pharmacie**.

L'interface est en français, responsive, et installable sur le téléphone
(« Ajouter à l'écran d'accueil »).

## Fonctionnalités

### 💊 Médicaments (comprimés)
- Stock + posologie **matin / midi / soir**, autant de médicaments que voulu.
- Le stock diminue automatiquement chaque jour de la dose prévue.
- Calcul de la **date de fin de stock** (« à renouveler avant le… »).
- Saisie de la prise réelle du jour : *Pris* / *Oublié* par moment de la journée.
  Un oubli n'enlève pas la dose du stock et **repousse** la date de fin ; une
  reprise le soir n'enlève qu'un comprimé. La date est recalculée en direct.

> **Exemple Metformine** : 90 comprimés au 21/06/2026, 1 le matin + 1 le soir →
> 45 jours d'autonomie, stock jusqu'au **04/08/2026**. Si on oublie un matin, le
> lendemain le stock est à 89 et la date reste au 04/08. Si on oublie ensuite un
> soir, le stock n'a baissé que de 1 et la date passe au **05/08/2026**.

### 💉 Insuline (rapide & lente)
- Dosage en **unités**, stock géré en **cartouches** (et boîtes).
- Calcul automatique : `unités/ml × ml/cartouche` = unités par cartouche.
- Protocole de base par injection (rapide : matin/midi/soir ; lente : le soir).
- Saisie de la dose réellement injectée (plus ou moins que prévu) → la date de
  fin de stock s'ajuste.

> **Exemple insuline rapide** : 1 boîte de 5 cartouches × (100 u/ml × 3 ml) =
> 1500 unités. Protocole 11 + 12 + 14 = 37 u/jour → **40 jours** d'autonomie.

### 🩸 Capteur Dexcom One+
- Saisie de la **date et de l'heure de pose**.
- Calcul de la **fin de fonctionnement** (10 jours) et de la **tolérance**
  (+12 h) pour changer le capteur.
- Suivi du stock de capteurs de rechange.

> **Règle des 10 jours** : un capteur posé le 21/06 à 10:00 fonctionne jusqu'au
> **01/07 à 10:00** (exactement 10 × 24 h) et doit être remplacé avant le
> **01/07 à 22:00**. La durée de validité et la tolérance sont **réglables**
> dans la fiche du capteur si votre comptage diffère.

### 🏥 Pharmacie & stock
- Enregistrement des **passages en pharmacie** avec rappel « une fois par mois »
  (prochain passage autorisé calculé automatiquement).
- **Réapprovisionnement** à tout moment sur chaque fiche : on indique le nouveau
  stock total (ex. 4 cartouches + 5 = 9) et la date à partir de laquelle il
  s'applique.
- Modification de l'**ordonnance** (les doses) directement depuis chaque fiche.

### 🔄 Synchronisation PC ↔ téléphone
Toutes les données sont stockées côté **serveur** (base SQLite). Les deux
appareils lisent et écrivent au même endroit : une saisie faite sur le téléphone
apparaît sur l'ordinateur (rafraîchissement automatique au retour sur l'app et
toutes les 20 s). Il suffit d'héberger l'application à **une seule** adresse.

## Démarrer en local

```bash
npm install
npm run dev
# http://localhost:3000
```

Lancer les tests de calcul (stock, dates, capteur) :

```bash
npm test
```

## Déploiement (pour la synchronisation entre appareils)

Pour que le PC et le téléphone partagent les mêmes données, l'application doit
tourner à une adresse accessible, sur un hébergement **avec stockage
persistant** (la base SQLite est un fichier conservé dans un volume).

### Option recommandée : Docker

```bash
docker compose up -d --build
# http://localhost:3000  — la base est conservée dans le volume "medocs-data"
```

Le `Dockerfile` produit une image autonome (sortie *standalone* de Next.js) et
le `docker-compose.yml` monte un volume `/data` pour conserver la base.

### Hébergeur cloud

Tout hébergeur de conteneurs avec **disque persistant** convient (Railway,
Render, Fly.io, un VPS…). Construisez l'image Docker, attachez un volume sur
`/data`, et exposez le port `3000`.

> ⚠️ Les plateformes **serverless** (ex. Vercel) ont un système de fichiers
> éphémère : la base SQLite n'y serait pas conservée. Pour un déploiement
> Vercel, il faut basculer le stockage vers une base hébergée (Postgres / Turso)
> — c'est prévu dans l'architecture, demandez-le si besoin.

### Installer sur le téléphone
Ouvrez l'adresse dans le navigateur du téléphone, puis « Ajouter à l'écran
d'accueil ». L'app s'ouvre alors en plein écran comme une application native.

## Configuration (variables d'environnement)

Voir `.env.example`.

| Variable        | Rôle                                                            | Défaut              |
| --------------- | --------------------------------------------------------------- | ------------------- |
| `APP_TZ`        | Fuseau horaire pour « aujourd'hui »/« maintenant »              | `Europe/Paris`      |
| `DATABASE_PATH` | Emplacement du fichier SQLite                                    | `./data/medocs.db`  |
| `APP_PASSWORD`  | Mot de passe d'accès. **À définir avant toute mise en ligne.**  | *(vide = ouvert)*   |

> 🔒 **Confidentialité** : ce sont des données de santé. Avant d'exposer l'app
> sur Internet, définissez `APP_PASSWORD`. L'app demandera alors un mot de passe
> (cookie de session, le mot de passe n'est jamais stocké en clair).

## Sauvegarde

Toutes les données tiennent dans le fichier `DATABASE_PATH` (volume `/data` en
Docker). Sauvegardez ce fichier pour conserver l'historique.

## Pile technique

- **Next.js 16** (App Router, React 19, TypeScript)
- **Tailwind CSS v4** pour l'interface
- **better-sqlite3** (SQLite) — source de vérité unique, synchro multi-appareils
- **Vitest** — la logique de stock/dates est couverte par des tests
- **PWA** (manifest + service worker) — installable sur téléphone

## Architecture (repères)

```
src/
  domain/      logique métier pure + tests (calc.ts, dates.ts, calc.test.ts)
  db/          connexion SQLite + accès aux données (index.ts, repo.ts)
  server/      assemblage de l'état du tableau de bord (state.ts)
  app/api/     routes REST (medications, insulins, sensors, intake, pharmacy…)
  state/       provider React (fetch + polling + actions)
  components/  interface (cartes, formulaires, tableau de bord, UI)
  proxy.ts     porte d'accès optionnelle par mot de passe
```
