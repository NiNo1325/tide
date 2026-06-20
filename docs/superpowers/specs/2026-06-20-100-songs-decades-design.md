# Tide — Chantier B+C : 100 chansons par décennie (déterministes) — Design

> Date : 2026-06-20
> Statut : approuvé. Très gros chantier, **phasé**.

## Décisions validées
- **Décennies = mondes** : 60s·70s·80s·90s·2000s (5), **~20 chansons** chacun → **100 au total**.
- **Difficulté au choix par morceau** (Calme·Flot·Tempête·Hardcore·Duo) ; étoiles par `(morceau,difficulté)`.
- Les **11 morceaux actuels** rangés dans leur décennie ; le reste **généré** pour atteindre 20/décennie.
- **Déterminisme absolu** : un morceau joue **toujours le même motif** (seed), apprenable. Plus de `Math.random`.
- Tout reste **sur la grille** (`verifyTempo`).

## Phase B0 — Génération déterministe (d'abord, déployable seule)
- PRNG seedé (`rng(seed)` mulberry32) ; `seedFor(ti,di)` (hash stable) ; en Duo, seed décalée par lane.
- `genSong(lane, laneIndex)` utilise ce PRNG au lieu de `Math.random` → **motif fixe** par (morceau, difficulté, lane).
- Effet immédiat : les 11 morceaux actuels deviennent des compositions **figées** (mêmes nœuds à chaque partie).

## Phase B1 — Presets de décennie + 100 recettes
- `DECADES` = 5 presets de style (batterie, basse, vocab d'accords, timbre lead/hit, plage BPM, palette) :
  60s rock/soul · 70s funk/disco · 80s synthwave · 90s house/eurodance · 2000s pop/electro.
- Bibliothèque de **progressions d'accords** par décennie.
- `RECIPES` (compactes) : `{decade, key, progId, seed, name, accent}` ; `genTrack(preset,recipe)` → TRACK
  complet compatible `playStep`. Les 11 existants intégrés (gardés tels quels, taggés décennie).
- `TRACKS` = 100. Noms auto (océan + flavor décennie), ajustables.

## Phase C1 — Carte décennies + progression + sélecteur de difficulté
- Carte image : **~20 positions d'îles** réutilisées **par décennie** ; flèches ◀▶ = décennie. Saut/cri/
  splash/caméra conservés.
- `WORLDS[5]` = listes d'indices de morceaux (~20) par décennie. Progression : îles **séquentielles**
  (réussir ≥★★ à n'importe quelle difficulté débloque la suivante) ; finir les ~10 premières d'une
  décennie débloque la suivante. (Le payant = chantier #4.)
- **Sélecteur de difficulté** à l'entrée d'une île (Calme/Flot/Tempête/Hardcore/Duo), puis `startGame`.
- Refonte `ORDER`/`worldUnlocked`/`songUnlocked`/`nextLevel`/`levelUnlocked` en termes de (décennie, île).

## Critères de réussite
- Un morceau donné rejoue **exactement** le même motif (déterminisme) — B0.
- 100 morceaux jouables, cohérents par décennie, tous sur la grille — B1.
- Carte par décennie navigable, progression séquentielle, difficulté choisie à l'entrée — C1.
- Solo/Duo, persistance (clé `ti|di`), aperçu, défis : fonctionnels.

## Hors périmètre
- Monétisation (payant) = chantier #4.
- Placement fin des 20 positions d'îles : estimé puis ajusté.
