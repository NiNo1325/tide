# Tide — Firebase + Vercel + PWA — Design

> Date : 2026-06-19
> Statut : approuvé (design) — en attente de relecture spec avant plan d'implémentation

## Objectif

Faire passer Tide d'un fichier statique sans persistance réelle à une app :

1. **Déployée sur Vercel**, liée à un dépôt git (auto-déploiement à chaque push).
2. **Persistance des scores via Firebase** (Firestore) au lieu d'un stockage volatil.
3. **Connexion Google réelle** (Firebase Auth, provider Google).
4. **Classement d'amis**, les amis étant reliés via le mécanisme de liens de défi existant.
5. **PWA-ready** (manifest + service worker) pour ouvrir la voie au Google Play Store plus tard.

## Contraintes & principes conservés

- Reste un **site statique** : aucun serveur applicatif, aucun build/bundler.
- Firebase Web SDK chargé en **ESM depuis le CDN gstatic** (pas de npm/build).
- **Local-first** : le jeu reste jouable hors-ligne et instantané ; le cloud sync par-dessus.
- L'**invariant audio** (`actx.currentTime` = horloge maître, bille dérivée de `curBeat()`) n'est pas touché.
- Strings d'UI en **français**. `navigator.share`/`clipboard` toujours en try/catch avec repli.
- Les clés web Firebase sont **publiques par conception** : commitées sans risque (la sécurité repose sur les règles Firestore, pas sur le secret des clés).

## Décisions d'architecture

### Intégration Firebase : Local-first + sync (approche B retenue)

- `localStorage` remplace le repli mémoire actuel du shim `store` → persistance locale fiable, offline, instantanée.
- Un module Firebase (`<script type="module">`) s'ajoute par-dessus :
  - quand l'utilisateur est connecté, `recordScore` écrit en local **et** dans Firestore ;
  - à la connexion, on récupère le profil/scores cloud et on les fusionne avec le local (le meilleur score gagne) ;
  - `bestFor` lit le cache local (rapide), maintenu synchronisé.
- Le script classique existant n'est pas converti en modules : le module Firebase expose des helpers (`window.tide.*` ou équivalent) que le script classique appelle. Surface de changement minimale, « zéro build » préservé.

### Auth Google compatible TWA

- Provider Google via Firebase Auth.
- Utiliser **`signInWithRedirect`** (et non `signInWithPopup`) pour rester compatible avec une future Trusted Web Activity (Play Store).

### Amitié = arête symétrique, serverless

- Quand un joueur connecté ouvre le lien de défi d'un autre, on crée un doc `friendships` dont l'id est la paire d'uids triés. Symétrique, sans backend.
- Le classement d'amis se calcule côté client : lire mes amitiés → lire les scores des amis (+ les miens) pour la musique/difficulté courante.

## Modèle de données Firestore

```
users/{uid}
  { displayName, photoURL, email, createdAt }

scores/{uid}_{ti}_{di}
  { uid, displayName, photoURL, ti, di, best, plays, updatedAt }

friendships/{pairId}   // pairId = `${min(uidA,uidB)}__${max(uidA,uidB)}`
  { users: [uidA, uidB], createdAt }
```

Notes :
- `displayName`/`photoURL` sont **dénormalisés** dans `scores` → le classement se lit sans relire les docs `users`.
- Un doc `scores` par (utilisateur, musique, difficulté), id déterministe → upsert simple, pas de doublons.

### Requêtes du classement d'amis

1. `friendships` où `users` array-contains `myUid` → collecter les uids amis.
2. `scores` où `ti == X && di == Y && uid in [myUid, ...friendUids]`, `orderBy best desc`.
   - Limite Firestore `in` ≈ 30 valeurs → on cape la liste d'amis affichée à 29 + soi. Suffisant pour des amis ; documenté comme limite connue.

## Règles de sécurité Firestore (`firestore.rules`)

- `users/{uid}` : `read` si `request.auth != null` ; `write` si `request.auth.uid == uid`.
- `scores/{doc}` : `read` si `request.auth != null` ; `create/update` si `request.auth.uid == request.resource.data.uid`.
- `friendships/{id}` : `read` si `request.auth.uid in resource.data.users` ;
  `create` si `request.auth.uid in request.resource.data.users && request.resource.data.users.size() == 2`.

## Changements dans `index.html` (points d'ancrage existants)

