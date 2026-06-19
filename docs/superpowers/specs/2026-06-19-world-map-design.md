# Tide — Sous-projet #3 : carte du voyage (canvas, style SMB3) — Design

> Date : 2026-06-19
> Statut : approuvé (design)
> Contexte : 3e des 4 sous-projets (#1 morceaux finis ✅ · #2 progression ✅ · **#3 carte** · #4 monétisation).

## Objectif

Donner une **vue de progression ludique**, dessinée sur **canvas animé**, façon **carte de monde
Super Mario Bros 3** : 4 mondes (un par difficulté), chemin sinueux de 11 nœuds (morceaux), mascotte
qui flotte sur le nœud courant. La carte sert à la fois de **campagne** (front surligné) et de
**rejeu libre** (taper n'importe quel nœud débloqué).

## Décisions (validées)
- **Rendu canvas animé** (pas DOM) : fond océan animé + nœuds + mascotte.
- **4 cartes de monde** (tiers Calme/Flot/Tempête/Hardcore), navigation entre mondes.
- **Tap sur un nœud débloqué = lancement immédiat** du niveau.

## Architecture (tout dans `index.html`)

### Affichage & boucle
- Nouvel état d'affichage : variable `mapView` (bool). Quand `true`, `loop()` dessine
  `drawBg(.4)` (océan calme animé) puis `drawMap()`, et **n'exécute pas** la logique de jeu
  (`playing` reste faux). Les écrans DOM sont masqués (`showScreen(null)` + un overlay DOM minimal
  pour le bouton Retour, voir plus bas).
- `openMap(di)` : `mapView=true`, `mapWorld = di ?? worldOf(nextLevel())`, calcule les positions,
  masque les écrans, affiche l'overlay Retour. `closeMap()` : `mapView=false`, retour accueil.

### Données de carte (dérivées, pas de persistance)
- `mapWorld` (0..3) : monde affiché.
- `worldOf(level)` = `level.di`. Position courante = `nextLevel()`.
- Tout le reste vient de `starsFor(ti,di)`, `levelUnlocked(ti,di)`, `worldUnlocked(di)`.

### Disposition des nœuds (responsive)
- `mapNodes()` calcule 11 positions en **zig-zag** dans la zone utile (sous l'en-tête, marges
  latérales), p. ex. 4 rangées alternées gauche↔droite. Recalcul sur `openMap` et `layout()`
  (changement de taille). Stockées dans `mapPos = [{x,y}, …]` (indice = morceau).

### `drawMap()` (canvas)
- **Chemin** : ligne reliant `mapPos[i]`→`mapPos[i+1]` ; segment plein si le nœud d'arrivée est
  débloqué, **pointillé grisé** sinon.
- **Nœud** `i` :
  - cercle (r≈22 DPR-aware) : rempli de `TRACKS[i].accent` si `levelUnlocked(i,mapWorld)`, gris sinon ;
  - numéro `i+1` au centre ;
  - **étoiles** `★`×`starsFor(i,mapWorld)` (sur 3) dessinées sous le nœud (or) ;
  - cadenas `🔒` (glyphe) si verrouillé ;
  - **halo accent** autour du nœud si `(i,mapWorld)` == `nextLevel()` (le « front »).
- **Mascotte** : la bille (même style que le jeu) posée sur le nœud courant `nextLevel()` si
  `mapWorld == nextLevel().di`, avec flottement vertical animé (sin sur le temps).
- **En-tête** : `◀  MONDE n · <Nom difficulté>  ▶` + `★ x/33` (somme des étoiles du monde) ;
  flèches gauche/droite (zones tap) ; si `mapWorld` verrouillé, bandeau « verrouillé 🔒 ».

### Interaction (pointeur)
- Quand `mapView`, `pointerdown` (handler canvas existant) appelle `mapTap(x,y)` au lieu de `onTap()` :
  - sur flèche gauche/droite → `mapWorld` change (clampé 0..3), recalcul, redraw ;
  - sur un nœud : si `levelUnlocked(i,mapWorld)` → `selTrack=i; selDiff=mapWorld; closeMap(); startGame();`
    sinon `toast('Niveau verrouillé 🔒')` ;
  - ailleurs → rien.
- Coordonnées : convertir le point écran en coordonnées canvas (tenir compte de DPR/échelle comme
  le reste du rendu — le canvas est déjà mis à l'échelle dans `layout()`).

### Overlay DOM minimal
- Un petit bouton **‹ Retour** en position fixe (réutilise `.btn.ghost`), affiché seulement quand
  `mapView`, qui appelle `closeMap()`. (Évite de gérer le hit-test du bouton sur canvas.)
- Les flèches de monde restent sur canvas (zones tap) pour le côté « carte ».

### Points d'entrée
- `⛵ Voyage` (accueil) → `openMap()` (au lieu de lancer directement `nextLevel`).
- « Jeu libre » + sélecteurs : **inchangés** (lancement rapide).
- Après une partie lancée depuis la carte : l'écran de résultat (#1) s'affiche normalement ; « Menu »
  revient à l'accueil (pas à la carte) — simple et cohérent.

## Ce qui ne change pas
- Logique de progression (#2), complétion (#1), audio, défis, auth, persistance.

## Critères de réussite
- `⛵ Voyage` ouvre une carte canvas animée du monde courant, mascotte sur le nœud courant.
- Les nœuds reflètent couleur/verrou/étoiles ; le front est surligné ; les flèches changent de monde.
- Taper un nœud débloqué lance le bon niveau ; un nœud verrouillé → toast.
- Les mondes verrouillés sont visibles mais non jouables.
- Aucune régression : Jeu libre, défis, résultats fonctionnent comme avant.

## Hors périmètre
- #4 : paiement pour débloquer les morceaux 5‑10 (ici : simple 🔒).
- Animations avancées (déplacement pas-à-pas de la mascotte entre nœuds) — flottement simple suffit.
