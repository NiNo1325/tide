# Tide — Sous-projet A : vrai début/fin de morceau — Design

> Date : 2026-06-20
> Statut : approuvé. Premier pas du chantier « 100 chansons » (presets de décennie viennent après).

## Problème
La partie s'arrête après un **nombre fixe de nœuds** (36), souvent au milieu d'une phrase, et la musique
se coupe sans résolution → sensation d'arrêt brutal.

## Correction
- **Longueur en mesures** : `SONG_BARS` (=10) mesures. Le morceau est **généré entièrement à l'avance**
  (composé, fini), au lieu d'un flux capé. ~45‑55 nœuds selon la difficulté.
- **Build-up** : la densité de syncopes croît avec la **position dans le morceau** (`b/last`), pas avec
  le score → montée naturelle vers la fin.
- **Fin posée** : la **dernière mesure n'a pas de syncope** ; un **nœud final sur le temps fort**
  (downbeat `SONG_BARS*4`) clôt le morceau.
- **Flourish de résolution** (`songDone`) : accord **tonique** (`prog[0].pad`) via `pad`+`stab` + **crash**
  (cymbale), puis `master` **résonne et s'éteint** (~1 s) au lieu de se couper. Résultat affiché par-dessus.
- **Intro** : décompte conservé + léger **riser** (montée filtrée) pendant le compte à rebours.
- **Garde-fou tempo (D)** : `verifyTempo()` vérifie que tous les `node.beat` sont des multiples de 0,25
  (la grille) ; `console.warn` si écart. Par construction c'est toujours le cas.

## Changements moteur (`index.html`)
- `SONG_LEN` (cap nœuds) → `SONG_BARS=10`. Nouvelle `genSong(lane)` (génère tout le morceau, fin incluse) ;
  supprime le streaming (`genNodes(lane,upto)` + son appel dans `success`).
- `startGame` : `for(ln of lanes) genSong(ln)` ; `game.total = Σ lane.nodes.length` ; `riser()` au décompte ;
  `verifyTempo()` (dev).
- `success` : retire l'appel de génération ; fin = `game.lanes.every(l=>l.nextNode>=l.nodes.length)`.
- `songDone` : joue le flourish (tonique + crash) + ring-out ~1 s.
- Nouveaux synthés courts : `crash(t)` (bruit aigu en swell), `riser(t,dur)` (bruit bandpass montant).
- Solo (1 lane) et Duo (2 lanes) en profitent identiquement.

## Critères de réussite
- Le morceau se termine **sur un temps fort** avec un **accord de résolution + crash** ; plus de coupure
  au milieu.
- Build-up audible (ça se densifie vers la fin), longueur ~50 notes.
- Intro avec riser.
- `verifyTempo()` ne signale aucun nœud hors grille.
- Solo et Duo OK ; carte/progression/persistance inchangées (total dérivé du nombre de nœuds).

## Hors périmètre
- Presets de décennie + 100 morceaux (chantier B) ; carte pour 100 (chantier C).
