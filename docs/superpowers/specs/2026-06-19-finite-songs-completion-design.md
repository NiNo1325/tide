# Tide — Sous-projet #1 : morceaux finis + complétion — Design

> Date : 2026-06-19
> Statut : approuvé (design)
> Contexte : 1er des 4 sous-projets du système de progression
> (#1 morceaux finis ⟶ #2 progression/déverrouillage ⟶ #3 carte SMB3 ⟶ #4 monétisation).

## Objectif

Transformer le jeu **endless** actuel en **morceaux finis** avec une notion de **complétion**,
fondation du système de progression à venir.

- Chaque partie a une **longueur fixe** et une **fin** propre (pas un game over).
- Score de complétion : **% = perfects / longueur**. « Cleared » = atteindre la fin ; « 100 % » = tout en perfect.
- **Étoiles** (1/2/3) stockées par piste×difficulté, pour alimenter la future carte.
- Une **erreur** (tap hors-tempo / nœud manqué) brise la vague = à refaire (identité conservée).
- Un **« good »** ne casse pas (comportement actuel inchangé).

## Décisions

- **Longueur** : constante `SONG_LEN = 36` nœuds (taps). Base campagne ; l'allongement/ramp est au #2.
  La longueur est en **nombre de nœuds** (le nombre de taps est donc constant ; la durée varie un peu
  selon BPM/difficulté).
- **Plus d'endless** : toutes les parties (campagne et futur jeu libre) sont finies. Assumé.
- **Seuils d'étoiles** : ✦ cleared (<70 % perfect) · ✦✦ ≥70 % · ✦✦✦ 100 %.

## Changements (tous dans `index.html`)

### État & génération (section GAME)
- `game` gagne `total` (= `SONG_LEN`) et un état `'done'` en plus de `menu|play|over`.
- `const SONG_LEN=36;` près des constantes de jeu.
- `genNodes(upto)` : continue de générer pour faire avancer la bille, mais **ne pousse plus de nœuds
  au-delà de `game.total`** (on s'arrête quand `game.nodes.length >= game.total`). La densité/syncope
  existante s'applique jusqu'à ce plafond.
- `startGame()` : `game.total=SONG_LEN` ; reset inchangé sinon.

### Détection de fin (loop / onTap)
- Aujourd'hui `success()` fait `game.nextNode=i+1`. Quand **`game.nextNode >= game.total`** (dernier
  nœud réussi), déclencher `songDone()` au lieu de continuer.
- `songDone()` :
  - `game.state='done'` ;
  - **outro douce** : `master.gain` rampe vers ~0 en ~0.6 s (PAS de `failSound`) ; `stopScheduler()` ;
  - calcul : `pct = Math.round(game.perfects/game.total*100)` ; `cleared=true` ;
    `stars = pct>=100?3 : pct>=70?2 : 1` ;
  - `recordCompletion(selTrack,selDiff,game.score,game.perfects,pct,stars)` ;
  - `showResult()` (écran de résultat).
- La condition de game over existante (nœud dépassé hors fenêtre) reste, mais ne se déclenche pas après
  la fin (état `done`).

### Persistance (recordScore → recordCompletion)
- Étendre le stockage `stats[ti|di]` : `{best, plays, pct, cleared, stars}` (champs ajoutés ;
  `best`/`plays` conservés). `pct`/`stars` gardent le **meilleur** atteint ; `cleared` devient `true`
  dès le 1er clear.
- Conserver `recordScore` pour les cas non terminés (game over) — il continue d'incrémenter `plays` et
  `best`. Ajouter `recordCompletion` qui appelle la logique de `recordScore` puis met à jour `pct`,
  `cleared`, `stars` (max).
- Sync cloud : `js/firebase.js` `saveScore`/`fetchMyScores` étendus pour porter `pct`,`cleared`,`stars`
  (champs additionnels sur le doc `scores`). Rétro-compatible (absents = 0/false).

### Écran de résultat (showOver → showResult)
- Réutiliser l'écran `over`. Selon `game.state` :
  - `done` : titre « morceau terminé », ligne « Parfait ! 100 % » si 100, sinon « Terminé ✓ — N % »,
    rangée d'**étoiles** (✦ pleines/vides selon `stars`), et le meilleur % (`pct` stocké).
  - `over` : comportement actuel (« la vague s'est brisée »), inchangé.
- Boutons existants (Rejouer / Défier un ami / Menu) conservés.

### HUD (drawHUD)
- **Barre de progression** fine en haut : largeur ∝ `game.nextNode/game.total`, couleur `accent`.
  Donne le sentiment d'avancer vers la fin. N'affecte pas la jouabilité.

## Ce qui ne change pas
- Mécanique de tap, fenêtres good/perfect, synthés, scheduler, pistes, défis, auth.
- Le game over sur erreur (juste : il ne peut plus arriver après la fin).

## Critères de réussite
- Un morceau se termine tout seul après `SONG_LEN` nœuds réussis → écran de résultat (pas game over).
- Le % et les étoiles s'affichent et se stockent (meilleur conservé), visibles au replay.
- 100 % atteignable uniquement avec tous les taps en « perfect ».
- Une erreur avant la fin = game over (à refaire).
- La barre de progression reflète l'avancement.
- Les scores/complétion remontent dans Firestore quand connecté.

## Hors périmètre (sous-projets suivants)
- Déverrouillage séquentiel, ramp de difficulté par morceau (#2).
- Carte de progression (#3).
- Monétisation (#4).
