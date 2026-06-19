# Morceaux finis + complétion (#1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre chaque partie finie (longueur fixe) avec un écran de complétion (% + étoiles), au lieu du jeu endless.

**Architecture:** Dans `index.html` : `genNodes` plafonne à `SONG_LEN` nœuds ; `success` déclenche `songDone()` au dernier nœud (nouvel état `done`, outro douce, pas de game over) ; persistance étendue (`pct`/`cleared`/`stars`) en local et dans Firestore (`js/firebase.js`) ; écran de résultat et barre de progression HUD. Une erreur reste un game over.

**Tech Stack:** JavaScript vanilla, Web Audio, Canvas. Pas de build, pas de test runner.

> **Vérification :** pas de framework de test. Après chaque tâche : `node --check` sur le script inline extrait, puis test **dans le navigateur** (`python -m http.server 8000`). SW network-first → rechargement normal sert le code frais.

---

### Task 1: Morceaux finis + fin de morceau

**Files:**
- Modify: `index.html` — `const DEBOUNCE` (≈580), `game` (581-583), `genNodes` (585-597), `startGame` (599-611), `success` (634-643).

- [ ] **Step 1: Ajouter la constante de longueur**

Juste après `const DEBOUNCE=.09;` (≈580), ajouter :
```js
const SONG_LEN=36;   // nombre de nœuds (taps) par morceau — base campagne
```

- [ ] **Step 2: Ajouter `total` à l'état `game`**

