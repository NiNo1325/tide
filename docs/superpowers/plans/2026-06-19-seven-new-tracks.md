# 7 nouvelles pistes (vocal / 90s / 80s) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter 7 pistes synthétisées (3 vocales, 2 années 90, 2 années 80) qui restent parfaitement calées sur les taps.

**Architecture:** On étend la section AUDIO de `index.html` avec 3 voix de synthèse réutilisables (`snare`/clap, `voc` chœur à formants, `stab` accord saw), on branche ces couches dans `playStep` sur la grille 1/16 existante (donc verrouillées au tempo audio), puis on ajoute 7 objets dans le tableau `TRACKS`. Aucune autre partie (scheduler, rendu, UI, persistance) ne change.

**Tech Stack:** JavaScript vanilla, Web Audio API. Pas de build, pas de test runner.

> **Vérification :** pas de framework de test (vanilla). Après chaque tâche : contrôle de syntaxe via `node --check` sur le script inline extrait, puis test **dans le navigateur** (`python -m http.server 8000` → `http://localhost:8000`, bouton **Aperçu** de chaque piste + une partie). Le service worker est en network-first → un rechargement normal sert le code frais.

---

## File Structure

| Fichier | Rôle | Action |
|---|---|---|
| `index.html` | Section AUDIO (nouvelles voix), `playStep` (nouvelles couches), tableau `TRACKS` (7 pistes). | Modifier |

Tout tient dans `index.html` (monolithe assumé du projet). Aucun fichier créé.

---

### Task 1: Ajouter les 3 voix de synthèse

**Files:**
- Modify: `index.html` — section AUDIO, juste après `failSound` (après la ligne `o.type='sawtooth';…o.stop(t+.7);}` de `failSound`, vers la ligne 353)

- [ ] **Step 1: Insérer les 3 synthés + la table de formants**

Coller ce bloc juste **après** la fonction `failSound(t){…}` et **avant** le commentaire `/* ================= TRACKS & DIFFICULTIES ================= */` :

```js
/* — Voix ajoutées pour les pistes vocal / 80s / 90s — */
function snare(t,vel,clap){vel=vel||.25;
  const hit=(tt,v)=>{const s=actx.createBufferSource(),bp=actx.createBiquadFilter(),g=actx.createGain();
    s.buffer=noiseBuf;bp.type='bandpass';bp.frequency.value=1800;bp.Q.value=.7;
    adsr(g,tt,.002,v,clap?.05:.13);s.connect(bp);bp.connect(g);g.connect(master);s.start(tt);s.stop(tt+.2);};
  if(clap){hit(t,vel*.6);hit(t+.009,vel*.85);hit(t+.018,vel);}else{hit(t,vel);}}
const FORMANTS={aah:[800,1150,2900],ooh:[300,870,2240]};
function voc(t,freqs,dur,type,gain){dur=dur||1.2;gain=gain||.3;
  const fm=FORMANTS[type]||FORMANTS.aah;
  const out=actx.createGain();
  out.gain.setValueAtTime(.0001,t);out.gain.exponentialRampToValueAtTime(gain,t+.09);
  out.gain.setValueAtTime(gain,t+Math.max(.1,dur-.5));out.gain.exponentialRampToValueAtTime(.0001,t+dur);
  const lfo=actx.createOscillator(),lfog=actx.createGain();lfo.frequency.value=5;lfog.gain.value=4;
  lfo.connect(lfog);lfo.start(t);lfo.stop(t+dur+.1);
  freqs.forEach(f=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;lfog.connect(o.detune);
    fm.forEach((ff,i)=>{const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=ff;bp.Q.value=8;
      const fg=actx.createGain();fg.gain.value=(i===0?.5:i===1?.3:.18);
      o.connect(bp);bp.connect(fg);fg.connect(out);});
    o.start(t);o.stop(t+dur+.1);});
  out.connect(master);const send=actx.createGain();send.gain.value=.25;out.connect(send);send.connect(delaySend);}
function stab(t,freqs,dur,bright){dur=dur||.22;
  const g=actx.createGain();adsr(g,t,.005,.12,dur);
  const lp=actx.createBiquadFilter();lp.type='lowpass';
  lp.frequency.setValueAtTime(bright?5200:2600,t);lp.frequency.exponentialRampToValueAtTime(bright?1400:800,t+dur);
  g.connect(lp);lp.connect(master);
  freqs.forEach((f,i)=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=(i-1)*7;
    o.connect(g);o.start(t);o.stop(t+dur+.05);});}
```

- [ ] **Step 2: Contrôle de syntaxe**

Run:
```bash
cd "c:\Users\Nicolas Notte\Dropbox\Projets Divers\Tide\tide" && python -c "import re;h=open('index.html',encoding='utf-8').read();m=re.search(r'<script>\s*\"use strict\";(.*?)</script>',h,re.S);open('_t.js','w',encoding='utf-8').write('\"use strict\";'+m.group(1))" && node --check _t.js && echo OK && rm -f _t.js
```
Expected : `OK` (aucune erreur de syntaxe).

