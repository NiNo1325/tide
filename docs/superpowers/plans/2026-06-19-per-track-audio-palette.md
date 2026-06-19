# Palette audio par piste — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le chœur `voc` réellement vocal et audible, et donner à chaque piste son propre son de tap réussi.

**Architecture:** Trois changements dans la section AUDIO/MUSIC de `index.html` : (1) réécrire `voc` (chœur désaccordé + 4 formants + vibrato + souffle) et couper la nappe `pad` sur les pistes `lead` ; (2) ajouter 3 synthés de tap mélodiques (`bell`, `pianoNote`, `blip`) + un aiguilleur `hitSound` appelé par `success()` ; (3) ajouter le champ `hitVoice` aux 11 pistes.

**Tech Stack:** JavaScript vanilla, Web Audio API. Pas de build, pas de test runner.

> **Vérification :** pas de framework de test. Après chaque tâche : `node --check` sur le script inline extrait, puis test **à l'oreille** dans le navigateur (`python -m http.server 8000`, Aperçu + une partie). SW network-first → rechargement normal sert le code frais.

---

### Task 1: Chœur `voc` amélioré + démasquage du pad

**Files:**
- Modify: `index.html` — fonction `voc` (section AUDIO) ; ligne `pad` dans `playStep`.

- [ ] **Step 1: Réécrire `voc`**

Remplacer toute la fonction `voc(t,freqs,dur,type,gain){…}` actuelle par :

```js
const FORMANTS={aah:[800,1150,2900,3900],ooh:[300,870,2240,3000]};
function voc(t,freqs,dur,type,gain){dur=dur||1.2;gain=gain||.3;
  const fm=FORMANTS[type]||FORMANTS.aah;
  const fgains=[1,.55,.32,.16];               // F1 dominant
  const out=actx.createGain();
  out.gain.setValueAtTime(.0001,t);out.gain.exponentialRampToValueAtTime(gain,t+.12);
  out.gain.setValueAtTime(gain,t+Math.max(.15,dur-.5));out.gain.exponentialRampToValueAtTime(.0001,t+dur);
  // vibrato partagé (~5.5 Hz, ±12 cents)
  const lfo=actx.createOscillator(),lfog=actx.createGain();lfo.frequency.value=5.5;lfog.gain.value=12;
  lfo.connect(lfog);lfo.start(t);lfo.stop(t+dur+.1);
  // banc de formants partagé par tous les oscillateurs de l'accord
  const banks=fm.map((ff,i)=>{const bp=actx.createBiquadFilter();bp.type='bandpass';
    bp.frequency.value=ff;bp.Q.value=(i===0?7:i===1?9:10);
    const fg=actx.createGain();fg.gain.value=fgains[i];bp.connect(fg);fg.connect(out);return bp;});
  const feed=src=>banks.forEach(bp=>src.connect(bp));
  freqs.forEach(f=>{
    [-7,0,7].forEach(det=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=f;
      o.detune.value=det;lfog.connect(o.detune);feed(o);o.start(t);o.stop(t+dur+.1);});
    const ob=actx.createOscillator();ob.type='sawtooth';ob.frequency.value=f/2; // octave grave, corps
    const obg=actx.createGain();obg.gain.value=.4;lfog.connect(ob.detune);ob.connect(obg);feed(obg);
    ob.start(t);ob.stop(t+dur+.1);
  });
  // souffle léger autour de F2
  const ns=actx.createBufferSource();ns.buffer=noiseBuf;ns.loop=true;
  const nbp=actx.createBiquadFilter();nbp.type='bandpass';nbp.frequency.value=fm[1];nbp.Q.value=2;
  const ng=actx.createGain();ng.gain.value=.06;ns.connect(nbp);nbp.connect(ng);ng.connect(out);
  ns.start(t);ns.stop(t+dur+.1);
  out.connect(master);const send=actx.createGain();send.gain.value=.3;out.connect(send);send.connect(delaySend);}
```