Remplacer `  deathT:0,target:0};` (fin de l'objet `game`, ligne 583) par :
```js
  deathT:0,target:0,total:0};
```

- [ ] **Step 3: Plafonner la génération à `game.total`**

Remplacer toute la fonction `genNodes` (585-597) par :
```js
function genNodes(upto){
  const D=DIFFS[selDiff];
  while(game.genBeat<=upto){
    if(game.nodes.length>=game.total)return;       // morceau plein
    const b=game.genBeat,adds=[b];
    if(b>2){
      const prog=Math.min(game.score/45,1),dens=D.dens0+(D.densMax-D.dens0)*prog;
      if(Math.random()<dens)adds.push(b+0.5);
      if(D.sixteenth){const dq=dens*.5;if(Math.random()<dq)adds.push(b+0.25);if(Math.random()<dq)adds.push(b+0.75);}
    }
    adds.sort((x,y)=>x-y);
    for(const bb of adds){ if(game.nodes.length>=game.total)break; game.nodes.push({beat:bb,y:nodeY(bb)}); }
    game.genBeat++;
  }
}
```

- [ ] **Step 4: Fixer la longueur au démarrage**

Dans `startGame` (599-611), juste après la ligne `game.judge=null;game.shake=0;game.spb=spbNow();`, ajouter :
```js
  game.total=SONG_LEN;
```

- [ ] **Step 5: Déclencher la fin au dernier nœud**

À la fin de `success(i,perfect)` (juste après `if(perfect)game.shake=Math.min(game.shake+6,10);`, avant le `}` de la fonction), ajouter :
```js
  if(game.nextNode>=game.total) songDone();
```

- [ ] **Step 6: Ajouter `songDone()` juste après `gameOver()` (après la ligne 651 `}`)**

```js
function songDone(){
  if(game.state!=='play')return;
  game.state='done';game.deathT=actx?actx.currentTime:0;
  stopScheduler();
  if(master)master.gain.exponentialRampToValueAtTime(.0001,actx.currentTime+.6);
  const pct=Math.round(game.perfects/Math.max(1,game.total)*100);
  const stars=pct>=100?3:pct>=70?2:1;
  recordCompletion(selTrack,selDiff,game.score,game.perfects,pct,stars);
  showOver();
}
```

> `recordCompletion` est défini en Task 2 ; `showOver` géré en Task 3. Pour que cette tâche soit
> vérifiable seule, ajouter un **stub temporaire** juste au-dessus de `songDone` (remplacé en Task 2) :
> ```js
> function recordCompletion(){ /* Task 2 */ }
> ```

- [ ] **Step 7: Contrôle de syntaxe**

Run:
```bash
cd "c:\Users\Nicolas Notte\Dropbox\Projets Divers\Tide\tide" && python -c "import re;h=open('index.html',encoding='utf-8').read();m=re.search(r'<script>\s*\"use strict\";(.*?)</script>',h,re.S);open('_t.js','w',encoding='utf-8').write('\"use strict\";'+m.group(1))" && node --check _t.js && echo OK && rm -f _t.js
```
Expected : `OK`.

- [ ] **Step 8: Test dans le navigateur**

`python -m http.server 8000` → jouer une partie en réussissant les taps.
Expected : après ~36 taps réussis, la partie **se termine toute seule** (l'écran de game over actuel s'affiche, sans son d'échec) au lieu de continuer indéfiniment. Une erreur avant la fin → game over comme avant.

- [ ] **Step 9: Commit**

```bash
git add index.html
git commit -m "feat(game): finite songs (SONG_LEN) with songDone end state"
```

---

### Task 2: Persistance de la complétion (local + Firestore)

**Files:**
- Modify: `index.html` — `recordScore` (283-291) + nouveau `recordCompletion` ; `syncFromCloud`.
- Modify: `js/firebase.js` — `saveScore` (70-78), `fetchMyScores` (80-88).

- [ ] **Step 1: Remplacer le stub `recordCompletion` par la vraie fonction**

Remplacer `function recordCompletion(){ /* Task 2 */ }` par :
```js
function recordCompletion(ti,di,score,perfects,pct,stars){
  const key=ti+'|'+di;const p=curProfile();
  if(p){const s=p.stats[key]||{best:0,plays:0,pct:0,cleared:false,stars:0};
    s.plays++;if(score>s.best)s.best=score;
    s.cleared=true;if(pct>(s.pct||0))s.pct=pct;if(stars>(s.stars||0))s.stars=stars;
    p.stats[key]=s;
    p.history.unshift({ti,di,score,ts:Date.now(),pct});if(p.history.length>40)p.history.pop();persist();
    if(window.tideFb&&window.tideFb.user){window.tideFb.saveScore(ti,di,s.best,s.plays,s.pct||0,s.cleared||false,s.stars||0).catch(()=>{});}
  } else {if(!sessionBest[key]||score>sessionBest[key])sessionBest[key]=score;}
}
```

- [ ] **Step 2: Faire passer les champs de complétion par `recordScore`**

Dans `recordScore` (283-291), remplacer la ligne d'envoi cloud :
```js
    if(window.tideFb && window.tideFb.user){ window.tideFb.saveScore(ti,di,s.best,s.plays).catch(()=>{}); }
```
par :
```js
    if(window.tideFb && window.tideFb.user){ window.tideFb.saveScore(ti,di,s.best,s.plays,s.pct||0,s.cleared||false,s.stars||0).catch(()=>{}); }
```

- [ ] **Step 3: Étendre `saveScore` (js/firebase.js)**

Remplacer la fonction `api.saveScore` (70-78) par :
```js
api.saveScore = async function(ti,di,best,plays,pct,cleared,stars){
  const u = api.user; if(!u) return;
  const { db, doc, setDoc, serverTimestamp } = api._db;
  const id = `${u.uid}_${ti}_${di}`;
  await setDoc(doc(db,'scores',id), {
    uid:u.uid, displayName:u.displayName||'Joueur', photoURL:u.photoURL||'',
    ti, di, best, plays, pct:pct||0, cleared:!!cleared, stars:stars||0, updatedAt: serverTimestamp()
  }, { merge:true });
};
```

- [ ] **Step 4: Étendre `fetchMyScores` (js/firebase.js)**

Dans `api.fetchMyScores` (80-88), remplacer la ligne :
```js
  snap.forEach(d => { const s=d.data(); out[`${s.ti}|${s.di}`] = { best:s.best||0, plays:s.plays||0 }; });
```
par :
```js
  snap.forEach(d => { const s=d.data(); out[`${s.ti}|${s.di}`] = { best:s.best||0, plays:s.plays||0, pct:s.pct||0, cleared:!!s.cleared, stars:s.stars||0 }; });
```

- [ ] **Step 5: Étendre la fusion dans `syncFromCloud` (index.html)**

Dans `syncFromCloud`, remplacer la boucle de fusion descendante :
```js
    for(const key in cloud){
      const c = cloud[key], l = p.stats[key]||{best:0,plays:0};
      p.stats[key] = { best:Math.max(c.best,l.best), plays:Math.max(c.plays,l.plays) };
    }
```
par :
```js
    for(const key in cloud){
      const c = cloud[key], l = p.stats[key]||{best:0,plays:0,pct:0,cleared:false,stars:0};
      p.stats[key] = { best:Math.max(c.best,l.best), plays:Math.max(c.plays,l.plays),
        pct:Math.max(c.pct||0,l.pct||0), cleared:!!(c.cleared||l.cleared), stars:Math.max(c.stars||0,l.stars||0) };
    }
```
Et la boucle d'envoi montante :
```js
    for(const key in p.stats){
      const l = p.stats[key], c = cloud[key];
      if(!c || l.best>c.best){ const [ti,di]=key.split('|').map(Number); await window.tideFb.saveScore(ti,di,l.best,l.plays); }
    }
```
par :
```js
    for(const key in p.stats){
      const l = p.stats[key], c = cloud[key];
      if(!c || l.best>c.best || (l.pct||0)>(c.pct||0)){ const [ti,di]=key.split('|').map(Number);
        await window.tideFb.saveScore(ti,di,l.best,l.plays,l.pct||0,l.cleared||false,l.stars||0); }
    }
```

- [ ] **Step 6: Contrôle de syntaxe**

Run:
```bash
cd "c:\Users\Nicolas Notte\Dropbox\Projets Divers\Tide\tide" && node --check js/firebase.js && python -c "import re;h=open('index.html',encoding='utf-8').read();m=re.search(r'<script>\s*\"use strict\";(.*?)</script>',h,re.S);open('_t.js','w',encoding='utf-8').write('\"use strict\";'+m.group(1))" && node --check _t.js && echo OK && rm -f _t.js
```
Expected : `OK`.

- [ ] **Step 7: Test**

Finir un morceau (connecté Google), puis console Firebase → Firestore → doc `scores/{uid}_{ti}_{di}`.
Expected : le doc porte `pct`, `cleared:true`, `stars` en plus de `best`/`plays`. Recharger : la complétion est conservée.

- [ ] **Step 8: Commit**

```bash
git add index.html js/firebase.js
git commit -m "feat(game): persist completion (pct/cleared/stars) local + firestore"
```

---

### Task 3: Écran de résultat de fin de morceau

**Files:**
- Modify: `index.html` — `showOver` (887-903).

- [ ] **Step 1: Ajouter la branche `done` dans `showOver`**

Remplacer la fonction `showOver` (887-903) par :
```js
function showOver(){
  $('finalScore').textContent=game.score;
  if(pendingChallenge){
    const win=game.score>pendingChallenge.s;
    $('overTitle').textContent='résultat du défi';
    $('overResult').innerHTML=`<div class="result ${win?'win':'lose'}">${win?'défi relevé ✓':'pas cette fois'}</div>`;
    $('overSub').innerHTML=`toi <b>${game.score}</b> &nbsp;·&nbsp; ${pendingChallenge.n} <b>${pendingChallenge.s}</b>`;
    $('challengeFriendBtn').textContent='⚡ Renvoyer un défi';
  }else if(game.state==='done'){
    const pct=Math.round(game.perfects/Math.max(1,game.total)*100);
    const stars=pct>=100?3:pct>=70?2:1;
    const starStr='★'.repeat(stars)+'☆'.repeat(3-stars);
    $('overTitle').textContent=pct>=100?'parfait !':'morceau terminé';
    $('overResult').innerHTML=`<div class="result win">${pct}%</div>`+
      `<div class="row" style="font-size:24px;letter-spacing:.25em;color:var(--gold)">${starStr}</div>`;
    const st=(curProfile()&&curProfile().stats[selTrack+'|'+selDiff])||{};
    $('overSub').innerHTML='meilleur&nbsp;<b>'+(st.pct||pct)+'%</b>';
    $('challengeFriendBtn').textContent='⚡ Défier un ami';
  }else{
    $('overTitle').textContent='la vague s’est brisée';
    $('overResult').innerHTML=(game.perfects?`<div class="row">${game.perfects} perfect</div>`:'');
    const best=bestFor(selTrack,selDiff);
    $('overSub').innerHTML='record&nbsp;<b id="bestScore">'+best+'</b>';
    $('challengeFriendBtn').textContent='⚡ Défier un ami';
  }
  showScreen('over');
}
```

- [ ] **Step 2: Contrôle de syntaxe**

Run:
```bash
cd "c:\Users\Nicolas Notte\Dropbox\Projets Divers\Tide\tide" && python -c "import re;h=open('index.html',encoding='utf-8').read();m=re.search(r'<script>\s*\"use strict\";(.*?)</script>',h,re.S);open('_t.js','w',encoding='utf-8').write('\"use strict\";'+m.group(1))" && node --check _t.js && echo OK && rm -f _t.js
```
Expected : `OK`.

- [ ] **Step 3: Test**

Finir un morceau proprement (que des perfect si possible) puis avec quelques « good ».
Expected : écran « parfait ! 100 % ★★★ » si tout perfect ; sinon « morceau terminé — N % » avec ★★☆/★☆☆. Le meilleur % s'affiche. Game over (erreur) affiche toujours « la vague s'est brisée ».

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(ui): completion result screen (percent + stars)"
```

---

### Task 4: Barre de progression HUD

**Files:**
- Modify: `index.html` — `drawHUD` (756-772).

- [ ] **Step 1: Ajouter la barre en haut de `drawHUD`**

Juste après `function drawHUD(){` (ligne 756), insérer :
```js
  const prog=game.total?Math.max(0,Math.min(1,game.nextNode/game.total)):0;
  const bw=W*.6,bx=W*.2,by=H*.06;
  ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(bx,by,bw,4);
  ctx.fillStyle=`rgba(${ACC[0]},${ACC[1]},${ACC[2]},.9)`;ctx.fillRect(bx,by,bw*prog,4);
```

- [ ] **Step 2: Contrôle de syntaxe**

Run:
```bash
cd "c:\Users\Nicolas Notte\Dropbox\Projets Divers\Tide\tide" && python -c "import re;h=open('index.html',encoding='utf-8').read();m=re.search(r'<script>\s*\"use strict\";(.*?)</script>',h,re.S);open('_t.js','w',encoding='utf-8').write('\"use strict\";'+m.group(1))" && node --check _t.js && echo OK && rm -f _t.js
```
Expected : `OK`.

- [ ] **Step 3: Test**

Jouer.
Expected : une barre fine en haut se remplit au fil des taps réussis et arrive à plein juste avant la fin du morceau.

- [ ] **Step 4: Commit + push**

```bash
cd "c:\Users\Nicolas Notte\Dropbox\Projets Divers\Tide\tide"
git add index.html
git commit -m "feat(ui): song progress bar in HUD"
git push origin main
```
Expected : push OK ; Vercel redéploie.

---

### Task 5: Vérification de bout en bout

- [ ] **Step 1: Déploiement servi**

```bash
curl -s https://tide-mauve.vercel.app/ | grep -c "songDone"
```
Expected : `1`.

- [ ] **Step 2: Parcours complet en prod**

Sur l'URL Vercel : finir un morceau → écran % + étoiles ; rejouer et viser 100 % ; faire une erreur → game over ; vérifier que le meilleur % est conservé après rechargement (et dans Firestore si connecté).
Expected : tout conforme aux critères de la spec.

---

## Self-Review (effectué)

**Couverture spec :**
- Longueur fixe `SONG_LEN`, fin de morceau, plus d'endless → Task 1. ✓
- État `done`, outro sans `failSound`, erreur=game over conservé → Task 1 (songDone) + condition `state!=='play'`. ✓
- % = perfects/total, cleared, étoiles (cleared/≥70/100) → Task 1 (calcul) + Task 2 (stockage) + Task 3 (affichage). ✓
- Persistance `{best,plays,pct,cleared,stars}` local + Firestore + fusion → Task 2. ✓
- Écran de résultat → Task 3. ✓
- Barre de progression HUD → Task 4. ✓

**Cohérence des noms :** `SONG_LEN`, `game.total`, `songDone()`, `recordCompletion(ti,di,score,perfects,pct,stars)`, `saveScore(ti,di,best,plays,pct,cleared,stars)`, `fetchMyScores` (renvoie pct/cleared/stars) — signatures alignées entre Task 1/2/3 et les deux appelants (`recordScore`, `recordCompletion`, `syncFromCloud`). Stub `recordCompletion` (Task 1) remplacé en Task 2. ✓

**Placeholders :** aucun (le seul stub est explicitement remplacé en Task 2).

**Note :** `SONG_LEN=36` est une valeur de départ ; l'ajustement de longueur/difficulté par morceau est le sous-projet #2.
