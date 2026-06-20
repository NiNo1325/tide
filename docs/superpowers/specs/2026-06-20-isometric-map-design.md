# Tide — Carte isométrique « archipel » (refonte #3) — Design

> Date : 2026-06-20
> Statut : approuvé (design)
> Remplace la carte plate canvas par une carte isométrique façon SMB3 avec déplacement pas-à-pas.

## Objectif

Transformer la carte du Voyage en **archipel isométrique** : les morceaux sont des **îles** reliées,
le joueur **déplace son surfeur d'île en île** (saut animé, juteux), la **caméra suit**. Tap sur l'île
courante = entrer dans le niveau. Boucle de déplacement rendue addictive par le feedback (arc, squash,
éclaboussure, son).

## Décisions (validées)
- **Style** : îles isométriques sur l'océan, caméra qui suit le surfeur.
- **Déplacement** : tap une île en avant/arrière → **un saut** vers elle ; tap l'île courante → **entrer**.
- Ne peut avancer que sur une île **débloquée**. Flèches ◀▶ pour changer de monde.

## Rendu isométrique

- Grille iso, demi-dimensions de tuile `TW`, `TH` (ex. `TW=Math.min(W*0.42,150)`, `TH=TW*0.5`).
- Projection : `isoX=(gx-gy)*TW/2`, `isoY=(gx+gy)*TH/2`.
- Écran : `sx = W/2 + isoX - camX`, `sy = H*0.30 + isoY - camY`, où `camX/camY` suivent l'île courante
  (easing). Le surfeur reste ~centré, l'archipel défile.
- **Chemin** : 11 cellules `(gx,gy)` en serpentin (chaîne d'îles), table fixe `ISO_PATH` (chaque pas
  = +1 en gx ou gy pour que les îles soient « adjacentes » visuellement et reliées par un ponton).
- **Eau** : fond océan (réutilise `drawBg(.35)`), + léger scintillement (petits traits iso animés).

## Îles (nœuds)

Pour chaque position `k` (île) = morceau `ti=ORDER[k]`, monde `mapWorld` :
- disque iso (ellipse aplatie) rempli de `TRACKS[ti].accent` si `levelUnlocked(ti,mapWorld)`, gris sinon ;
  **ombre portée** sur l'eau, fine bordure claire.
- **numéro** `k+1` au centre ; **étoiles** `starsFor(ti,mapWorld)` flottant au-dessus ; **🔒** si verrouillé.
- **Pontons** entre îles consécutives (ligne iso ; pointillé si la suivante est verrouillée).
- **Île courante** (`k===mapCur`) : halo qui **pulse** + le **surfeur** posé dessus (bobbing).
- **Prochaine atteignable** (`mapCur+1` débloquée) : petit **indice** (flèche/chevron animé) pour inviter.

## Déplacement & animation

État carte ajouté : `mapCur` (index d'île 0..10), `mapAnim` (`{from,to,t0}` ou null), `camX,camY,camTX,camTY`,
`mapParts` (particules d'éclaboussure).
- `openMap()` : `mapWorld = nextLevel().di` (ou 0 si Duo n'a pas lieu d'être), `mapCur = pos(nextLevel().ti)`
  si `nextLevel().di===mapWorld` sinon 0 ; caméra centrée immédiatement ; `mapAnim=null`.
- `mapTap(x,y)` :
  - si flèche monde (zone haute) → change `mapWorld` (0..3), recale `mapCur`, caméra recentrée ;
  - sinon hit-test l'île la plus proche (rayon écran) :
    - île == `mapCur` → si `levelUnlocked` : entrer (`selTrack=ORDER[mapCur]; selDiff=mapWorld; closeMapToGame()`) ;
    - île devant (`k>mapCur`) → si `levelUnlocked(ORDER[mapCur+1],mapWorld)` : **hop** vers `mapCur+1` ; sinon refus (toast) ;
    - île derrière (`k<mapCur`) → **hop** vers `mapCur-1` ;
  - ignore les taps pendant un saut (`mapAnim` actif).
- **hop(to)** : `mapAnim={from:mapCur,to,t0:performance.now()}`, durée ~280 ms. À la fin : `mapCur=to`,
  splash + son d'atterrissage, `mapAnim=null`.
- Pendant le saut, position du surfeur = interpolation des positions iso `from→to` + **arc parabolique**
  vertical (`-hauteur*sin(π·t)`) + **squash** à l'arrivée (échelle Y momentanée).

## Feedback / juice
- **Son** : `blip` au décollage, `pluck`/`blip` plus doux à l'atterrissage, son d'entrée à l'entrée du niveau
  (réutilise les synthés ; `resumeAudio()` au premier tap carte).
- **Éclaboussure** : ~10 particules d'eau à l'atterrissage (`mapParts`, dessinées dans `drawMap`).
- **Pulse** de l'île courante, **bobbing** du surfeur, **mini-confetti** d'étoiles si l'île atteinte est ★★★.
- **Caméra** : easing doux vers l'île courante (suivi fluide).

## Intégration
- **Remplace** `drawMap`/`mapTap` plates ; `openMap`/`closeMap`, le détour `loop` et le routage pointeur
  restent. Bouton ‹ Retour inchangé.
- Aucune nouvelle persistance : tout dérive de `ORDER`/`levelUnlocked`/`starsFor`/`nextLevel`.
- Le reste du jeu (solo, Duo, campagne, audio) **inchangé**.

## Critères de réussite
- Voyage ouvre un archipel iso ; le surfeur est sur le front ; la caméra le suit.
- Taper une île devant fait **bondir** le surfeur d'un cran (arc + squash + éclaboussure + son) ; taper
  l'île courante **lance** le niveau ; on ne franchit pas une île verrouillée.
- Les flèches changent de monde ; étoiles/verrous corrects ; ordre par BPM (via `ORDER`).
- Aucune régression hors carte.

## Hors périmètre
- Terrain iso en tuiles pleines (on reste sur des îles).
- Duo sur la carte (Duo reste hors campagne).