- [ ] **Step 3: Test sonore manuel des 3 voix**

Servir le dossier (`python -m http.server 8000`), ouvrir `http://localhost:8000`, **taper une fois** sur l'écran (débloque l'audio), puis dans la Console DevTools :
```js
resumeAudio();
voc(actx.currentTime, [N(0,4),N(3,4),N(7,4)], 1.4, 'aah', .35);
snare(actx.currentTime+0.2, .3, true);
stab(actx.currentTime+0.5, [N(0,4),N(4,4),N(7,4)], .25, .7);
```
Expected : on entend un **chœur « aah »**, un **clap**, puis un **stab** d'accord. Aucune erreur console.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(audio): add snare/clap, formant choir (voc) and stab synth voices"
```

---

### Task 2: Brancher les nouvelles couches dans `playStep`

**Files:**
- Modify: `index.html` — `playStep` (vers lignes 403-422)

- [ ] **Step 1: Insérer les couches snare / stab / voc**

Dans `playStep`, juste **après** le bloc basse (le `if(combo>=4){ … bassHits … }` qui se termine par `}`) et **avant** la ligne `if(combo>=10 && sib%8===0){…pad…}`, insérer :

```js
  if(combo>=2 && T.snareSteps && T.snareSteps.indexOf(sib)>=0) snare(t, T.snareVel||.25, T.snareClap);
  if(combo>=4 && T.stabSteps && T.stabSteps.indexOf(sib)>=0){
    const chS=T.prog[Math.floor(beat/2)%T.prog.length]; stab(t, chS.pad, .22, T.stabBright);
  }
  if(T.vocSteps && T.vocSteps.indexOf(sib)>=0 && combo>=(T.lead?4:10)){
    const chV=T.prog[Math.floor(beat/2)%T.prog.length];
    voc(t, chV.pad, spbNow()*2, T.vocType||'aah', T.vocGain||(T.lead?.32:.22));
  }