> Note : la déclaration `const FORMANTS=…` existe déjà au-dessus de `voc` (ajoutée précédemment). La remplacer par cette version à 4 formants **et supprimer l'ancienne ligne `const FORMANTS={aah:[800,1150,2900],ooh:[300,870,2240]};`** pour éviter une double déclaration (`const` en double = erreur). Concrètement : remplacer l'ancien couple (ligne `const FORMANTS=…` + fonction `voc`) par le bloc ci-dessus.

- [ ] **Step 2: Couper la nappe `pad` sur les pistes vocales**

Dans `playStep`, remplacer la ligne :
```js
  if(combo>=10 && sib%8===0){const ch=T.prog[Math.floor(beat/2)%T.prog.length];pad(t,ch.pad,spbNow()*2);}
```
par :
```js
  if(combo>=10 && sib%8===0 && !T.lead){const ch=T.prog[Math.floor(beat/2)%T.prog.length];pad(t,ch.pad,spbNow()*2);}
```

- [ ] **Step 3: Contrôle de syntaxe**

Run:
```bash
cd "c:\Users\Nicolas Notte\Dropbox\Projets Divers\Tide\tide" && python -c "import re;h=open('index.html',encoding='utf-8').read();m=re.search(r'<script>\s*\"use strict\";(.*?)</script>',h,re.S);open('_t.js','w',encoding='utf-8').write('\"use strict\";'+m.group(1))" && node --check _t.js && echo OK && rm -f _t.js
```
Expected : `OK`.

- [ ] **Step 4: Test à l'oreille**

