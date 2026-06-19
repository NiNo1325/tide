# Tide 🌊

Jeu de rythme à une touche, mobile-first. HTML/CSS/JS vanilla, zéro build, zéro bundler.
Connexion Google + scores dans le cloud via Firebase ; installable en PWA.

Tape quand la vague atteint la bille. Garde le combo : la musique s'empile couche par couche
et la marée monte. Un tap hors-tempo brise la vague.

## Lancer
Ouvre `index.html` dans un navigateur. Ou, pour un vrai serveur local :

```bash
python3 -m http.server 8000
# puis http://localhost:8000
```

> L'audio démarre au premier tap (politique des navigateurs).

> ⚠️ La connexion Google nécessite un domaine **autorisé** dans Firebase Auth
> (`localhost` l'est déjà ; ajouter le domaine de prod).

## Contenu
- **4 difficultés** : Calme · Flot · Tempête · Hardcore (tempo, fenêtre de timing et densité de notes).
- **4 musiques** synthétisées en Web Audio, chacune avec sa couleur :
  - *Tide* — ambient, basse douce
  - *Undertow* — dub, sub-bass massif
  - *Riptide* — synthwave, basse en croches
  - *Maelström* — sombre, sub-bass saturé
- **Profils** : meilleurs scores par musique/difficulté + historique.
- **Défis** : partage un lien (ou un code) encodant ta musique/difficulté/score ; l'ami joue
  en mode défi avec ton score comme objectif. 100 % côté client, sans serveur.

## État
- **Connexion Google** : réelle, via Firebase Authentication (provider Google, popup + repli redirect).
- **Persistance** : Firestore (cloud) quand connecté + `localStorage` (local/offline, fusion au login).
- **Classement d'amis** : les amis se relient en ouvrant un lien/code de défi ; classement par musique/difficulté.
- **PWA** : installable, jouable hors-ligne (app shell en cache, service worker network-first).
- **Suppression de compte** : depuis le profil (efface scores + amitiés + compte Auth).

## Déploiement
Hébergé sur **Vercel** (auto-deploy à chaque `git push`). Config Firebase publique dans
`firebase-config.js`. Règles de sécurité dans `firestore.rules` :

```bash
firebase deploy --only firestore:rules --project tide-fdacd
```

## Reste à faire (Play Store)
- Vraies **icônes** design (les `icons/*.png` sont des placeholders unis).
- **Politique de confidentialité** (URL publique) — exigée par Google pour l'OAuth en prod et par Play.
- Génération du paquet Android (**TWA** via PWABuilder/Bubblewrap).

## Limites connues
- Classement limité à ~30 amis par requête (limite `in` de Firestore).
- Scores écrits par le client (pas d'anti-triche ; durcissement = Cloud Functions, hors périmètre).

## Architecture
Le jeu est dans `index.html`, en sections commentées (`=== … ===`). La couche cloud est isolée
dans `js/firebase.js` (pont `window.tideFb`). Détail complet dans `CLAUDE.md`.
Principe clé : l'horloge audio (`actx.currentTime`) est l'horloge maître ; la bille est dérivée
du temps musical, ce qui rend la synchro infaillible.

## Fichiers
- `index.html` — le jeu.
- `js/firebase.js` — pont Firebase (Auth Google + Firestore), expose `window.tideFb`.
- `firebase-config.js` — config web Firebase (clés publiques).
- `firestore.rules` / `firebase.json` — règles de sécurité + config de déploiement CLI.
- `manifest.webmanifest` / `service-worker.js` / `icons/` — PWA.
- `vercel.json` — config d'hébergement statique.
- `CLAUDE.md` — contexte pour Claude Code / reprise dans VS Code.
