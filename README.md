# Tide 🌊

Jeu de rythme à une touche, mobile-first. Un seul fichier, zéro dépendance, zéro build.

Tape quand la vague atteint la bille. Garde le combo : la musique s'empile couche par couche
et la marée monte. Un tap hors-tempo brise la vague.

## Lancer
Ouvre `index.html` dans un navigateur. Ou, pour un vrai serveur local :

```bash
python3 -m http.server 8000
# puis http://localhost:8000
```

> L'audio démarre au premier tap (politique des navigateurs).

## Héberger (obtenir un lien partageable)
C'est un fichier statique unique : dépose `index.html` sur **Netlify Drop**
(app.netlify.com/drop), **tiiny.host**, Cloudflare Pages, GitHub Pages, ou ton propre serveur.

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

## Limites connues (à reprendre)
- **Connexion Google** : non implémentée pour de vrai. L'OAuth Google exige un client enregistré
  + un backend, impossible en fichier statique seul. Le profil actuel est **local**. Voir `CLAUDE.md`
  → roadmap (Firebase Auth + Firestore).
- **Persistance des scores** : le code utilise l'API de stockage des artefacts Claude avec repli
  mémoire. **Hors de cet environnement, brancher `localStorage`** (voir `CLAUDE.md`).
- **Lien de défi cliquable** : nécessite que le jeu soit hébergé (`https://…`). En local sans serveur,
  utilise le **code** de défi (bouton « J'ai un code de défi »).

## Architecture
Tout est dans `index.html`, en sections commentées (`=== … ===`). Détail complet dans `CLAUDE.md`.
Principe clé : l'horloge audio (`actx.currentTime`) est l'horloge maître ; la bille est dérivée
du temps musical, ce qui rend la synchro infaillible.

## Fichiers
- `index.html` — le jeu (identique à `tide.html`).
- `tide.html` — copie (pour ouverture directe sans renommer).
- `CLAUDE.md` — contexte pour Claude Code / reprise dans VS Code.
