# CLAUDE.md — contexte projet pour Claude Code

> Ce fichier est lu automatiquement par Claude Code. Il sert à reprendre le projet
> sans tout réexpliquer. Garde-le à jour quand l'architecture évolue.

## Le projet en une phrase
**Tide** est un jeu de rythme à une touche, mobile-first, écrit en HTML/CSS/JS vanilla,
**sans build ni bundler**. Le jeu est dans `index.html` ; la couche cloud (Firebase Auth
Google + Firestore) est isolée dans `js/firebase.js`. Hébergé sur Vercel, installable en PWA.

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
4. **PERSISTENCE** — objet `store` (= `localStorage`), profils + sync cloud (voir « Stockage »).
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
13. **INPUT WIRING** + **INIT** (`init()` async : charge profils, câble l'auth via l'évènement
    `tidefb-ready`, parse défi entrant, enregistre le service worker).

### Fichiers hors `index.html`
- `js/firebase.js` — pont Firebase chargé en `<script type="module">` (SDK ESM CDN v12.15.0).
  Init app/auth/firestore, expose `window.tideFb` : `signIn` (popup + repli redirect), `signOut`,
  `onChange`, `ensureUser`, `saveScore`, `fetchMyScores`, `addFriend`, `friendsLeaderboard`,
  `deleteAccount`. Émet l'évènement `tidefb-ready` une fois prêt.
- `firebase-config.js` — config web (clés publiques).
- `firestore.rules` / `firebase.json` — règles de sécurité + déploiement CLI (`firebase deploy --only firestore:rules`).
- `manifest.webmanifest` / `service-worker.js` (network-first) / `icons/` — PWA.
- `vercel.json` — hébergement statique (`no-cache` sur le SW).

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

// Profil (persisté en localStorage ; si connecté Google, id = 'g_'+uid)
{ id, name, email, uid?, created, stats:{ 'ti|di':{best,plays} }, history:[{ti,di,score,ts}] }

// Payload de défi (encodé dans l'URL #defi= ou un code)
{ ti, di, s /*score cible*/, n /*nom du défiant*/, u? /*uid pour l'amitié*/, dn? /*displayName*/ }

// Firestore : users/{uid} {displayName,photoURL,email,createdAt}
//             scores/{uid_ti_di} {uid,displayName,photoURL,ti,di,best,plays,updatedAt}
//             friendships/{uidA__uidB trié} {users:[a,b],createdAt}
```

## Stockage (local-first + cloud)
- `store` = wrapper `localStorage` (source rapide + offline). `profiles`/`currentId` y sont sérialisés.
- Couche cloud dans `js/firebase.js`. Quand un utilisateur Google se connecte (`onChange`), on crée/charge
  un profil local `g_'+uid`, puis `syncFromCloud()` fusionne les scores (le meilleur gagne, ré-upload des
  manquants). `recordScore` écrit en local **et** dans Firestore si connecté.
- Le module est différé (CDN) → l'init du jeu attend l'évènement `tidefb-ready` avant de câbler l'auth.

## Tâches ouvertes (roadmap)
- [x] Persistance réelle (`localStorage` + Firestore).
- [x] Connexion Google (Firebase Auth, popup + repli redirect).
- [x] Leaderboard d'amis (amitiés reliées par les liens de défi ; `friendsLeaderboard`).
- [x] PWA (manifest + service worker network-first).
- [ ] **Play Store** : vraies icônes (placeholders unis pour l'instant), **politique de confidentialité**
  (URL, exigée par l'OAuth en prod + Play), génération **TWA** (PWABuilder/Bubblewrap).
- [ ] **Équilibrage Hardcore** : `DIFFS[3]` (tempo 1.38, good 0.085, densMax 0.95, sixteenth). À tester
  sur device réel ; probablement adoucir `dens0`/`densMax` ou élargir un peu `good`.
- [ ] (Optionnel) Anti-triche serveur (Cloud Functions) si besoin — scores actuellement écrits par le client.

### Pièges connus (vécus)
- **Service worker** : garder `network-first` ; en cache-first il sert un `firebase-config.js`/code périmé
  (bug rencontré). Bumper `CACHE` (`tide-shell-vN`) pour purger après changement de stratégie.
- **Auth** : `signInWithRedirect` plante (page blanche `__/auth/handler`) à cause du stockage tiers / des
  bloqueurs de pub → on utilise `signInWithPopup` d'abord, redirect en repli. Domaine de prod à **autoriser**
  dans Firebase Auth → Settings → Authorized domains.
- **Index Firestore** : le classement (`scores` filtré sur ti+di+uid `in`) peut exiger un index composite
  (Firestore donne un lien de création dans l'erreur console).

## Conventions
- JS vanilla, pas de framework, pas de bundler. Garder le « zéro build ». Firebase chargé en ESM CDN
  (pas npm) ; mettre à jour la version aux 3 imports de `js/firebase.js`.
- `localStorage` est utilisé (et recommandé) ici.
- Strings d'UI en **français**.
- `navigator.share` / `navigator.clipboard` peuvent échouer selon le contexte → toujours try/catch
  avec repli (déjà fait dans `shareChallenge`).

## Garde-fous de conception (issus du brief produit)
Engagement « sain » : pas de hasard payant, pas de fausse rareté, points d'arrêt honnêtes.
La difficulté suit la maîtrise du joueur (flow). Ne pas ajouter de mécanique de type loot box.
