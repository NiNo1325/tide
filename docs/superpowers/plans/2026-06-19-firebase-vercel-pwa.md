# Tide — Firebase + Vercel + PWA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à Tide une persistance réelle des scores (Firebase Firestore), une connexion Google (Firebase Auth), un classement d'amis (relié via les liens de défi), un déploiement Vercel auto depuis git, et rendre l'app PWA-ready pour le Play Store.

**Architecture:** Le jeu reste un site statique sans build. La persistance est **local-first** (`localStorage` = cache rapide + offline), surmontée d'une **couche Firebase** chargée en ESM depuis le CDN gstatic dans un `<script type="module">` qui expose un objet pont `window.tideFb` au script classique existant. Auth Google en `signInWithRedirect` (compatible future TWA). Amitiés = arêtes symétriques dans Firestore, créées à l'ouverture d'un lien de défi.

**Tech Stack:** HTML/CSS/JS vanilla, Firebase Web SDK v10 (ESM CDN, modules `app`/`auth`/`firestore`), Vercel (hébergement statique + auto-deploy git), PWA (manifest + service worker).

> **Note de vérification :** ce projet n'a **pas** de framework de test (vanilla, zéro build). La vérification de chaque tâche se fait **dans le navigateur** : servir le dossier (`python -m http.server 8000`), ouvrir `http://localhost:8000`, et observer le comportement + la console DevTools. Les tâches Firebase exigent que la **config Firebase réelle soit en place** (Task 7) avant de pouvoir être vérifiées de bout en bout.

---

## File Structure

| Fichier | Rôle | Action |
|---|---|---|
| `index.html` | Le jeu. Reçoit : `store`→localStorage, UI auth, recordScore cloud, défi enrichi, écran classement, suppression compte, enregistrement SW, liens PWA. | Modifier |
| `tide.html` | Copie identique de `index.html`. | **Supprimer** |
| `firebase-config.js` | Objet de config Firebase (clés web publiques) collé par l'utilisateur. Exporté en ESM. | Créer |
| `js/firebase.js` | Module pont : init Firebase, Auth Google, opérations Firestore. Expose `window.tideFb`. | Créer |
| `manifest.webmanifest` | Manifest PWA (nom, icônes, couleurs, standalone). | Créer |
| `service-worker.js` | SW minimal : cache de l'app shell, cache-first shell / network Firebase. | Créer |
| `icons/` | Icônes PWA (192, 512, maskable). | Créer (placeholder) |
| `firestore.rules` | Règles de sécurité Firestore. | Créer |
| `vercel.json` | Config statique + en-têtes de cache (no-cache sur le SW). | Créer |
| `README.md`, `CLAUDE.md` | Refléter la nouvelle réalité (stockage, auth, déploiement). | Modifier |

> **Pourquoi `js/firebase.js` séparé alors que la spec disait « module dans index.html » ?** Le module Firebase fait ~150 lignes ; l'isoler garde `index.html` lisible et la responsabilité « Firebase » dans un seul fichier focalisé. Le `<script type="module">` dans `index.html` se réduit à un import. C'est un raffinement conforme à l'esprit de la spec (surface de changement minimale dans le script classique).

---

## Phase 0 — Persistance locale + nettoyage (sans Firebase)

### Task 1: `store` → localStorage + suppression du doublon `tide.html`

**Files:**
- Modify: `index.html:215-220`
- Delete: `tide.html`

- [ ] **Step 1: Remplacer le shim `store`**

Dans `index.html`, remplacer le bloc `const store={…};` (lignes 215-220) par :

```js
const store={
  async get(k){try{return localStorage.getItem(k);}catch(e){return null;}},
  async set(k,v){try{localStorage.setItem(k,v);}catch(e){}}
};
```

