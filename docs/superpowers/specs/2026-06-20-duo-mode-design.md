# Tide — Sous-projet D : mode Duo (deux doigts, deux vagues) — Design

> Date : 2026-06-20
> Statut : approuvé (design)

## Objectif

Ajouter un **mode Duo** : deux vagues simultanées, une par doigt. **Vague du haut = doigt gauche**
(moitié gauche de l'écran), **vague du bas = doigt droit** (moitié droite). Un raté sur l'une des
deux = fin. Mode à part, jouable sur tout morceau débloqué, avec sa propre progression d'étoiles.

## Décisions (validées)
- **Mode à part** : 5e difficulté `di=4` (`duo:true`) dans le **Jeu libre**, dispo si le morceau est
  **débloqué** (`songUnlocked`), indépendamment de la campagne. Stats/étoiles sous `ti|4`.
- **Pas dans la carte** (campagne = 4 mondes inchangés).
- **Échec** : raté (hors-tempo ou nœud manqué) sur **n'importe quelle** vague → game over.
- Layout : haut = gauche, bas = droite ; input scindé moitié gauche / moitié droite.
- Flux de nœuds **indépendants** par vague ; **score/combo/% combinés**.

## Refactor « lanes » (cœur)

On généralise l'état mono-vague en **lanes**. Le solo devient « 1 lane » → comportement identique.

```js
// une lane
{ nodes:[], genBeat:0, nextNode:0, baseY, trail:[] }
game.lanes = [lane]            // solo
game.lanes = [laneTop, laneBot] // duo
// globaux : combo, score, perfects, total (= SONG_LEN * lanes.length), state, startTime, spb
```

Fonctions adaptées **par lane** (prennent une lane en paramètre) :
- `genNodes(lane, upto)` : génère/plafonne les nœuds de la lane (cap `SONG_LEN`).
- `nodeY(lane, b)` : ondulation autour de `lane.baseY`.
- `ballPos(lane, cb)` : position de la bille de la lane.
- `nodeTime(lane, i)` : `startTime + lane.nodes[i].beat*spb` (startTime/spb partagés).
- `success(lane, i, perfect)` : avance `lane.nextNode`, met à jour combo/score/perfects globaux, joue son+burst, et appelle `songDone()` si **toutes** les lanes sont finies.

Globaux :
- `onTap(x)` : choisit la lane selon `x` (solo → lane 0 ; duo → `x < W/2` ? lane 0 (haut) : lane 1 (bas)),
  puis applique la logique de timing actuelle sur cette lane (good/perfect/gameOver).
- `gameOver()` : inchangé (global).
- `songDone()` : déclenché quand **toutes** les lanes ont `nextNode>=SONG_LEN` ; `% = perfects/total`.
- Boucle (`loop`) : la détection de nœud manqué balaie **toutes** les lanes.
- `drawWorld` : dessine **chaque** lane (ligne ondulée + nœuds + traînée + surfeur). Indicateur de
  contact par lane.

`baseY` :
- Solo : `BASE_Y` (= `H*0.60`, inchangé).
- Duo : lane haut `H*0.40`, lane bas `H*0.72` (deux bandes distinctes). Teinte légèrement différente
  (haut = accent ; bas = accent éclairci) + fin séparateur horizontal central pour distinguer
  gauche/droite. Petits repères « ◐ gauche » / « ◑ droite » discrets.

## Entrée / UI
- Le sélecteur de difficulté (`buildDiffCards`) liste la nouvelle difficulté **Duo** ; en Duo la carte
  n'est jamais verrouillée par monde (dispo si un morceau est débloqué). `levelUnlocked(ti,di)` :
  si `DIFFS[di].duo` → `songUnlocked(ti)` seul ; sinon `worldUnlocked(di)&&songUnlocked(ti)`.
- Lancement via **Jeu libre** (bouton « Jouer ») avec difficulté Duo sélectionnée.
- HUD : barre de progression = avancement combiné (`(somme nextNode)/total`) ; nom + « Duo ».

## Difficulté Duo (valeurs de départ, ajustables)
`{name:'Duo', meter:3, tempo:1.0, good:.17, perfect:.07, dens0:.04, densMax:.4, sixteenth:false, duo:true}`.
Densité par vague modérée (gérer deux mains).

## Persistance / cloud / défis
- `recordCompletion`/`recordScore` inchangés (clé `ti|4`). Les étoiles Duo apparaissent dans le profil
  et le classement comme une difficulté de plus. Sync cloud déjà générique (di quelconque).
- Défis : un défi Duo encode `di=4` ; `showIncomingChallenge` le lance en Duo (rien de spécial).

## Ce qui ne change pas
- Mode solo (1 lane) : identique au comportement actuel.
- Scheduler/audio, carte/campagne (4 mondes), auth.

## Critères de réussite
- Le mode solo est **inchangé** après le refactor lanes (régression nulle).
- Duo : deux vagues, deux surfeurs ; moitié gauche contrôle la vague du haut, moitié droite la vague
  du bas ; un raté sur l'une finit la partie ; score/%/étoiles combinés ; complétion à la fin des deux.
- Duo sélectionnable en Jeu libre sur tout morceau débloqué ; étoiles Duo persistées (local + cloud).

## Hors périmètre
- Duo dans la campagne/carte (reste 4 mondes).
- Plus de 2 vagues.