`python -m http.server 8000` → `http://localhost:8000`, taper une fois, puis Console :
```js
resumeAudio();
voc(actx.currentTime,[N(0,4),N(3,4),N(7,4)],1.6,'aah',.34);
setTimeout(()=>voc(actx.currentTime,[N(0,3),N(3,3),N(7,3)],1.6,'ooh',.34),1800);
```
Expected : un chœur « aah » large et audible, puis un « ooh » distinct (plus fermé/sombre). Aperçu de **Sirène** : le chœur domine, plus de nappe « cuivre » par-dessus.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(audio): richer audible formant choir + unmask on lead tracks"
```

---

### Task 2: Ajouter les synthés de tap (bell, pianoNote, blip)

**Files:**
- Modify: `index.html` — section AUDIO, après `failSound` (à côté de snare/voc/stab déjà ajoutés).

- [ ] **Step 1: Insérer les 3 synthés**

Coller juste après la fonction `stab(…){…}` (et avant le commentaire `/* ================= TRACKS`) :

```js
function bell(t,freq,vel,bright){vel=vel||.3;
  const car=actx.createOscillator(),mod=actx.createOscillator(),mg=actx.createGain(),g=actx.createGain();
  car.type='sine';mod.type='sine';car.frequency.value=freq;mod.frequency.value=freq*(bright?3.01:2.01);
  mg.gain.setValueAtTime(freq*(bright?1.6:1.0),t);mg.gain.exponentialRampToValueAtTime(freq*.2,t+.25);
  mod.connect(mg);mg.connect(car.frequency);
  adsr(g,t,.004,vel,bright?.5:.7);car.connect(g);g.connect(master);
  const send=actx.createGain();send.gain.value=.3;g.connect(send);send.connect(delaySend);
  car.start(t);mod.start(t);car.stop(t+.9);mod.stop(t+.9);}
function pianoNote(t,freq,vel){vel=vel||.3;
  const o=actx.createOscillator(),o2=actx.createOscillator(),lp=actx.createBiquadFilter(),g=actx.createGain();
  o.type='sawtooth';o2.type='sawtooth';o.frequency.value=freq;o2.frequency.value=freq;o2.detune.value=8;
  lp.type='lowpass';lp.frequency.setValueAtTime(4200,t);lp.frequency.exponentialRampToValueAtTime(1100,t+.18);
  adsr(g,t,.004,vel,.32);o.connect(lp);o2.connect(lp);lp.connect(g);g.connect(master);
  o.start(t);o2.start(t);o.stop(t+.4);o2.stop(t+.4);}
function blip(t,freq,vel,bright){vel=vel||.3;
  const o=actx.createOscillator(),lp=actx.createBiquadFilter(),g=actx.createGain();
  o.type=bright?'square':'sawtooth';o.frequency.value=freq;
  lp.type='lowpass';lp.frequency.value=bright?5200:2400;
  adsr(g,t,.003,vel,bright?.14:.2);o.connect(lp);lp.connect(g);g.connect(master);
  const send=actx.createGain();send.gain.value=bright?.4:.2;g.connect(send);send.connect(delaySend);
  o.start(t);o.stop(t+.3);}
```

- [ ] **Step 2: Contrôle de syntaxe**

Run:
```bash
cd "c:\Users\Nicolas Notte\Dropbox\Projets Divers\Tide\tide" && python -c "import re;h=open('index.html',encoding='utf-8').read();m=re.search(r'<script>\s*\"use strict\";(.*?)</script>',h,re.S);open('_t.js','w',encoding='utf-8').write('\"use strict\";'+m.group(1))" && node --check _t.js && echo OK && rm -f _t.js
```
Expected : `OK`.

- [ ] **Step 3: Test à l'oreille**

Recharger, taper une fois, puis Console :
```js
resumeAudio();const c=actx.currentTime;
bell(c,N(0,5),.35,false);bell(c+.4,N(3,5),.35,true);
pianoNote(c+.8,N(0,4),.35);blip(c+1.2,N(0,5),.35,true);blip(c+1.5,N(0,4),.35,false);
```
Expected : cloche douce, cloche brillante, note piano, blip carré brillant, blip saw sombre. Aucune erreur.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(audio): add bell, pianoNote and blip tap voices"
```

---

### Task 3: Aiguilleur `hitSound` + `success()` + champ `hitVoice` des pistes

**Files:**
- Modify: `index.html` — nouvel `hitSound` près de `success` ; ligne `pluck` dans `success` ; champ `hitVoice` sur les 11 objets de `TRACKS`.

- [ ] **Step 1: Ajouter `hitSound` juste avant `function success(`**

```js
function hitSound(freq,perfect,T){
  const vel=perfect?.4:.3;const v=T.hitVoice||'pluck';const c=actx.currentTime;
  if(v==='bell') bell(c,freq,vel,perfect||T.hitBright);
  else if(v==='piano') pianoNote(c,freq,vel);
  else if(v==='blip') blip(c,freq,vel,perfect||T.hitBright);
  else if(v==='voc') voc(c,[freq],.55,T.hitVoc||'aah',perfect?.34:.28);
  else pluck(c,freq,vel,perfect);
}
```

- [ ] **Step 2: Brancher `hitSound` dans `success`**

Dans `success(i,perfect)`, remplacer la ligne :
```js
  pluck(actx.currentTime,N(T.keyRoot+PENT[idx],oct),perfect?.4:.3,perfect);
```
par :
```js
  hitSound(N(T.keyRoot+PENT[idx],oct),perfect,T);
```

- [ ] **Step 3: Ajouter `hitVoice` aux pistes existantes**

Dans `TRACKS`, ajouter le champ sur chacune des 4 d'origine (ajouter à la fin de l'objet, avant `}`) :
- **Tide** : `, hitVoice:'pluck'`
- **Undertow** : `, hitVoice:'bell'` (grave, `hitBright` absent → doux)
- **Riptide** : `, hitVoice:'blip', hitBright:true`
- **Maelström** : `, hitVoice:'blip'` (sombre/agressif, `hitBright` absent)

Exemple pour Undertow — la ligne se terminant par `pentOct:[3,4] },` devient :
```js
    hatSteps:[6,14], hatVel:.12, pentOct:[3,4], hitVoice:'bell' },
```
(Idem pour les 3 autres avec leur valeur ci-dessus.)

- [ ] **Step 4: Ajouter `hitVoice` aux 7 nouvelles pistes**

Ajouter à la fin de chaque objet (avant `}`) :
- **Sirène** : `, hitVoice:'voc', hitVoc:'aah'`
- **Écume** : `, hitVoice:'voc', hitVoc:'ooh'`
- **Abysse** : `, hitVoice:'voc', hitVoc:'ooh'`
- **Raz-de-marée** : `, hitVoice:'piano'`
- **Orbite** : `, hitVoice:'blip'`
- **Néon** : `, hitVoice:'bell', hitBright:true`
- **Mirage** : `, hitVoice:'bell', hitBright:true`

Exemple pour Sirène — la ligne `vocSteps:[0,8], vocType:'aah', vocGain:.32, lead:true },` devient :
```js
    vocSteps:[0,8], vocType:'aah', vocGain:.32, lead:true, hitVoice:'voc', hitVoc:'aah' },
```

- [ ] **Step 5: Contrôle de syntaxe**

Run:
```bash
cd "c:\Users\Nicolas Notte\Dropbox\Projets Divers\Tide\tide" && python -c "import re;h=open('index.html',encoding='utf-8').read();m=re.search(r'<script>\s*\"use strict\";(.*?)</script>',h,re.S);open('_t.js','w',encoding='utf-8').write('\"use strict\";'+m.group(1))" && node --check _t.js && echo OK && rm -f _t.js
```
Expected : `OK`.

- [ ] **Step 6: Test en jeu**

Recharger. Jouer ~20 s sur **Tide** (pluck), **Raz-de-marée** (piano au tap), **Néon** (cloche), **Sirène** (note vocale au tap).
Expected : le son du tap diffère nettement d'une piste à l'autre, reste calé sur l'instant du tap, et la note monte toujours avec le combo. Aucune erreur console.

- [ ] **Step 7: Commit + push**

```bash
cd "c:\Users\Nicolas Notte\Dropbox\Projets Divers\Tide\tide"
git add index.html
git commit -m "feat(audio): per-track tap timbre via hitVoice dispatcher"
git push origin main
```
Expected : push OK ; Vercel redéploie.

---

## Self-Review (effectué)

**Couverture spec :**
- Chœur `voc` amélioré (chœur désaccordé, 4 formants, vibrato, souffle, niveau) → Task 1 Step 1. ✓
- Démasquage du `pad` sur pistes `lead` → Task 1 Step 2. ✓
- Synthés de tap `bell`/`pianoNote`/`blip` → Task 2. ✓
- Aiguilleur `hitSound` + `success()` → Task 3 Steps 1-2. ✓
- Champ `hitVoice` (+`hitVoc`/`hitBright`) sur les 11 pistes selon le mapping → Task 3 Steps 3-4. ✓
- Rétro-compat (défaut `pluck`) → Task 3 Step 1 (`else pluck`). ✓

**Cohérence des noms :** `voc(t,freqs,dur,type,gain)`, `bell(t,freq,vel,bright)`, `pianoNote(t,freq,vel)`, `blip(t,freq,vel,bright)`, `hitSound(freq,perfect,T)` ; champs `hitVoice`/`hitVoc`/`hitBright` lus dans `hitSound` == écrits sur les pistes (Task 3). `FORMANTS` déclaré une seule fois (l'ancienne déclaration est remplacée, cf. note Task 1 Step 1). ✓

**Placeholders :** aucun ; tout le code et toutes les valeurs sont concrets.

**Note d'équilibrage :** gains/durées sont des points de départ ; ajustement fin à l'oreille attendu et local (paramètres des synthés / champs de piste).
```
