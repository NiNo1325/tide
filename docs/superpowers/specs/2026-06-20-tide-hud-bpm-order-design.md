# Tide — Lot A1+A2+B : vague à 100 %, HUD nom/difficulté, tri par BPM — Design

> Date : 2026-06-20
> Statut : approuvé (design)
> Contexte : 3 petites/moyennes améliorations groupées, avant « C : plus musical » puis « D : mode Duo ».

## A1 — La marée monte jusqu'en haut à 100 %

- Aujourd'hui `game._tide` suit le **combo** (`min(combo/30,1)`). On le fait suivre la **progression
  du morceau** : `prog = nextNode/total`.
- Cibles de `game._tide` (easing inchangé ×.06) :
  - en jeu (`play`) : `prog` ;
  - `done` : `1` (vague pleine à la complétion) ;
  - `over` : figé (valeur courante) ;
  - menus/carte : `.12` (calme).
- Dans `drawBg`, le niveau d'eau à `tl=1` vise le haut, **aligné sur la barre** (≈ `H*0.06`) :
  `level = BASE_Y - tl*(BASE_Y - H*0.06)` (était `H*0.12`).
- Le **combo** continue de piloter l'intensité audio/lueur (variable `intensity` séparée, inchangée).

## A2 — Nom du morceau + difficulté pendant le jeu

- Dans `drawHUD`, sous la barre de progression (≈ `H*0.105`), texte centré discret :
  `TRACKS[selTrack].name + ' · ' + DIFFS[selDiff].name`, petite police, couleur douce.
- Position haute, loin de la zone d'action (vague ≈ `BASE_Y=0.6*H`) → ne gêne pas le jeu.

## B — Parcours classés par BPM (sauvegardes préservées)

- **On ne réordonne pas `TRACKS`** (les `stats` sont indexées par cet ordre `ti`). On ajoute :
  ```js
  const ORDER = TRACKS.map((t,i)=>i).sort((a,b)=>TRACKS[a].bpm-TRACKS[b].bpm);
  function pos(ti){return ORDER.indexOf(ti);}
  ```
  Ordre obtenu (lent→rapide) : `[1,7,4,9,10,0,5,2,6,8,3]` =
  Undertow·Abysse·Sirène·Néon·Mirage·Tide·Écume·Riptide·Raz‑de‑marée·Orbite·Maelström.
- **Déblocage par position** dans `ORDER` (les 5 premiers = gratuits) :
  - `songUnlocked(ti)`: `pos(ti)<5 || starsFor(ORDER[pos(ti)-1],0)>=2`.
  - `worldUnlocked(di)`: `di===0 || [ORDER[0..4]].every(ti=>starsFor(ti,di-1)>=2)`.
  - `levelUnlocked` inchangé (`worldUnlocked && songUnlocked`).
  - `nextLevel()`: balaye `di` puis `k` (position) sur `ORDER[k]`.
- **Carte** (`drawMap`/`mapTap`) : itère les positions `k` ; nœud `k` = `ORDER[k]` (couleur
  `TRACKS[ORDER[k]].accent`, numéro `k+1`, `starsFor(ORDER[k],di)`) ; mascotte sur `mapPos[pos(nl.ti)]` ;
  tap nœud `k` → `selTrack=ORDER[k]`.
- **Jeu libre** (`buildTrackCards`) : itère `ORDER` (affichage dans l'ordre BPM), gate par
  `levelUnlocked(ti,selDiff)`, sélection `selTrack=ti`.
- Les **étoiles déjà acquises restent** (clés `ti|di` inchangées) ; seul l'ordre de progression change.

## Ce qui ne change pas
- Audio, complétion, persistance (clés), défis, auth, mode de difficulté (Duo = plus tard).

## Critères de réussite
- À 100 % de progression, la crête de la vague atteint le haut, au niveau de la barre.
- Le nom du morceau + difficulté s'affichent en haut pendant le jeu, sans gêner.
- Carte et jeu libre présentent les morceaux du plus lent (Undertow) au plus rapide (Maelström) ;
  les 5 plus lents sont gratuits ; le déblocage suit ce nouvel ordre ; les étoiles sont conservées.

## Hors périmètre
- C (arrangement plus riche) et D (mode Duo) — sous-projets suivants.
