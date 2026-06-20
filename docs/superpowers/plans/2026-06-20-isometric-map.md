# Carte isométrique « archipel » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la carte plate par un archipel isométrique où le surfeur saute d'île en île (caméra suiveuse, juice).

**Architecture:** Réécriture de la section MAP de `index.html` : projection iso, chaîne d'îles `ISO_PATH`, caméra qui suit le surfeur, saut animé (arc+squash+éclaboussure+son), tap = un saut vers l'île visée / entrer si on y est. Aucune nouvelle persistance (dérive de `ORDER`/`levelUnlocked`/`starsFor`/`nextLevel`).

**Tech Stack:** JavaScript vanilla, Canvas 2D. Pas de build, pas de test runner.

> **Vérification :** `node --check` du script inline, puis test navigateur (le solo/Duo/campagne hors-carte ne changent pas).

---

### Task 1: État iso + nettoyage du hook layout

**Files:** Modify `index.html` — déclaration d'état carte (`let mapView=false,mapWorld=0,mapPos=[];`) et le hook `layout()` (`if(mapView)mapNodes();`).

- [ ] **Step 1: Remplacer la déclaration d'état carte**

Remplacer `let mapView=false,mapWorld=0,mapPos=[];` par :
```js
let mapView=false,mapWorld=0,mapCur=0,mapAnim=null;
let camX=0,camY=0,mapParts=[];
const ISO_PATH=[[0,0],[1,0],[1,1],[2,1],[2,2],[3,2],[3,3],[4,3],[4,4],[5,4],[5,5]];
```

- [ ] **Step 2: Retirer l'appel `mapNodes()` du resize**

Dans `layout()`, supprimer la ligne `if(mapView)mapNodes();` (les positions iso sont calculées à chaque frame, responsives).

- [ ] **Step 3: Contrôle de syntaxe**

Run:
```bash
cd "c:\Users\Nicolas Notte\Dropbox\Projets Divers\Tide\tide" && python -c "import re;h=open('index.html',encoding='utf-8').read();m=re.search(r'<script>\s*\"use strict\";(.*?)</script>',h,re.S);open('_t.js','w',encoding='utf-8').write('\"use strict\";'+m.group(1))" && node --check _t.js && echo OK && rm -f _t.js
```
Expected : `OK` (note : `mapNodes`/`drawMap`/`mapTap` encore présents, remplacés en Task 2).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "refactor(map): iso state scaffolding (path, camera, particles)"
```

---

### Task 2: Réécrire la section MAP en isométrique

**Files:** Modify `index.html` — remplacer tout le bloc de `function mapNodes(){…}` jusqu'à la fin de `function mapTap(…){…}` (la section `/* === MAP === */`).

- [ ] **Step 1: Remplacer `mapNodes`/`openMap`/`closeMap`/`drawMap`/`mapTap`**

Remplacer l'intégralité du bloc (de `function mapNodes(){` jusqu'au `}` final de `mapTap`) par :
```js
function isoTW(){return Math.min(W*0.42,150);}
function isoXY(gx,gy){const TW=isoTW(),TH=TW*0.5;return {ix:(gx-gy)*TW/2, iy:(gx+gy)*TH/2};}
function isoScreen(k){const c=ISO_PATH[k],p=isoXY(c[0],c[1]);return {x:W/2+p.ix-camX, y:H*0.34+p.iy-camY};}
function surferIso(){
  if(mapAnim){const t=Math.min(1,(performance.now()-mapAnim.t0)/280);
    const a=isoXY(ISO_PATH[mapAnim.from][0],ISO_PATH[mapAnim.from][1]);
    const b=isoXY(ISO_PATH[mapAnim.to][0],ISO_PATH[mapAnim.to][1]);
    return {ix:a.ix+(b.ix-a.ix)*t, iy:a.iy+(b.iy-a.iy)*t, t};}
  const c=isoXY(ISO_PATH[mapCur][0],ISO_PATH[mapCur][1]);return {ix:c.ix,iy:c.iy,t:1};
}
function mapCenterCam(){const s=surferIso();camX=s.ix;camY=s.iy;}
function openMap(){const nl=nextLevel();mapWorld=nl.di;mapCur=pos(nl.ti);mapAnim=null;mapParts=[];
  mapCenterCam();mapView=true;showScreen(null);$('mapBack').style.display='block';}
function closeMap(){mapView=false;$('mapBack').style.display='none';refreshHome();showScreen('home');}
function mapSetWorld(d){mapWorld=Math.max(0,Math.min(3,d));const nl=nextLevel();
  mapCur=(nl.di===mapWorld)?pos(nl.ti):0;mapAnim=null;mapCenterCam();}
function spawnSplash(x,y){for(let i=0;i<12;i++){const a=Math.random()*Math.PI*2,sp=1+Math.random()*3;
  mapParts.push({x,y,vx:Math.cos(a)*sp,vy:-Math.abs(Math.sin(a)*sp)-1,life:1});}}
