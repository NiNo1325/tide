# Tide — Carte basée image (archipel pixel-art) — Design

> Date : 2026-06-20
> Statut : approuvé (design)
> Remplace le rendu iso procédural par une vraie image de carte fournie (`assets/worldmap.png`),
> avec les niveaux placés sur des îles de l'image.

## Objectif
Utiliser l'illustration d'archipel pixel-art comme **fond de carte** ; chaque morceau = une **île**.
Zoom + caméra qui suit le surfeur ; déplacement par sauts (cri + splash) conservé.

## Décisions (validées)
- **Zoom + caméra suiveuse** (on voit une portion, ça défile).
- **Image sans surfeur** fournie à `assets/worldmap.png` ; on superpose NOTRE surfeur animé.
- **11 îles** = 11 morceaux (le reste de l'archipel est décor). Une seule carte ; les flèches ◀▶
  changent de **monde/difficulté** (étoiles & verrous affichés changent sur les mêmes îles).

## Rendu
- `mapImg = new Image()` chargé depuis `assets/worldmap.png` (`mapImgReady`). Tant qu'absent : fond de
  secours `drawBg(.35)` + « carte en chargement… » (pas de plantage ; **ne pas** ajouter au cache SW
  pour éviter un échec d'install si le fichier manque).
- **Échelle** `mapScale()` = `max(W/img.w, H/img.h) * MAP_ZOOM` (`MAP_ZOOM≈1.8`) → image zoomée qui
  couvre l'écran. `imageSmoothingEnabled=false` (pixels nets).
- **Caméra** `camX,camY` = coin haut-gauche du viewport en coordonnées image×échelle ; cible = centrer
  le surfeur ; **easing** ×.14 ; **clamp** aux bords (`0..img*scale−W/H`).
- Tracé : `ctx.drawImage(mapImg, -camX, -camY, img.w*scale, img.h*scale)`.

## Nœuds (îles)
- `MAP_NODES` = 11 positions **normalisées** `[fx,fy]` (0..1 sur l'image). Valeurs de départ estimées
  d'après l'illustration, **à ajuster** île par île après rendu. Position écran d'un nœud `k` :
  `sx = fx*img.w*scale − camX`, `sy = fy*img.h*scale − camY`.
- Ordre du parcours = `ORDER` (par BPM) : la position `k` porte le morceau `ORDER[k]`.
- Overlay par île-niveau : anneau + numéro `k+1` ; **étoiles** au-dessus ; si verrouillée : **assombrissement**
  (disque semi-transparent) + 🔒. Île courante : halo qui **pulse**. Prochaine atteignable : indice ▾.

## Déplacement (repris de la carte iso)
- `mapCur` (île courante), `mapAnim` (saut), `mapParts` (éclaboussure). `hop(nk)` → `surfCry` ; fin de
  saut → `splash` + particules. Surfeur dessiné aux coordonnées écran du nœud, **arc** pendant le saut.
- `mapTap(x,y)` : zone haute = flèches monde ; sinon nœud le plus proche : courant → entrer (`startGame`),
  devant/derrière → un saut (refus si verrouillé) ; ignoré pendant un saut.

## Intégration
- Remplace `isoTW/isoXY/isoScreen/surferIso/mapCenterCam/drawMap/mapTap` (et `ISO_PATH`) par la version
  image (`MAP_NODES`, `mapScale`, `nodeScreen`, caméra clampée). `openMap/closeMap/hop/surfCry/splash/
  spawnSplash/drawMapParts` conservés (positions adaptées). `loop`/pointeur/`mapBack`/`voyageBtn` inchangés.
- `master.gain` monté à l'ouverture de la carte (déjà fait) pour les sons.
- Aucune nouvelle persistance.

## Critères de réussite
- Voyage affiche la carte image zoomée, caméra centrée sur le surfeur ; ça défile quand il saute.
- 11 îles portent les niveaux (marqueur + étoiles + verrou) ; tap devant = saut (cri+splash), tap
  l'île courante = lance le niveau ; flèches = changement de monde.
- Si `assets/worldmap.png` absent : fond de secours, pas de crash.
- Reste du jeu inchangé.

## À fournir par l'utilisateur
- `assets/worldmap.png` (version **sans** surfeur). Les positions `MAP_NODES` seront ajustées ensemble
  après le premier rendu.

## Hors périmètre
- Découpe par régions (4 mondes = 4 zones distinctes de la carte) : on garde 11 îles partagées.
- Génération auto des positions d'îles (placement manuel/ajusté).
