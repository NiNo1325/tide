# Progression & déverrouillage (#2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Débloquer morceaux et mondes de difficulté à la progression (≥ ★★), avec un bouton « Voyage » et le gating des sélecteurs.

**Architecture:** Tout est **dérivé des étoiles** déjà stockées (`stats["ti|di"].stars`, #1) — aucun nouvel état persisté. On ajoute des fonctions pures (`starsFor`/`worldUnlocked`/`songUnlocked`/`levelUnlocked`/`nextLevel`), on gate `buildTrackCards`/`buildDiffCards`, on ajoute un bouton Voyage + garde-fous, et un peu de CSS pour l'état verrouillé. Le tout dans `index.html`.

**Tech Stack:** JavaScript vanilla, Canvas/DOM. Pas de build, pas de test runner.

> **Vérification :** pas de framework de test. Après chaque tâche : `node --check` sur le script inline extrait, puis test **dans le navigateur**. Pour tester un profil neuf : DevTools → Application → Local Storage → supprimer `tide_profiles`/`tide_current`, ou jouer déconnecté.

---

### Task 1: Fonctions de progression

**Files:**
- Modify: `index.html` — après `bestFor` (ligne 292).

- [ ] **Step 1: Insérer les fonctions pures après `bestFor`**

Juste après la ligne de `function bestFor(...){...}` (292), ajouter :
```js
function starsFor(ti,di){const p=curProfile();if(!p)return 0;const s=p.stats[ti+'|'+di];return (s&&s.stars)||0;}
function worldUnlocked(di){if(di<=0)return true;for(let ti=0;ti<5;ti++){if(starsFor(ti,di-1)<2)return false;}return true;}
function songUnlocked(ti){return ti<=4 || starsFor(ti-1,0)>=2;}
function levelUnlocked(ti,di){return worldUnlocked(di)&&songUnlocked(ti);}
function nextLevel(){
  for(let di=0;di<DIFFS.length;di++)for(let ti=0;ti<TRACKS.length;ti++){
    if(levelUnlocked(ti,di)&&starsFor(ti,di)<2)return {ti,di};
  }
  return {ti:TRACKS.length-1,di:DIFFS.length-1};
}
```

- [ ] **Step 2: Contrôle de syntaxe**

Run:
```bash
cd "c:\Users\Nicolas Notte\Dropbox\Projets Divers\Tide\tide" && python -c "import re;h=open('index.html',encoding='utf-8').read();m=re.search(r'<script>\s*\"use strict\";(.*?)</script>',h,re.S);open('_t.js','w',encoding='utf-8').write('\"use strict\";'+m.group(1))" && node --check _t.js && echo OK && rm -f _t.js
```
Expected : `OK`.

- [ ] **Step 3: Test rapide en console**

Recharger ; dans la console (profil neuf / déconnecté) :
```js
[levelUnlocked(0,0), levelUnlocked(5,0), worldUnlocked(1), JSON.stringify(nextLevel())]
```
Expected : `[true, false, false, '{"ti":0,"di":0}']` (morceau 0 Calme ouvert, morceau 5 verrouillé, monde Flot verrouillé, prochain niveau = (0,0)).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(progression): unlock logic derived from stars"
```

---

### Task 2: Gating des cartes (musique + difficulté) avec étoiles

**Files:**
- Modify: `index.html` — `buildDiffCards` (829-833), `buildTrackCards` (834-842).

- [ ] **Step 1: Gater `buildDiffCards` (mondes verrouillés)**

Remplacer `buildDiffCards` (829-833) par :
```js
function buildDiffCards(){const c=$('diffCards');c.innerHTML='';DIFFS.forEach((d,i)=>{
  const locked=!worldUnlocked(i);
  const el=document.createElement('div');el.className='opt'+(i===selDiff?' sel':'')+(locked?' locked':'');
  let m='';for(let k=0;k<4;k++)m+=`<i class="${k<d.meter?'on':''}"></i>`;
  el.innerHTML=`<div class="dot"></div><div style="flex:1"><div class="ot">${d.name}${locked?' 🔒':''}</div>`+
    `<div class="od">${locked?'Réussis les 5 morceaux gratuits du monde précédent (★★).':d.blurb}</div><div class="meter">${m}</div></div>`;
  if(!locked)el.onclick=()=>{selDiff=i;buildDiffCards();refreshHome();};
  c.appendChild(el);});}
```

- [ ] **Step 2: Gater `buildTrackCards` + afficher les étoiles**

Remplacer `buildTrackCards` (834-842) par :
```js
function buildTrackCards(){const c=$('trackCards');c.innerHTML='';TRACKS.forEach((t,i)=>{
  const locked=!levelUnlocked(i,selDiff);
  const st=starsFor(i,selDiff),stars='★'.repeat(st)+'☆'.repeat(3-st);
  const el=document.createElement('div');el.className='opt'+(i===selTrack?' sel':'')+(locked?' locked':'');
  el.innerHTML=`<div class="dot" style="border-color:${t.accent};${i===selTrack?'background:'+t.accent:''}"></div>
    <div style="flex:1"><div class="ot">${t.name}${locked?' 🔒':''}</div><div class="od">${t.blurb}</div>
      <div class="stars" style="color:var(--gold);letter-spacing:.15em;font-size:13px;margin-top:5px">${stars}</div></div>
    <div class="play"><button class="btn">Aperçu</button></div>`;
  el.onclick=e=>{if(e.target.closest('.play'))return;if(locked){toast('Niveau verrouillé 🔒');return;}selTrack=i;buildTrackCards();refreshHome();};
  el.querySelector('.play .btn').onclick=e=>{e.stopPropagation();previewTrack(i);};
  c.appendChild(el);});}
```

- [ ] **Step 3: Contrôle de syntaxe**

Run:
```bash
cd "c:\Users\Nicolas Notte\Dropbox\Projets Divers\Tide\tide" && python -c "import re;h=open('index.html',encoding='utf-8').read();m=re.search(r'<script>\s*\"use strict\";(.*?)</script>',h,re.S);open('_t.js','w',encoding='utf-8').write('\"use strict\";'+m.group(1))" && node --check _t.js && echo OK && rm -f _t.js
```
Expected : `OK`.

- [ ] **Step 4: Test**

Profil neuf : écran Musique → morceaux 5‑10 affichés 🔒 grisés (clic = toast « verrouillé »), 0‑4 sélectionnables avec `★☆☆`-style. Écran Difficulté → Flot/Tempête/Hardcore 🔒. L'aperçu marche même sur un morceau verrouillé.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(progression): gate track/difficulty cards with locks + stars"
```

---

### Task 3: Bouton « Voyage » + garde-fous + sélection par défaut

**Files:**
- Modify: `index.html` — HOME (140-145), wiring `playBtn` (981), INIT (après `await loadProfiles();`).

- [ ] **Step 1: Ajouter le bouton Voyage dans le HOME**

Remplacer le bloc `.stack` du HOME (140-145) par :
```html
  <div class="stack">
    <button class="btn primary wide" id="voyageBtn">⛵ Voyage</button>
    <button class="btn wide" id="playBtn">Jeu libre</button>
    <div class="row" id="homeBest">Meilleur&nbsp;<b>0</b></div>
    <div class="sp"></div>
    <button class="btn ghost" id="openChallenge">⚡ J'ai un code de défi</button>
  </div>
```

- [ ] **Step 2: Câbler Voyage + garde-fou sur Jeu libre**

Remplacer la ligne `$('playBtn').onclick=()=>{pendingChallenge=null;startGame();};` (981) par :
```js
$('playBtn').onclick=()=>{pendingChallenge=null;
  if(!levelUnlocked(selTrack,selDiff)){toast('Niveau verrouillé 🔒');return;}
  startGame();};
$('voyageBtn').onclick=()=>{pendingChallenge=null;const nl=nextLevel();selTrack=nl.ti;selDiff=nl.di;refreshHome();startGame();};
```

- [ ] **Step 3: Corriger la sélection par défaut à l'init**

Dans `init` (bloc `(async function init(){…})();`), juste après `await loadProfiles();`, ajouter :
```js
  if(!levelUnlocked(selTrack,selDiff)){const nl=nextLevel();selTrack=nl.ti;selDiff=nl.di;}
```
(Évite de démarrer sur un niveau verrouillé — le défaut actuel `selDiff=1` (Flot) est verrouillé au départ.)

- [ ] **Step 4: Contrôle de syntaxe**

Run:
```bash
cd "c:\Users\Nicolas Notte\Dropbox\Projets Divers\Tide\tide" && python -c "import re;h=open('index.html',encoding='utf-8').read();m=re.search(r'<script>\s*\"use strict\";(.*?)</script>',h,re.S);open('_t.js','w',encoding='utf-8').write('\"use strict\";'+m.group(1))" && node --check _t.js && echo OK && rm -f _t.js
```
Expected : `OK`.

- [ ] **Step 5: Test**

Profil neuf : l'accueil ouvre sur (Tide, Calme). **⛵ Voyage** lance le prochain niveau ; **Jeu libre** lance la sélection courante (refuse un niveau verrouillé). Finir (0,0) à ≥ ★★ → (1,0) devient jouable et Voyage y mène.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat(progression): Voyage button + free-play guard + default selection"
```

---

### Task 4: CSS état verrouillé + vérification + déploiement

**Files:**
- Modify: `index.html` — bloc `<style>` (près de `.opt.sel`, ligne 64).

- [ ] **Step 1: Ajouter le style verrouillé**

Après la règle `.opt .meter i.on{background:var(--accent)}` (ligne 71), ajouter :
```css
  .opt.locked{opacity:.5;filter:grayscale(.6)}
  .opt.locked .ot{color:#9fb4b8}
```

- [ ] **Step 2: Contrôle de syntaxe**

Run:
```bash
cd "c:\Users\Nicolas Notte\Dropbox\Projets Divers\Tide\tide" && python -c "import re;h=open('index.html',encoding='utf-8').read();m=re.search(r'<script>\s*\"use strict\";(.*?)</script>',h,re.S);open('_t.js','w',encoding='utf-8').write('\"use strict\";'+m.group(1))" && node --check _t.js && echo OK && rm -f _t.js
```
Expected : `OK`.

- [ ] **Step 3: Commit + push**

```bash
cd "c:\Users\Nicolas Notte\Dropbox\Projets Divers\Tide\tide"
git add index.html
git commit -m "feat(progression): locked card styling"
git push origin main
```
Expected : push OK ; Vercel redéploie.

- [ ] **Step 4: Vérification prod**

```bash
curl -s "https://tide-mauve.vercel.app/?cb=$(date +%s)" | grep -c "voyageBtn"
```
Expected : ≥ `1`. Puis, sur l'URL Vercel (profil neuf) : seuls 0‑4 en Calme jouables ; Voyage enchaîne ; un niveau réussi ≥ ★★ débloque le suivant ; les mondes se débloquent après les 5 gratuits à ★★.

---

## Self-Review (effectué)

**Couverture spec :**
- `starsFor/worldUnlocked/songUnlocked/levelUnlocked/nextLevel` (dérivés des étoiles) → Task 1. ✓
- Gating cartes musique (🔒 + étoiles) et difficulté (mondes) → Task 2. ✓
- Bouton Voyage → prochain niveau ; garde-fou Jeu libre ; défaut non verrouillé → Task 3. ✓
- Style verrouillé → Task 4. ✓
- Règles : 0‑4 gratuits, 5‑10 séquentiels (≥★★ Calme), monde N+1 après 5 gratuits ≥★★ du monde N → encodées en Task 1 (`songUnlocked`/`worldUnlocked`). ✓
- Aucun nouvel état persisté (tout via `stats`/étoiles déjà synchronisées) → Task 1. ✓

**Cohérence des noms :** `starsFor(ti,di)`, `worldUnlocked(di)`, `songUnlocked(ti)`, `levelUnlocked(ti,di)`, `nextLevel()→{ti,di}` — appelés tels quels en Task 2/3. Boutons `voyageBtn`/`playBtn` définis (HTML Task 3 Step 1) puis câblés (Step 2). ✓

**Placeholders :** aucun.

**Note :** la sélection libre d'une difficulté de monde déjà débloqué pour un morceau débloqué est couverte par `levelUnlocked` (monde ET morceau). Les valeurs (≥★★, 5 gratuits) sont celles validées.