function drawMapParts(){for(let i=mapParts.length-1;i>=0;i--){const p=mapParts[i];
  p.x+=p.vx;p.y+=p.vy;p.vy+=.18;p.life-=.04;if(p.life<=0){mapParts.splice(i,1);continue;}
  ctx.fillStyle=`rgba(200,240,255,${p.life})`;ctx.beginPath();ctx.arc(p.x,p.y,2.6*p.life,0,Math.PI*2);ctx.fill();}}
function hop(nk){mapAnim={from:mapCur,to:nk,t0:performance.now()};
  try{resumeAudio();blip(actx.currentTime,N(0,6),.18,true);}catch(e){}}
function drawMap(){
  const di=mapWorld,TW=isoTW(),TH=TW*0.5;
  // fin de saut
  if(mapAnim && performance.now()-mapAnim.t0>=280){const to=mapAnim.to;mapCur=to;mapAnim=null;
    const sp=isoScreen(to);spawnSplash(sp.x,sp.y);
    try{resumeAudio();pluck(actx.currentTime,N(5,5),.18,false);}catch(e){}}
  // caméra suit le surfeur
  const s=surferIso();camX+=(s.ix-camX)*0.14;camY+=(s.iy-camY)*0.14;
  // pontons
  for(let k=0;k<ISO_PATH.length-1;k++){const a=isoScreen(k),b=isoScreen(k+1),unlocked=levelUnlocked(ORDER[k+1],di);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineWidth=6;
    ctx.setLineDash(unlocked?[]:[5,9]);ctx.strokeStyle=unlocked?'rgba(255,236,180,.30)':'rgba(255,255,255,.10)';ctx.stroke();}
  ctx.setLineDash([]);
  // îles
  const rx=TW*0.34,ry=rx*0.5;
  for(let k=0;k<ISO_PATH.length;k++){
    const ti=ORDER[k],p=isoScreen(k),unlocked=levelUnlocked(ti,di),st=starsFor(ti,di),a=unlocked?hexToRgb(TRACKS[ti].accent):[57,71,79];
    ctx.fillStyle='rgba(0,0,0,.20)';ctx.beginPath();ctx.ellipse(p.x,p.y+12,rx*1.05,ry*1.05,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=`rgb(${Math.round(a[0]*.5)},${Math.round(a[1]*.5)},${Math.round(a[2]*.5)})`;
    ctx.beginPath();ctx.ellipse(p.x,p.y+11,rx,ry,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=unlocked?TRACKS[ti].accent:'#39474f';
    ctx.beginPath();ctx.ellipse(p.x,p.y,rx,ry,0,0,Math.PI*2);ctx.fill();
    ctx.lineWidth=2;ctx.strokeStyle='rgba(255,255,255,.45)';ctx.stroke();
    if(k===mapCur){const pulse=.45+.2*Math.sin(performance.now()/280);
      ctx.strokeStyle=`rgba(255,236,180,${pulse})`;ctx.lineWidth=3;
      ctx.beginPath();ctx.ellipse(p.x,p.y,rx+7,ry+7,0,0,Math.PI*2);ctx.stroke();}
    ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillStyle=unlocked?'#04141f':'rgba(234,251,255,.55)';
    ctx.font='700 15px -apple-system,Helvetica,Arial,sans-serif';ctx.fillText(unlocked?String(k+1):'🔒',p.x,p.y+5);
    ctx.font='12px -apple-system,Helvetica,Arial,sans-serif';ctx.fillStyle='#ffd98a';
    ctx.fillText('★'.repeat(st)+'☆'.repeat(3-st),p.x,p.y-ry-8);
    if(k===mapCur+1 && unlocked){const bob=Math.sin(performance.now()/250)*3;
      ctx.fillStyle='rgba(255,236,180,.9)';ctx.font='700 18px -apple-system,Helvetica,Arial,sans-serif';
      ctx.fillText('▾',p.x,p.y-ry-24+bob);}
  }
  // surfeur (arc de saut + bobbing)
  const ss=surferIso(),sx=W/2+ss.ix-camX,syB=H*0.34+ss.iy-camY;
  const arc=mapAnim?-Math.sin(Math.PI*ss.t)*(TH*1.6):Math.sin(performance.now()/280)*4;
  drawSurfer(sx,syB-20+arc,SURFER_MAP);
  drawMapParts();
  // en-tête + flèches (espace écran)
  ctx.textAlign='center';ctx.fillStyle='rgba(234,251,255,.95)';
  ctx.font='600 16px -apple-system,Helvetica,Arial,sans-serif';
  ctx.fillText('MONDE '+(di+1)+' · '+DIFFS[di].name, W/2, H*0.085);
  ctx.font='600 26px -apple-system,Helvetica,Arial,sans-serif';
  ctx.fillStyle=di>0?'rgba(234,251,255,.8)':'rgba(234,251,255,.25)';ctx.fillText('‹', W*0.12, H*0.09);
  ctx.fillStyle=di<3?'rgba(234,251,255,.8)':'rgba(234,251,255,.25)';ctx.fillText('›', W*0.88, H*0.09);
  let tot=0;for(let i=0;i<TRACKS.length;i++)tot+=starsFor(i,di);
  ctx.font='600 13px -apple-system,Helvetica,Arial,sans-serif';ctx.fillStyle='#ffd98a';
  ctx.fillText('★ '+tot+' / '+(TRACKS.length*3), W/2, H*0.085+20);
  if(!worldUnlocked(di)){ctx.fillStyle='rgba(255,154,138,.9)';ctx.fillText('🔒 monde verrouillé', W/2, H*0.085+40);}
}
function mapTap(x,y){
  if(mapAnim)return;
  if(y<H*0.14){ if(x<W*0.33){mapSetWorld(mapWorld-1);} else if(x>W*0.67){mapSetWorld(mapWorld+1);} return; }
  let best=-1,bd=1e9;
  for(let k=0;k<ISO_PATH.length;k++){const p=isoScreen(k),d=Math.hypot(x-p.x,y-p.y);if(d<bd){bd=d;best=k;}}
  if(best<0||bd>52)return;
  if(best===mapCur){
    const ti=ORDER[mapCur];
    if(levelUnlocked(ti,mapWorld)){mapView=false;$('mapBack').style.display='none';
      selTrack=ti;selDiff=mapWorld;try{resumeAudio();pluck(actx.currentTime,N(7,5),.3,true);}catch(e){}startGame();}
    else toast('Niveau verrouillé 🔒');
    return;
  }
  const dir=best>mapCur?1:-1,nk=mapCur+dir;
  if(nk<0||nk>=ISO_PATH.length)return;
  if(dir>0 && !levelUnlocked(ORDER[nk],mapWorld)){toast('Niveau verrouillé 🔒');return;}
  hop(nk);
}
```

- [ ] **Step 2: Contrôle de syntaxe + grep anti-restes**

Run:
```bash
cd "c:\Users\Nicolas Notte\Dropbox\Projets Divers\Tide\tide" && python -c "import re;h=open('index.html',encoding='utf-8').read();m=re.search(r'<script>\s*\"use strict\";(.*?)</script>',h,re.S);open('_t.js','w',encoding='utf-8').write('\"use strict\";'+m.group(1))" && node --check _t.js && echo OK && rm -f _t.js
grep -nE "mapPos|mapNodes" index.html || echo "no stale refs"
```
Expected : `OK`, puis `no stale refs`.

- [ ] **Step 3: Test navigateur**

`python -m http.server 8000` → Voyage : archipel iso, surfeur sur le front, caméra centrée. Taper l'île devant → le surfeur **bondit** (arc + éclaboussure + son) ; taper l'île courante → lance le niveau ; île verrouillée → refus. Flèches ‹ › → changement de monde. Retour OK.

- [ ] **Step 4: Commit + push**

```bash
cd "c:\Users\Nicolas Notte\Dropbox\Projets Divers\Tide\tide"
git add index.html
git commit -m "feat(map): isometric archipelago with hop-to-move and camera follow"
git push origin main
```
Expected : push OK ; Vercel redéploie.

---

### Task 3: Vérification de bout en bout

- [ ] **Step 1: Déploiement servi**

```bash
curl -s "https://tide-mauve.vercel.app/?cb=$(date +%s)" | grep -c "ISO_PATH"
```
Expected : ≥ `1`.

- [ ] **Step 2: Parcours prod** : Voyage iso jouable (saut, caméra, mondes, verrous, étoiles, entrée niveau) ; solo/Duo/Jeu libre/campagne inchangés.

---

## Self-Review (effectué)

**Couverture spec :**
- Projection iso + îles + eau (drawBg) + caméra suiveuse → Task 2 (`isoXY`/`isoScreen`/`drawMap` + easing). ✓
- Chaîne d'îles `ISO_PATH` (serpentin), pontons (pointillé si verrouillé) → Task 1/2. ✓
- Saut sur tap (un cran vers l'île visée), tap courant = entrer, refus si verrouillé, input bloqué pendant le saut → Task 2 (`mapTap`/`hop`). ✓
- Juice : arc parabolique + éclaboussure + son décollage/atterrissage + pulse île + indice ▾ + bobbing → Task 2. ✓
- Flèches monde, en-tête, étoiles/verrous, ordre BPM (`ORDER`) → Task 2. ✓
- Aucune persistance nouvelle ; reste du jeu inchangé → tout dérive de l'existant. ✓

**Cohérence des noms :** `mapCur`, `mapAnim`, `camX/camY`, `mapParts`, `ISO_PATH`, `isoTW/isoXY/isoScreen`, `surferIso`, `mapCenterCam`, `openMap/closeMap/mapSetWorld`, `hop`, `spawnSplash/drawMapParts`, `drawMap`, `mapTap` — cohérents ; `mapPos`/`mapNodes` supprimés (grep Step 2). `openMap`/`closeMap`/`drawMap`/`mapTap` gardent les mêmes noms (appelés par `loop`/`voyageBtn`/`mapBack`/pointerdown). ✓

**Placeholders :** aucun.

**Note :** dimensions iso (`TW`, `H*0.34`, rayons) et durée de saut (280 ms) = points de départ, ajustables après test.