```

> Noms de variables `chS`/`chV` distincts du `ch` local du bloc basse pour éviter toute collision de portée.

- [ ] **Step 2: Contrôle de syntaxe**

Run:
```bash
cd "c:\Users\Nicolas Notte\Dropbox\Projets Divers\Tide\tide" && python -c "import re;h=open('index.html',encoding='utf-8').read();m=re.search(r'<script>\s*\"use strict\";(.*?)</script>',h,re.S);open('_t.js','w',encoding='utf-8').write('\"use strict\";'+m.group(1))" && node --check _t.js && echo OK && rm -f _t.js
```
Expected : `OK`.

- [ ] **Step 3: Vérifier la non-régression des pistes existantes**

Recharger `http://localhost:8000`. Aperçu de **Tide**, **Undertow**, **Riptide**, **Maelström**.
Expected : elles sonnent **comme avant** (aucune de ces pistes ne définit `snareSteps`/`stabSteps`/`vocSteps`, donc les nouveaux `if` sont faux et rien ne s'ajoute). Aucune erreur console.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(audio): wire snare/stab/voc layers into playStep (grid-locked)"
```

---

### Task 3: Ajouter les 7 pistes au tableau `TRACKS`

**Files:**
- Modify: `index.html` — tableau `TRACKS` (juste avant la ligne de fermeture `];`, vers la ligne 386)

- [ ] **Step 1: Insérer les 7 objets piste**

Dans `const TRACKS=[ … ]`, **avant** le `];` de fermeture (après l'objet `Maelström`), coller :

```js
  { name:'Sirène', blurb:'Vocal éthéré. Chœurs « aah » planants, downtempo.', accent:'#9b8cff',
    bpm:110, keyRoot:0, bassType:'sub', bassGain:.26, bassDur:.4, bassDrive:false, bassBoost:2,
    prog:[chord(0,2,[[0,4],[3,4],[7,4]]),chord(-4,2,[[-4,4],[0,4],[3,4]]),
          chord(-2,2,[[-2,4],[2,4],[5,4]]),chord(3,2,[[3,4],[7,4],[10,4]])],
    bassHits:[[0,1],[8,1]], kickSteps:[0,8], kickGain:.9,
    hatSteps:[6,14], hatVel:.12, pentOct:[5,6],
    vocSteps:[0,8], vocType:'aah', vocGain:.32, lead:true },

  { name:'Écume', blurb:'Vocal lumineux qui monte. Chœurs « ooh », stabs.', accent:'#41e0a3',
    bpm:124, keyRoot:2, bassType:'arp', bassGain:.30, bassDur:.16, bassDrive:false, bassBoost:2.5,
    prog:[chord(2,2,[[2,4],[5,4],[9,4]]),chord(-2,2,[[-2,4],[2,4],[5,4]]),
          chord(0,2,[[0,4],[4,4],[7,4]]),chord(5,2,[[5,4],[9,4],[12,4]])],
    bassHits:[[0,1],[4,1],[8,1],[12,1]], kickSteps:[0,8], kickGain:1,
    hatSteps:[2,6,10,14], hatVel:.2, pentOct:[5,6],
    snareSteps:[4,12], snareVel:.18, snareClap:true,
    stabSteps:[0,4,8,12], stabBright:.7,
    vocSteps:[0,8], vocType:'ooh', vocGain:.30, lead:true },

  { name:'Abysse', blurb:'Vocal sombre. Chœurs « ooh » graves, sub-bass.', accent:'#5566aa',
    bpm:100, keyRoot:7, bassType:'sub', bassGain:.5, bassDur:.5, bassDrive:false, bassBoost:6,
    prog:[chord(7,1,[[7,3],[10,3],[14,3]]),chord(3,1,[[3,3],[7,3],[10,3]]),
          chord(5,1,[[5,3],[8,3],[12,3]]),chord(2,1,[[2,3],[5,3],[9,3]])],
    bassHits:[[0,1],[10,1.5]], kickSteps:[0,8], kickGain:1.05,
    hatSteps:[14], hatVel:.1, pentOct:[4,5],
    vocSteps:[0,8], vocType:'ooh', vocGain:.34, lead:true },

  { name:'Raz-de-marée', blurb:'House 90s. Four-on-floor, clap, piano stab.', accent:'#2fd0ff',
    bpm:128, keyRoot:0, bassType:'arp', bassGain:.34, bassDur:.14, bassDrive:false, bassBoost:3,
    prog:[chord(0,2,[[0,4],[3,4],[7,4]]),chord(-2,2,[[-2,4],[2,4],[5,4]]),
          chord(-4,2,[[-4,4],[0,4],[3,4]]),chord(3,2,[[3,4],[7,4],[10,4]])],
    bassHits:[[2,1],[6,1],[10,1],[14,1]], kickSteps:[0,4,8,12], kickGain:1.05,
    hatSteps:[2,6,10,14], hatVel:.26, pentOct:[5,6],
    snareSteps:[4,12], snareVel:.22, snareClap:true,
    stabSteps:[2,6,10,14], stabBright:.6 },

  { name:'Orbite', blurb:'Trance 90s. Basse roulante, nappes saw, clap.', accent:'#7b6cff',
    bpm:136, keyRoot:5, bassType:'arp', bassGain:.30, bassDur:.12, bassDrive:false, bassBoost:3,
    prog:[chord(5,2,[[5,4],[8,4],[12,4]]),chord(0,2,[[0,4],[3,4],[7,4]]),
          chord(-2,2,[[-2,4],[2,4],[5,4]]),chord(3,2,[[3,4],[7,4],[10,4]])],
    bassHits:[[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[10,1],[11,1],[12,1],[13,1],[14,1],[15,1]],
    kickSteps:[0,4,8,12], kickGain:1,
    hatSteps:[2,6,10,14], hatVel:.24, pentOct:[6,7],
    snareSteps:[4,12], snareVel:.18, snareClap:true,
    stabSteps:[0,8], stabBright:.8 },

  { name:'Néon', blurb:'Synthwave 80s. Snare gated, basse arpégée, néons.', accent:'#ff5fa2',
    bpm:115, keyRoot:0, bassType:'arp', bassGain:.32, bassDur:.16, bassDrive:false, bassBoost:3,
    prog:[chord(0,2,[[0,4],[3,4],[7,4]]),chord(-4,2,[[-4,4],[0,4],[3,4]]),
          chord(3,2,[[3,4],[7,4],[10,4]]),chord(-2,2,[[-2,4],[2,4],[5,4]])],
    bassHits:[[0,1],[2,1],[4,1],[6,1],[8,1],[10,1],[12,1],[14,1]], kickSteps:[0,8], kickGain:1,
    hatSteps:[2,6,10,14], hatVel:.2, pentOct:[5,6],
    snareSteps:[4,12], snareVel:.3, snareClap:false,
    stabSteps:[0,8], stabBright:.5 },

  { name:'Mirage', blurb:'Italo-disco 80s. Basse en octaves, claps, stabs brillants.', accent:'#ffce54',
    bpm:120, keyRoot:3, bassType:'arp', bassGain:.34, bassDur:.13, bassDrive:false, bassBoost:3,
    prog:[chord(3,2,[[3,4],[7,4],[10,4]]),chord(0,2,[[0,4],[3,4],[7,4]]),
          chord(-2,2,[[-2,4],[2,4],[5,4]]),chord(5,2,[[5,4],[9,4],[12,4]])],
    bassHits:[[0,1],[2,2],[4,1],[6,2],[8,1],[10,2],[12,1],[14,2]], kickSteps:[0,4,8,12], kickGain:1,
    hatSteps:[2,6,10,14], hatVel:.24, pentOct:[5,6],
    snareSteps:[4,12], snareVel:.22, snareClap:true,
    stabSteps:[0,4,8,12], stabBright:.85 },
```

- [ ] **Step 2: Contrôle de syntaxe**

Run:
```bash
cd "c:\Users\Nicolas Notte\Dropbox\Projets Divers\Tide\tide" && python -c "import re;h=open('index.html',encoding='utf-8').read();m=re.search(r'<script>\s*\"use strict\";(.*?)</script>',h,re.S);open('_t.js','w',encoding='utf-8').write('\"use strict\";'+m.group(1))" && node --check _t.js && echo OK && rm -f _t.js
```
Expected : `OK`.

- [ ] **Step 3: Vérifier la liste de pistes**

Recharger `http://localhost:8000` → accueil → carte **musique**.
Expected : la liste affiche **11 pistes** (les 4 d'origine + Sirène, Écume, Abysse, Raz-de-marée, Orbite, Néon, Mirage). Chacune a sa pastille de couleur.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(tracks): add 7 tracks (3 vocal, 2x90s, 2x80s)"
```

---

### Task 4: Vérification complète + déploiement

**Files:** aucun (vérification + push)

- [ ] **Step 1: Aperçu de chaque nouvelle piste**

Sur `http://localhost:8000`, écran **musique**, bouton **Aperçu** sur les 7 nouvelles.
Expected, à l'oreille :
  - **Sirène / Abysse** : chœur (aah / ooh) bien présent, ambiance posée.
  - **Écume** : chœur « ooh » + stabs + clap, montant.
  - **Raz-de-marée** : kick four-on-floor + clap sur 2/4 + stabs offbeat + basse offbeat (house).
  - **Orbite** : basse roulante en doubles-croches + clap (trance).
  - **Néon** : snare « gated » sur le backbeat + basse en croches (synthwave).
  - **Mirage** : basse en octaves + claps + stabs brillants (italo).
  Tout tombe **sur le tempo**, sans flottement.

- [ ] **Step 2: Test en jeu (rythme avec les taps)**

Choisir **Raz-de-marée** + difficulté **Flot**, jouer ~30 s en réussissant les taps.
Expected : kick/clap/stab/basse restent alignés sur les taps réussis (le combo fait monter les couches : snare dès combo≥2, stab dès ≥4, chœurs dès ≥4 sur les pistes `lead`). Aucun décalage audible, aucune erreur console.

- [ ] **Step 3: Pousser (auto-deploy Vercel)**

```bash
cd "c:\Users\Nicolas Notte\Dropbox\Projets Divers\Tide\tide"
git push origin main
```
Expected : push OK ; Vercel redéploie automatiquement.

- [ ] **Step 4: Vérifier le déploiement**

```bash
curl -s https://tide-mauve.vercel.app/ | grep -c "Raz-de-marée"
```
Expected : `1` (la nouvelle piste est servie en prod). Tester l'aperçu sur l'URL Vercel.

---

## Self-Review (effectué)

**Couverture spec :**
- 3 voix (`snare`/clap, `voc` formants, `stab`) → Task 1. ✓
- Champs de schéma optionnels (`snareSteps`/`snareVel`/`snareClap`/`stabSteps`/`stabBright`/`vocSteps`/`vocType`/`vocGain`/`lead`) → utilisés en Task 2 (lecture) et Task 3 (données). ✓
- Intégration grid-locked dans `playStep` + gating par combo → Task 2. ✓
- 7 pistes (3 vocal / 2x90s / 2x80s) avec noms, BPM, accents de la spec → Task 3. ✓
- Pistes existantes inchangées (champs optionnels absents) → vérifié Task 2 Step 3. ✓
- Aperçu/UI/persistance inchangés → aucun code touché ; vérif Task 3 Step 3. ✓

**Cohérence des noms :** `snare(t,vel,clap)`, `voc(t,freqs,dur,type,gain)`, `stab(t,freqs,dur,bright)` — définis en Task 1, appelés à l'identique en Task 2. Champs de piste lus en Task 2 == champs écrits en Task 3 (`snareSteps`, `snareVel`, `snareClap`, `stabSteps`, `stabBright`, `vocSteps`, `vocType`, `vocGain`, `lead`). ✓

**Placeholders :** aucun ; toutes les données de piste sont concrètes.

**Note d'équilibrage :** les gains (`vocGain`, `snareVel`, niveaux internes des synthés) sont des valeurs de départ raisonnables ; un ajustement fin à l'oreille est attendu en Task 4 et reste local (constantes dans les synthés / champs de piste).
