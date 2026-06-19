# CLAUDE.md — contexte projet pour Claude Code

> Ce fichier est lu automatiquement par Claude Code. Il sert à reprendre le projet
> sans tout réexpliquer. Garde-le à jour quand l'architecture évolue.

## Le projet en une phrase
**Tide** est un jeu de rythme à une touche, mobile-first, écrit en HTML/CSS/JS vanilla,
dans **un seul fichier** (`tide.html` = `index.html`). Aucun build, aucune dépendance.

## Principe de jeu
Une bille rebondit le long d'une ligne ondulée. À chaque « nœud » (placé sur la grille
musicale), il faut taper quand la bille retombe sur la ligne verticale de contact.
Tap dans la fenêtre = combo +1 et la musique s'enrichit ; tap hors-tempo ou nœud manqué =
game over (la marée se retire, silence).

**Invariant central :** l'horloge maître est `actx.currentTime` (Web Audio). La position
de la bille est *dérivée* du temps audio (`curBeat()`), jamais d'une physique libre.
C'est ce qui garantit la synchro visuel/son. Ne pas casser ça.

## Comment lancer / prévisualiser
- Ouvrir `index.html` dans un navigateur, OU servir le dossier :
  `python3 -m http.server 8000` puis http://localhost:8000
- **L'audio ne démarre qu'après un premier tap** (politique navigateur). Normal.
- Pour héberger : déposer `index.html` sur Netlify Drop / tiiny.host / un serveur statique.

## Carte du fichier (`tide.html`, sections balisées par des commentaires `===`)
1. `<style>` — thème océanique, variable CSS `--accent` reskinée par piste.
2. **DOM / LAYOUT** — refs, `layout()` (canvas DPR-aware, constantes CONTACT_X/BASE_Y/BEAT_PX/ARC_H).
3. **HELPERS** — `hexToRgb`, `mix`, `setAccent` (ACC = couleur active en RGB).
4. **PERSISTENCE** — objet `store` (voir « Stockage » plus bas), profils.
5. **AUDIO** — `initAudio()` (chaîne master→lowShelf→compressor→destination + send delay),
   synthés : `kick`, `hat`, `subBass` (avec drive optionnel), `bassPl` (basse pluck/arp),
   `pad`, `pluck`, `failSound`. `note(semi,oct)` + gamme `PENT`.
6. **TRACKS & DIFFS** — données. 4 pistes, 4 difficultés (voir « Données »).
7. **playStep(step,t,combo)** — joue UNE subdivision (1/16) : kick/hats/basse/pad/arp selon
   la piste et le combo. Utilisé par le scheduler ET par l'aperçu.
8. **SCHEDULER** — lookahead 25 ms façon « A Tale of Two Clocks ». `startScheduler/stopScheduler`.
   `previewTrack(i)` joue ~2 mesures.
9. **GAME** — état `game`, `genNodes` (génère les nœuds sur grille 1/8 ou 1/16 selon densité),
   `startGame`, `onTap`, `success`, `gameOver`, `ballPos`.
10. **CHALLENGE** — `encC/decC` (base64url), `challengeLink`, `shareChallenge`,
    `parseIncoming` (lit `#defi=` au chargement).
11. **RENDER** — `loop` (rAF), `drawBg` (signature : marée montante), `drawAmbient` (menus),
    `drawWorld`, `drawParticles`, `drawHUD`.
12. **UI / SCREENS** — `showScreen`, `refreshHome`, `buildDiffCards`, `buildTrackCards`,
    `buildProfile`, `showOver`, écrans de défi.
13. **INPUT WIRING** + **INIT** (`init()` async : charge profils, parse défi entrant).

## Données (formes)
```js
// Piste
{ name, blurb, accent:'#hex', bpm, keyRoot /*semitone*/, bassType:'sub'|'arp',
  bassGain, bassDur, bassDrive:bool, bassBoost /*dB low-shelf*/,
  prog:[{bass:freq, pad:[freq,...]}, ...] /*accord toutes les 2 mesures*/,
  bassHits:[[stepInBar0..15, multiplicateur], ...],
  kickSteps:[...], kickGain, hatSteps:[...], hatVel, pentOct:[octLo,octHi] }

// Difficulté
{ name, blurb, meter:1..4, tempo /*multiplicateur de bpm*/, good /*fenêtre s*/, perfect,
  dens0, densMax /*proba de syncope, croît avec le score*/, sixteenth:bool }

// Profil (persisté)
{ id, name, email, created, stats:{ 'ti|di':{best,plays} }, history:[{ti,di,score,ts}] }

// Payload de défi (encodé dans l'URL #defi= ou un code)
{ ti /*index piste*/, di /*index difficulté*/, s /*score cible*/, n /*nom du défiant*/ }
```

## Stockage — POINT IMPORTANT POUR LA SUITE
Le code utilise actuellement un shim `store` qui appelle `window.storage` (l'API de
persistance des artefacts Claude.ai) **avec repli en mémoire** si elle n'existe pas.
**Hors de l'aperçu Claude (donc ici, dans VS Code / en hébergé), `window.storage`
n'existe pas → les scores ne survivent pas au rechargement.**

➡️ Première amélioration recommandée : remplacer le repli mémoire par **`localStorage`**
(disponible partout maintenant qu'on n'est plus dans le sandbox artefact). Patch minimal
dans l'objet `store` : si pas de `window.storage`, lire/écrire `localStorage`.

## Tâches ouvertes (roadmap)
1. **Persistance réelle** : brancher `localStorage` dans `store` (rapide), ou Firestore (cf. point 2).
2. **Vraie connexion Google** : impossible en fichier statique seul (OAuth = client enregistré + backend).
   Chemin réaliste = **Firebase Authentication (Google provider) + Firestore**.
   Points d'ancrage : `createProfile`, `recordScore`, `bestFor`, `curProfile`, et le bouton
   « Créer mon profil » dans `buildProfile()`. Remplacer le profil local par l'utilisateur Firebase
   (uid, displayName, email) et stocker `stats` dans Firestore par uid.
3. **Leaderboard d'amis** : aujourd'hui les défis passent par URL/lien (sans serveur). Un classement
   partagé nécessiterait un backend (Firestore conviendrait).
4. **Équilibrage Hardcore** : `DIFFS[3]` (tempo 1.38, good 0.085, densMax 0.95, sixteenth). À tester
   sur device réel ; probablement adoucir `dens0`/`densMax` ou élargir un peu `good`.
5. **PWA** : ajouter `manifest.webmanifest` + service worker pour installation écran d'accueil + hors-ligne.
6. (Optionnel) **Découper le monolithe** en `index.html` + `css/` + `js/` modules si le fichier grossit.

## Conventions
- JS vanilla, pas de framework, pas de bundler. Garder le « zéro dépendance » tant que possible.
- Pas de `localStorage`/`sessionStorage` dans le code historique (contrainte de l'environnement
  d'origine). **Cette contrainte ne s'applique plus ici** — tu peux les utiliser.
- Strings d'UI en **français**.
- `navigator.share` / `navigator.clipboard` peuvent échouer selon le contexte → toujours try/catch
  avec repli (déjà fait dans `shareChallenge`).

## Garde-fous de conception (issus du brief produit)
Engagement « sain » : pas de hasard payant, pas de fausse rareté, points d'arrêt honnêtes.
La difficulté suit la maîtrise du joueur (flow). Ne pas ajouter de mécanique de type loot box.