(Conserve l'API `async get/set` pour ne rien casser ailleurs. `loadProfiles`/`persist` continuent de fonctionner tels quels.)

- [ ] **Step 2: Supprimer le doublon**

```bash
git rm tide.html
```

- [ ] **Step 3: Vérifier dans le navigateur**

Run: `python -m http.server 8000` puis ouvrir `http://localhost:8000`
Procédure : créer un profil (pastille → nom → Créer), jouer une partie, **recharger la page**.
Expected : le profil et le meilleur score **survivent au rechargement** (avant ce patch, ils disparaissaient). Aucune erreur en console.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: persist profiles via localStorage; drop tide.html duplicate"
```

---

## Phase 1 — PWA shell (préparation Play Store)

### Task 2: Manifest PWA + icônes + liens dans `<head>`

**Files:**
- Create: `manifest.webmanifest`
- Create: `icons/icon-192.png`, `icons/icon-512.png`, `icons/maskable-512.png` (placeholders)
- Modify: `index.html` (`<head>`, après la ligne `<title>tide</title>` — ligne 6)

- [ ] **Step 1: Créer `manifest.webmanifest`**

```json
{
  "name": "Tide",
  "short_name": "Tide",
  "description": "Jeu de rythme à une touche. Tape quand la vague atteint la bille.",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#04141f",
  "theme_color": "#04141f",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 2: Créer les icônes placeholder**

Générer 3 PNG carrés au thème abyssal (`#04141f` fond, accent `#36d6c3`) aux tailles 192, 512, 512-maskable, dans `icons/`. En l'absence d'outil graphique, créer un PNG uni programmatique :

```bash
python -c "
from struct import pack
import zlib, os
os.makedirs('icons', exist_ok=True)
def png(path, size, rgb):
    raw=bytearray()
    for y in range(size):
        raw.append(0)
        raw += bytes(rgb)*size
    def chunk(t,d): return pack('>I',len(d))+t+d+pack('>I',zlib.crc32(t+d)&0xffffffff)
    sig=b'\x89PNG\r\n\x1a\n'
    ihdr=pack('>IIBBBBB',size,size,8,2,0,0,0)
    idat=zlib.compress(bytes(raw),9)
    open(path,'wb').write(sig+chunk(b'IHDR',ihdr)+chunk(b'IDAT',idat)+chunk(b'IEND',b''))
png('icons/icon-192.png',192,(4,20,31))
png('icons/icon-512.png',512,(4,20,31))
png('icons/maskable-512.png',512,(4,20,31))
print('icons written')
"
```
Expected : `icons written`, trois fichiers présents. (À remplacer plus tard par de vraies icônes design avant la soumission Play Store — noté dans CLAUDE.md.)

- [ ] **Step 3: Lier le manifest et les meta PWA dans `<head>`**

Dans `index.html`, juste après `<title>tide</title>` (ligne 6), insérer :

```html
<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#04141f">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

- [ ] **Step 4: Vérifier dans le navigateur**

Run: recharger `http://localhost:8000`, ouvrir DevTools → Application → Manifest.
Expected : le manifest est détecté, nom « Tide », 3 icônes listées, aucune erreur « manifest ».

- [ ] **Step 5: Commit**

```bash
git add manifest.webmanifest icons index.html
git commit -m "feat(pwa): add web manifest and icons"
```

### Task 3: Service worker + enregistrement + `vercel.json`

**Files:**
- Create: `service-worker.js`
- Create: `vercel.json`
- Modify: `index.html` (avant `</script>` final, dans le bloc INIT — autour de la ligne 702)

- [ ] **Step 1: Créer `service-worker.js`**

```js
const CACHE = 'tide-shell-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Ne jamais mettre en cache Firebase / Google : toujours réseau.
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com') ||
      url.hostname.endsWith('firebaseio.com') || url.hostname.includes('google.com')) {
    return; // laisse passer au réseau
  }
  if (e.request.method !== 'GET') return;
  // App shell : cache-first, repli réseau.
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
```

- [ ] **Step 2: Enregistrer le SW dans `index.html`**

Dans le bloc `(async function init(){…})();` (lignes 696-702), ajouter **avant** la fermeture `})();`, juste après `else{showScreen('home');}` :

```js
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('service-worker.js'); } catch (e) {}
  }
```

- [ ] **Step 3: Créer `vercel.json`**

```json
{
  "cleanUrls": true,
  "headers": [
    {
      "source": "/service-worker.js",
      "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
    },
    {
      "source": "/manifest.webmanifest",
      "headers": [{ "key": "Content-Type", "value": "application/manifest+json" }]
    }
  ]
}
```

- [ ] **Step 4: Vérifier dans le navigateur**

Run: recharger `http://localhost:8000`, DevTools → Application → Service Workers.
Expected : SW « activated and running ». Onglet Network : recharger une 2ᵉ fois, `index.html` servi depuis le SW. Passer Network en « Offline » et recharger : **le jeu charge quand même** (app shell en cache).

- [ ] **Step 5: Commit**

```bash
git add service-worker.js vercel.json index.html
git commit -m "feat(pwa): offline app-shell service worker + vercel headers"
```

---

## Phase 2 — Firebase Auth (Google)

### Task 4: Module pont Firebase + config (squelette auth)

> Vérification complète différée à Task 7 (après création du projet Firebase). Ici on pose le code ; la vérification « pas d'erreur de syntaxe / module chargé » se fait avec une config factice, puis sera revalidée en Task 7.

**Files:**
- Create: `firebase-config.js`
- Create: `js/firebase.js`
- Modify: `index.html` (avant `</body>`, après le `<script>` classique — donc nouveau `<script type="module">`)

- [ ] **Step 1: Créer `firebase-config.js` (gabarit)**

```js
// Clés web Firebase — PUBLIQUES par conception (la sécurité repose sur firestore.rules).
// Remplace ces valeurs par celles de ta console Firebase (Task 7).
export const firebaseConfig = {
  apiKey: "REMPLACER",
  authDomain: "REMPLACER.firebaseapp.com",
  projectId: "REMPLACER",
  storageBucket: "REMPLACER.appspot.com",
  messagingSenderId: "REMPLACER",
  appId: "REMPLACER"
};
```

- [ ] **Step 2: Créer `js/firebase.js` (init + auth)**

```js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult,
  signOut as fbSignOut, onAuthStateChanged, deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, getDocs, deleteDoc,
  collection, query, where, orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "../firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let listeners = [];
const api = {
  user: null,
  ready: null,            // Promise résolue au 1er état d'auth connu
  onChange(cb){ listeners.push(cb); if (api._known) cb(api.user); },
  signIn(){ return signInWithRedirect(auth, provider); },
  signOut(){ return fbSignOut(auth); },
  // — Firestore (implémentés dans les tâches suivantes) —
  saveScore: async () => {},
  fetchMyScores: async () => ({}),
  addFriend: async () => {},
  friendsLeaderboard: async () => [],
  deleteAccount: async () => {}
};
api._known = false;
api._db = { db, doc, setDoc, getDoc, getDocs, deleteDoc, collection, query, where, orderBy, limit, serverTimestamp };
api._auth = { auth, deleteUser };

api.ready = new Promise(resolve => {
  // Capture le retour de redirection (sinon onAuthStateChanged suffit).
  getRedirectResult(auth).catch(() => {});
  onAuthStateChanged(auth, u => {
    api.user = u;
    api._known = true;
    listeners.forEach(cb => { try { cb(u); } catch(e){} });
    resolve(u);
  });
});

window.tideFb = api;
```

- [ ] **Step 3: Charger le module dans `index.html`**

Juste avant `</body>` (après le `</script>` du script classique, ligne 703), ajouter :

```html
<script type="module" src="js/firebase.js"></script>
```

- [ ] **Step 4: Vérification syntaxe (config factice)**

Run: recharger `http://localhost:8000`, ouvrir la console DevTools.
Expected : le module se charge sans erreur de **syntaxe**/import. (Une erreur Firebase « auth/invalid-api-key » est NORMALE ici car la config est factice — elle disparaîtra en Task 7.) Vérifier `typeof window.tideFb` → `"object"` dans la console.

- [ ] **Step 5: Commit**

```bash
git add firebase-config.js js/firebase.js index.html
git commit -m "feat(auth): firebase bridge module + google provider scaffold"
```

### Task 5: UI connexion Google (chip + écran profil)

> Lie l'identité Firebase à la notion de « profil » du jeu. Quand un utilisateur Google est connecté, il devient le profil courant ; le profil local anonyme reste possible hors-ligne.

**Files:**
- Modify: `index.html` — `refreshChip` (584-585), `buildProfile` (607-632), bloc INIT (696-702)

- [ ] **Step 1: Adapter `refreshChip` pour refléter l'utilisateur Google**

Remplacer `refreshChip` (lignes 584-585) par :

```js
function refreshChip(){
  const u = window.tideFb && window.tideFb.user;
  if (u){
    $('chipName').textContent = u.displayName || 'Joueur';
    $('chipAv').textContent = (u.displayName || '?').slice(0,1).toUpperCase();
  } else {
    const p = curProfile();
    $('chipName').textContent = p ? p.name : 'Invité';
    $('chipAv').textContent = (p ? p.name : '?').slice(0,1).toUpperCase();
  }
}
```

- [ ] **Step 2: Ajouter le bouton Google dans `buildProfile` (cas non connecté)**

Dans `buildProfile`, dans la branche `if(!p){…}`, remplacer le bloc `b.innerHTML=…` (lignes 610-616) par une version qui ajoute le bouton Google **en tête** :

```js
    b.innerHTML=`<div class="brand sm">connexion</div>
      <div class="sub">Connecte-toi avec Google pour sauvegarder tes scores et les retrouver sur tous tes appareils.</div>
      <div class="sp"></div>
      <button class="btn primary wide" id="pfGoogle">Se connecter avec Google</button>
      <div class="sp"></div>
      <div class="sub" style="font-size:13px;opacity:.8">— ou joue sans compte —</div>
      <div class="field"><label>Nom de joueur (local)</label><input id="pfName" maxlength="20" placeholder="Ton blaze"></div>
      <button class="btn wide" id="pfCreate">Continuer sans compte</button>
      <div class="note">Sans compte, tes scores restent sur cet appareil uniquement.</div>`;
    b.querySelector('#pfGoogle').onclick=()=>{
      if(window.tideFb){ toast('Redirection Google…'); window.tideFb.signIn(); }
      else toast('Firebase indisponible');
    };
```

(La ligne suivante existante, `b.querySelector('#pfCreate').onclick=…` (617-618), reste valable — `createProfile` est appelé avec le nom ; l'email devient optionnel/absent : passer `''` en 2ᵉ argument.)

Modifier cette ligne pour retirer la référence à `#pfEmail` (supprimé) :

```js
    b.querySelector('#pfCreate').onclick=()=>{const n=b.querySelector('#pfName').value.trim();
      createProfile(n,'');refreshHome();buildProfile();toast('Profil local créé ✓');};
```

- [ ] **Step 3: Adapter `buildProfile` (cas connecté) pour Google**

Dans la branche `else{…}` de `buildProfile` (619-631), gérer le cas utilisateur Google : afficher nom/email Google et un bouton « Se déconnecter » qui appelle `tideFb.signOut()`. Remplacer le contenu de la branche `else` par :

```js
  }else{
    const u = window.tideFb && window.tideFb.user;
    const name = u ? (u.displayName||'Joueur') : p.name;
    const email = u ? (u.email||'') : (p.email||'');
    let rows='';let any=false;
    TRACKS.forEach((t,ti)=>DIFFS.forEach((d,di)=>{const s=p.stats[ti+'|'+di];
      if(s){any=true;rows+=`<div class="r"><span class="k">${t.name} · ${d.name}</span><span class="v">${s.best}</span></div>`;}}));
    if(!any)rows='<div class="note">Aucune partie enregistrée pour l’instant. Joue une vague !</div>';
    b.innerHTML=`<div class="brand sm">${name}</div>
      ${email?`<div class="sub">${email}</div>`:''}
      ${u?'<div class="note">✓ Connecté avec Google — scores synchronisés.</div>':''}
      <div class="stats">${rows}</div>
      <div class="sp"></div>
      <button class="btn wide" id="pfLeaderboard">⚡ Classement d'amis</button>
      <div class="sp"></div>
      <button class="btn ghost" id="pfLogout">Se déconnecter</button>
      ${u?'<div class="sp"></div><button class="btn ghost" id="pfDelete" style="color:#ff8a8a">Supprimer mon compte</button>':''}`;
    b.querySelector('#pfLeaderboard').onclick=()=>openLeaderboard();
    b.querySelector('#pfLogout').onclick=()=>{
      if(u && window.tideFb){ window.tideFb.signOut(); }
      currentId=null;persist();buildProfile();refreshHome();toast('Déconnecté');
    };
    const del=b.querySelector('#pfDelete'); if(del) del.onclick=()=>confirmDeleteAccount();
  }
```

> Note : `openLeaderboard`, `confirmDeleteAccount` sont définis dans Task 9/10. À ce stade ils n'existent pas encore : pour que cette tâche soit vérifiable seule, ajouter des stubs temporaires juste au-dessus de `buildProfile` :
> ```js
> function openLeaderboard(){ toast('Classement — bientôt'); }
> function confirmDeleteAccount(){ toast('Suppression — bientôt'); }
> ```
> Ces stubs seront remplacés par les vraies fonctions en Task 9 et Task 10.

- [ ] **Step 4: Brancher l'état d'auth au démarrage**

Dans le bloc INIT (696-702), après `await loadProfiles();`, ajouter l'abonnement à l'état Firebase. Quand un utilisateur Google apparaît, créer/charger un profil local associé à son uid :

```js
  // Lier l'état d'auth Firebase au profil courant.
  if (window.tideFb){
    window.tideFb.onChange(async (u)=>{
      if (u){
        const id = 'g_'+u.uid;
        if (!profiles[id]) profiles[id] = { id, name:(u.displayName||'Joueur').slice(0,20), email:(u.email||''), uid:u.uid, created:Date.now(), stats:{}, history:[] };
        else { profiles[id].name=(u.displayName||profiles[id].name); profiles[id].email=(u.email||profiles[id].email); }
        currentId = id; await persist();
        await syncFromCloud();      // défini en Task 7
      }
      refreshHome(); buildProfile();
    });
  }
```

> Stub temporaire (remplacé en Task 7), à placer près de `persist` :
> ```js
> async function syncFromCloud(){ /* implémenté Task 7 */ }
> ```

- [ ] **Step 5: Vérifier dans le navigateur (UI seulement)**

Run: recharger `http://localhost:8000`, ouvrir la pastille profil.
Expected : un bouton « Se connecter avec Google » apparaît, plus l'option « Continuer sans compte ». Le clic Google déclenche un `toast('Redirection Google…')` (la vraie redirection échouera tant que la config est factice — normal jusqu'à Task 7). « Continuer sans compte » crée un profil local comme avant.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat(auth): google sign-in UI in chip and profile screen"
```

---

## Phase 3 — Setup console + persistance cloud

### Task 6: (Utilisateur) Créer le projet Firebase

> **Tâche manuelle de l'utilisateur**, guidée pas à pas. À faire avant Task 7. L'agent fournit les instructions et attend que l'utilisateur colle sa config.

- [ ] **Step 1: Créer le projet**
  1. Aller sur https://console.firebase.google.com → « Ajouter un projet » → nom « tide » → créer (Analytics optionnel, peut être désactivé).

- [ ] **Step 2: Activer l'authentification Google**
  1. Console → Build → **Authentication** → « Get started ».
  2. Onglet **Sign-in method** → **Google** → activer → choisir l'email de support → enregistrer.

- [ ] **Step 3: Créer la base Firestore**
  1. Console → Build → **Firestore Database** → « Create database ».
  2. Démarrer en **production mode** (les règles seront posées en Task 10) → choisir une région (ex. `eur3` / europe) → activer.

- [ ] **Step 4: Récupérer la config web**
  1. Console → ⚙️ Paramètres du projet → section « Vos applications » → icône **Web `</>`** → enregistrer une app « tide-web ».
  2. Copier l'objet `firebaseConfig` proposé.

- [ ] **Step 5: Coller la config**
  Remplacer le contenu de `firebase-config.js` (valeurs `REMPLACER`) par les vraies valeurs.

- [ ] **Step 6: Autoriser les domaines**
  Authentication → Settings → **Authorized domains** : `localhost` y est déjà. Le domaine Vercel sera ajouté en Task 12.

- [ ] **Step 7: Commit**

```bash
git add firebase-config.js
git commit -m "chore(firebase): real web config"
```

### Task 7: Persistance cloud des scores (users + scores) + fusion à la connexion

**Files:**
- Modify: `js/firebase.js` (implémenter `saveScore`, `fetchMyScores`, `ensureUser`)
- Modify: `index.html` — `recordScore` (233-239), `syncFromCloud` (remplacer le stub)

- [ ] **Step 1: Implémenter `ensureUser`, `saveScore`, `fetchMyScores` dans `js/firebase.js`**

Remplacer les stubs correspondants par :

```js
api.ensureUser = async function(){
  const u = api.user; if(!u) return;
  const { db, doc, setDoc, serverTimestamp } = api._db;
  await setDoc(doc(db,'users',u.uid), {
    displayName: u.displayName||'Joueur',
    photoURL: u.photoURL||'',
    email: u.email||'',
    createdAt: serverTimestamp()
  }, { merge:true });
};

api.saveScore = async function(ti,di,best,plays){
  const u = api.user; if(!u) return;
  const { db, doc, setDoc, serverTimestamp } = api._db;
  const id = `${u.uid}_${ti}_${di}`;
  await setDoc(doc(db,'scores',id), {
    uid:u.uid, displayName:u.displayName||'Joueur', photoURL:u.photoURL||'',
    ti, di, best, plays, updatedAt: serverTimestamp()
  }, { merge:true });
};

api.fetchMyScores = async function(){
  const u = api.user; if(!u) return {};
  const { db, getDocs, collection, query, where } = api._db;
  const q = query(collection(db,'scores'), where('uid','==',u.uid));
  const snap = await getDocs(q);
  const out = {};
  snap.forEach(d => { const s=d.data(); out[`${s.ti}|${s.di}`] = { best:s.best||0, plays:s.plays||0 }; });
  return out;
};
```

- [ ] **Step 2: Implémenter `syncFromCloud` dans `index.html`**

Remplacer le stub `syncFromCloud` par :

```js
async function syncFromCloud(){
  if(!window.tideFb || !window.tideFb.user) return;
  const p = curProfile(); if(!p) return;
  try{
    await window.tideFb.ensureUser();
    const cloud = await window.tideFb.fetchMyScores();
    // Fusion : le meilleur score gagne ; on ré-uploade ce que le cloud ne connaît pas.
    for(const key in cloud){
      const c = cloud[key], l = p.stats[key]||{best:0,plays:0};
      p.stats[key] = { best:Math.max(c.best,l.best), plays:Math.max(c.plays,l.plays) };
    }
    for(const key in p.stats){
      const l = p.stats[key], c = cloud[key];
      if(!c || l.best>c.best){ const [ti,di]=key.split('|').map(Number); await window.tideFb.saveScore(ti,di,l.best,l.plays); }
    }
    await persist();
    refreshHome();
  }catch(e){ console.warn('syncFromCloud', e); }
}
```

- [ ] **Step 3: Faire écrire `recordScore` dans le cloud**

Dans `recordScore` (233-239), à l'intérieur du `if(p){…}`, après `persist();`, ajouter l'écriture cloud. Remplacer le corps du `if(p){…}` par :

```js
  if(p){const s=p.stats[key]||{best:0,plays:0};s.plays++;if(score>s.best)s.best=score;p.stats[key]=s;
    p.history.unshift({ti,di,score,ts:Date.now()});if(p.history.length>40)p.history.pop();persist();
    if(window.tideFb && window.tideFb.user){ window.tideFb.saveScore(ti,di,s.best,s.plays).catch(()=>{}); }
  }
```

- [ ] **Step 4: Vérifier de bout en bout (config réelle requise)**

Run: recharger `http://localhost:8000`, profil → « Se connecter avec Google » → choisir un compte.
Expected :
  - Après redirection, la pastille affiche le nom Google ; le profil indique « ✓ Connecté avec Google ».
  - Jouer une partie → console Firebase → Firestore : un doc `users/{uid}` et un doc `scores/{uid}_{ti}_{di}` apparaissent avec le bon `best`.
  - Recharger sur un autre navigateur/appareil, se connecter au même compte → le meilleur score est récupéré (visible sur l'accueil « Meilleur »).

- [ ] **Step 5: Commit**

```bash
git add js/firebase.js index.html
git commit -m "feat(cloud): persist and sync scores to firestore on login"
```

---

## Phase 4 — Amis + classement

### Task 8: Lien d'amitié via les défis

> Le payload de défi gagne `u` (uid) et `dn` (displayName) du défiant. À l'ouverture d'un défi en étant connecté, on crée le doc `friendships`.

**Files:**
- Modify: `js/firebase.js` (implémenter `addFriend`)
- Modify: `index.html` — `shareChallenge` (481-490), `showIncomingChallenge` (658-668), `openPasteChallenge` (669-679)

- [ ] **Step 1: Implémenter `addFriend` dans `js/firebase.js`**

Remplacer le stub par :

```js
api.addFriend = async function(otherUid, otherName){
  const u = api.user; if(!u || !otherUid || otherUid===u.uid) return;
  const { db, doc, setDoc, serverTimestamp } = api._db;
  const pair = [u.uid, otherUid].sort();
  const id = `${pair[0]}__${pair[1]}`;
  await setDoc(doc(db,'friendships',id), { users: pair, createdAt: serverTimestamp() }, { merge:true });
};
```

- [ ] **Step 2: Enrichir le payload dans `shareChallenge`**

Dans `shareChallenge` (481-490), remplacer la construction de `payload` (483) par :

```js
  const u = window.tideFb && window.tideFb.user;
  const payload={ti:selTrack,di:selDiff,s:game.score,
    n:(u?(u.displayName||'Quelqu’un'):(p?p.name:'Quelqu’un')).slice(0,20),
    u:u?u.uid:undefined, dn:u?(u.displayName||''):undefined};
```

(Le reste de la fonction est inchangé : `decC`/`encC` gèrent déjà les clés supplémentaires de façon transparente.)

- [ ] **Step 3: Créer l'amitié à l'acceptation du défi**

Dans `showIncomingChallenge` (658-668), remplacer le handler `acceptCh` (666) par :

```js
  b.querySelector('#acceptCh').onclick=()=>{
    if(c.u && window.tideFb && window.tideFb.user){ window.tideFb.addFriend(c.u, c.dn||c.n).catch(()=>{}); }
    startGame();
  };
```

- [ ] **Step 4: Vérifier de bout en bout**

Run: avec un compte A connecté, finir une partie → « Défier un ami » → récupérer le **code** (fallback) via DevTools ou le presse-papier. Dans un autre navigateur, connecter un compte B, accueil → « J'ai un code de défi » → coller → « Relever le défi ».
Expected : console Firebase → Firestore → collection `friendships` : un doc `{uidA}__{uidB}` avec `users:[A,B]` apparaît. Aucune erreur de permission (les règles de Task 10 doivent être en place pour ce test ; sinon faire ce test après Task 10).

- [ ] **Step 5: Commit**

```bash
git add js/firebase.js index.html
git commit -m "feat(friends): create friendship edge when accepting a challenge"
```

### Task 9: Écran classement d'amis

**Files:**
- Modify: `js/firebase.js` (implémenter `friendsLeaderboard`)
- Modify: `index.html` — nouvel écran HTML, `screens` map (194-195), `openLeaderboard` (remplace le stub de Task 5)

- [ ] **Step 1: Implémenter `friendsLeaderboard` dans `js/firebase.js`**

Remplacer le stub par :

```js
api.friendsLeaderboard = async function(ti,di){
  const u = api.user; if(!u) return [];
  const { db, getDocs, collection, query, where, orderBy, limit } = api._db;
  // 1) mes amitiés
  const fq = query(collection(db,'friendships'), where('users','array-contains',u.uid));
  const fsnap = await getDocs(fq);
  const ids = new Set([u.uid]);
  fsnap.forEach(d => d.data().users.forEach(x => ids.add(x)));
  const uids = Array.from(ids).slice(0,30); // limite Firestore `in`
  // 2) leurs scores pour (ti,di)
  const sq = query(collection(db,'scores'),
    where('ti','==',ti), where('di','==',di), where('uid','in',uids));
  const ssnap = await getDocs(sq);
  const rows = [];
  ssnap.forEach(d => { const s=d.data(); rows.push({ uid:s.uid, name:s.displayName||'Joueur', photo:s.photoURL||'', best:s.best||0 }); });
  rows.sort((a,b)=>b.best-a.best);
  return rows;
};
```

- [ ] **Step 2: Ajouter l'écran HTML**

Après le bloc `<!-- CHALLENGE INCOMING -->` (avant `<!-- GAME OVER -->`, ligne 171), insérer :

```html
<!-- LEADERBOARD -->
<div id="leaderboardScreen" class="screen">
  <div class="eyebrow">classement d'amis</div>
  <div class="brand sm" id="lbTitle">classement</div>
  <div id="leaderboardBody" style="width:100%;max-width:440px"></div>
  <div class="sp"></div>
  <button class="btn ghost" data-back>‹ Retour</button>
</div>
```

- [ ] **Step 3: Enregistrer l'écran dans la map `screens`**

Modifier la map `screens` (194-195) pour ajouter `leaderboard` :

```js
const screens={home:$('home'),diff:$('diffScreen'),track:$('trackScreen'),
  profile:$('profileScreen'),challenge:$('challengeScreen'),leaderboard:$('leaderboardScreen'),over:$('over')};
```

- [ ] **Step 4: Implémenter `openLeaderboard` (remplace le stub de Task 5)**

```js
async function openLeaderboard(){
  const body=$('leaderboardBody');
  $('lbTitle').textContent=`${TRACKS[selTrack].name} · ${DIFFS[selDiff].name}`;
  if(!window.tideFb || !window.tideFb.user){
    body.innerHTML='<div class="note">Connecte-toi avec Google pour voir le classement de tes amis.</div>';
    showScreen('leaderboard'); return;
  }
  body.innerHTML='<div class="note">Chargement…</div>';
  showScreen('leaderboard');
  try{
    const rows=await window.tideFb.friendsLeaderboard(selTrack,selDiff);
    const me=window.tideFb.user.uid;
    if(!rows.length){ body.innerHTML='<div class="note">Aucun ami pour l’instant. Envoie un défi pour relier un ami !</div>'; return; }
    body.innerHTML='<div class="stats">'+rows.map((r,i)=>
      `<div class="r"${r.uid===me?' style="border-color:var(--accent)"':''}><span class="k">${i+1}. ${r.name}${r.uid===me?' (toi)':''}</span><span class="v">${r.best}</span></div>`
    ).join('')+'</div>';
  }catch(e){ body.innerHTML='<div class="note">Erreur de chargement du classement.</div>'; console.warn(e); }
}
```

- [ ] **Step 5: Vérifier de bout en bout**

Run: avec deux comptes reliés (Task 8) ayant chacun un score sur la même musique/difficulté, ouvrir profil → « Classement d'amis ».
Expected : les deux joueurs apparaissent, triés par score décroissant, « (toi) » et surlignage sur ta ligne. Changer de musique/difficulté sur l'accueil puis rouvrir → le classement reflète la sélection.

- [ ] **Step 6: Commit**

```bash
git add js/firebase.js index.html
git commit -m "feat(friends): friends leaderboard screen per track/difficulty"
```

---

## Phase 5 — Suppression de compte, règles, déploiement, docs

### Task 10: Règles Firestore + suppression de compte

**Files:**
- Create: `firestore.rules`
- Modify: `js/firebase.js` (implémenter `deleteAccount`)
- Modify: `index.html` — `confirmDeleteAccount` (remplace le stub de Task 5)

- [ ] **Step 1: Créer `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
    match /scores/{docId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null
        && request.auth.uid == request.resource.data.uid;
      allow delete: if request.auth != null
        && request.auth.uid == resource.data.uid;
    }
    match /friendships/{id} {
      allow read: if request.auth != null && request.auth.uid in resource.data.users;
      allow create: if request.auth != null
        && request.auth.uid in request.resource.data.users
        && request.resource.data.users.size() == 2;
      allow delete: if request.auth != null && request.auth.uid in resource.data.users;
    }
  }
}
```

- [ ] **Step 2: (Utilisateur) Publier les règles**
  Console Firebase → Firestore Database → onglet **Rules** → coller le contenu de `firestore.rules` → **Publish**.

- [ ] **Step 3: Implémenter `deleteAccount` dans `js/firebase.js`**

Remplacer le stub par :

```js
api.deleteAccount = async function(){
  const u = api.user; if(!u) return;
  const { db, getDocs, deleteDoc, doc, collection, query, where } = api._db;
  const { deleteUser } = api._auth;
  // scores de l'utilisateur
  const ss = await getDocs(query(collection(db,'scores'), where('uid','==',u.uid)));
  for(const d of ss.docs){ await deleteDoc(d.ref); }
  // amitiés impliquant l'utilisateur
  const fs = await getDocs(query(collection(db,'friendships'), where('users','array-contains',u.uid)));
  for(const d of fs.docs){ await deleteDoc(d.ref); }
  // doc user
  await deleteDoc(doc(db,'users',u.uid));
  // compte Auth
  await deleteUser(u);
};
```

- [ ] **Step 4: Implémenter `confirmDeleteAccount` dans `index.html`**

Remplacer le stub par :

```js
async function confirmDeleteAccount(){
  if(!window.tideFb || !window.tideFb.user) return;
  if(!confirm('Supprimer définitivement ton compte et toutes tes données (scores, amitiés) ? Action irréversible.')) return;
  try{
    const uid=window.tideFb.user.uid;
    await window.tideFb.deleteAccount();
    delete profiles['g_'+uid]; currentId=null; await persist();
    refreshHome(); buildProfile(); showScreen('home'); toast('Compte supprimé');
  }catch(e){
    console.warn(e);
    toast('Reconnecte-toi puis réessaie (sécurité)'); // deleteUser exige une connexion récente
  }
}
```

> Note Firebase : `deleteUser` peut renvoyer `auth/requires-recent-login`. Le message de repli invite à se reconnecter, ce qui rafraîchit le jeton ; l'utilisateur relance alors la suppression.

- [ ] **Step 5: Vérifier de bout en bout**

Run: avec un compte de test connecté ayant des scores et au moins une amitié, profil → « Supprimer mon compte » → confirmer.
Expected : console Firebase → les docs `users/{uid}`, `scores` de l'uid et `friendships` impliquant l'uid disparaissent ; le compte n'apparaît plus dans Authentication → Users ; l'app revient à l'accueil déconnecté. (Si `requires-recent-login`, se reconnecter et relancer — comportement attendu.)

- [ ] **Step 6: Commit**

```bash
git add firestore.rules js/firebase.js index.html
git commit -m "feat(account): firestore security rules + account deletion"
```

### Task 11: (Utilisateur + agent) git distant, GitHub, Vercel

> L'agent prépare le dépôt local ; la création du dépôt distant et l'import Vercel dépendent de l'authentification CLI disponible (`gh`, `vercel`). Sinon, instructions manuelles.

- [ ] **Step 1: Vérifier l'état git local**

```bash
git status
git log --oneline
```
Expected : tous les commits des tâches précédentes présents, working tree clean.

- [ ] **Step 2: Créer le dépôt GitHub**
  - Si `gh` est authentifié :
    ```bash
    gh repo create tide --public --source=. --remote=origin --push
    ```
  - Sinon : créer le dépôt « tide » sur github.com, puis :
    ```bash
    git remote add origin https://github.com/<user>/tide.git
    git branch -M main
    git push -u origin main
    ```

- [ ] **Step 3: Importer dans Vercel**
  - Via dashboard : https://vercel.com/new → importer le dépôt `tide` → Framework Preset = **Other** (site statique) → Deploy.
  - Ou via CLI si `vercel` authentifié :
    ```bash
    vercel link
    vercel --prod
    ```
  Expected : une URL `https://tide-xxxx.vercel.app` qui sert le jeu.

- [ ] **Step 4: Autoriser le domaine Vercel dans Firebase Auth**
  Console Firebase → Authentication → Settings → **Authorized domains** → ajouter le domaine Vercel (`tide-xxxx.vercel.app` et le domaine custom éventuel).

- [ ] **Step 5: Vérifier en production**
  Ouvrir l'URL Vercel sur mobile : se connecter avec Google (vraie redirection), jouer, vérifier la persistance et le classement. Vérifier l'installabilité PWA (« Ajouter à l'écran d'accueil »).
  Expected : connexion Google OK (grâce au domaine autorisé), scores persistés, app installable.

- [ ] **Step 6: Vérifier l'auto-déploiement**

```bash
git commit --allow-empty -m "chore: trigger deploy"
git push
```
Expected : Vercel lance un nouveau déploiement automatiquement.

### Task 12: Mettre à jour README.md et CLAUDE.md

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: README — section « Limites connues » et « Héberger »**

Dans `README.md`, remplacer la section « Limites connues (à reprendre) » par un état à jour :

```markdown
## État
- **Connexion Google** : réelle, via Firebase Authentication (provider Google).
- **Persistance** : Firestore (cloud) quand connecté + `localStorage` (local/offline).
- **Classement d'amis** : amis reliés en ouvrant un lien/code de défi ; classement par musique/difficulté.
- **PWA** : installable, jouable hors-ligne (app shell en cache).

## Déploiement
Hébergé sur Vercel (auto-deploy à chaque push git). Config Firebase dans `firebase-config.js`
(clés web publiques). Règles de sécurité dans `firestore.rules` (à publier dans la console Firebase).
```

- [ ] **Step 2: CLAUDE.md — sections Stockage, Carte du fichier, roadmap**

Dans `CLAUDE.md` :
  - Section « Stockage » : remplacer la note « shim window.storage / repli mémoire » par : `store` utilise désormais `localStorage` ; la couche cloud est dans `js/firebase.js` (pont `window.tideFb`).
  - « Carte du fichier » : ajouter les nouveaux fichiers (`js/firebase.js`, `firebase-config.js`, `manifest.webmanifest`, `service-worker.js`, `firestore.rules`, `vercel.json`).
  - Roadmap : cocher persistance réelle, Google login, leaderboard d'amis, PWA. Ajouter note Play Store : icônes design à finaliser + politique de confidentialité + génération TWA (PWABuilder/Bubblewrap) restent à faire.

- [ ] **Step 3: Vérifier**

Run: relire les deux fichiers.
Expected : aucune contradiction avec le code livré ; nouveaux fichiers documentés.

- [ ] **Step 4: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: update README and CLAUDE.md for firebase/vercel/pwa"
git push
```

---

## Self-Review (effectué)

**Couverture spec :**
- Vercel + auto-deploy → Task 3 (vercel.json) + Task 11. ✓
- Persistance Firestore → Task 7. ✓
- Google Sign-In → Task 4/5/6. ✓
- Classement d'amis via défis → Task 8 (amitié) + Task 9 (classement). ✓
- PWA (manifest + SW) → Task 2/3. ✓
- Local-first + sync → Task 1 (localStorage) + Task 7 (merge). ✓
- Suppression de compte (pré-requis Play Store) → Task 10. ✓
- Règles de sécurité → Task 10. ✓
- Nettoyage tide.html → Task 1. ✓
- Modèle de données (users/scores/friendships) → Task 7/8/9. ✓
- Docs → Task 12. ✓

**Cohérence des noms (pont `window.tideFb`) :** `signIn`, `signOut`, `onChange`, `ready`, `user`, `ensureUser`, `saveScore`, `fetchMyScores`, `addFriend`, `friendsLeaderboard`, `deleteAccount` — définis dans `js/firebase.js`, appelés de façon cohérente dans `index.html`. Helpers internes regroupés dans `api._db`/`api._auth`. ✓

**Stubs temporaires** (`openLeaderboard`, `confirmDeleteAccount`, `syncFromCloud`) introduits en Task 5 puis remplacés en Task 7/9/10 — chaîne explicite, pas de référence orpheline. ✓

**Ordre de dépendance :** Firebase console (Task 6) précède la vérification cloud (Task 7+). Les règles (Task 10) sont nécessaires pour vérifier amitiés/classement en conditions réelles — noté dans Task 8/9. ✓