1. **`store` → `localStorage`** (remplacer le repli mémoire). Réf. [index.html:215](../../../index.html#L215).
2. **Module Firebase** : nouveau `<script type="module">` — init app, Auth (Google, redirect), Firestore ; expose helpers au script classique ; observe l'état de connexion.
3. **UI auth** : bouton « Se connecter avec Google » + état connecté (avatar/nom) dans `buildProfile()` et sur la pastille. Réf. [index.html:608](../../../index.html#L608), `refreshChip` [index.html:584](../../../index.html#L584).
4. **`recordScore`** : écrit local + Firestore (upsert `scores`, met à jour `best`/`plays`). Réf. [index.html:233](../../../index.html#L233).
5. **Défi enrichi** : `encC/decC` incluent `uid` + `displayName` du défiant ; `parseIncoming` crée le doc `friendships` si le joueur est connecté.
6. **Écran/section Classement d'amis** : par musique/difficulté courante (musique, difficulté, nom, avatar, meilleur score, surlignage de soi).
7. **Suppression de compte** (pré-requis Play Store, et bonne pratique RGPD) : action « Supprimer mon compte et mes données » qui efface `users/{uid}`, les `scores` de l'uid, les `friendships` impliquant l'uid, puis `deleteUser()`.

## PWA

- `manifest.webmanifest` : nom, icônes (plusieurs tailles, dont maskable), `display: standalone`, couleur de thème océanique, orientation portrait.
- **Service worker minimal** : cache de l'app shell (`index.html` + manifest + icônes) pour démarrage hors-ligne ; stratégie cache-first sur l'app shell, network pour Firebase.
- Enregistrement du SW depuis `index.html`.
- Icônes : à générer (placeholder documenté si non fournies).

## Déploiement & dépôt

- **`vercel.json`** : configuration statique minimale (le jeu est servi tel quel ; en-têtes de cache raisonnables pour le SW : `no-cache` sur `service-worker.js`).
- **git** : `git init` + premier commit local (le dépôt n'existe pas encore).
- **GitHub** : créer le dépôt et pousser (via `gh` si authentifié, sinon instructions manuelles).
- **Vercel** : importer le dépôt → déploiement auto à chaque push (via CLI/MCP si authentifié, sinon instructions manuelles dashboard).

## Nettoyage ciblé

- `index.html` et `tide.html` sont aujourd'hui identiques. On garde **`index.html` comme source unique** et on supprime `tide.html` (ou on en fait une redirection d'une ligne) pour éviter la dérive entre deux copies.
- Mettre à jour `README.md` et `CLAUDE.md` (section Stockage, roadmap) pour refléter la nouvelle réalité.

## Répartition du travail

**🤖 Claude (code) :**
- Tout le code dans `index.html` (persistance, module Firebase, auth UI, recordScore, défis, classement, suppression de compte, SW).
- `firestore.rules`, `manifest.webmanifest`, `service-worker.js`, `vercel.json`.
- `git init` + commits, mise à jour README/CLAUDE.md.

**🧑 Utilisateur (consoles, avec instructions pas à pas) :**
- Firebase : créer le projet, activer Auth Google, créer Firestore, coller les règles, **coller l'objet de config** dans le code, autoriser le domaine Vercel dans Auth.
- GitHub : créer le dépôt (si `gh` non authentifié).
- Vercel : importer le dépôt et déployer (si CLI/MCP non authentifié).
- Plus tard, pour le Play Store : politique de confidentialité (URL), section sécurité des données, compte Play Console (25 $), génération TWA via PWABuilder/Bubblewrap.

## Critères de réussite

- Connexion Google fonctionnelle ; à la connexion, les scores cloud sont récupérés.
- Un score battu est persistant après rechargement **et** sur un autre appareil avec le même compte Google.
- Ouvrir le lien de défi d'un ami (connecté) crée l'amitié ; le classement d'amis affiche les deux joueurs.
- Le jeu reste jouable **hors-ligne** (PWA installable, démarrage sans réseau).
- Suppression de compte : efface effectivement les données Firestore + le compte Auth.
- Push git → redéploiement Vercel automatique.

## Limites connues / hors périmètre

- Pas de classement **global** ni de **groupes** (choix : amis uniquement, via liens de défi).
- Classement d'amis limité à ~29 amis par requête (limite `in` de Firestore).
- Anti-triche : aucun (scores écrits par le client). Acceptable pour un jeu d'amis ; un durcissement nécessiterait des Cloud Functions (hors périmètre).
- Génération effective du paquet Play Store : hors périmètre de ce chantier (on rend seulement l'app PWA-ready).
```
