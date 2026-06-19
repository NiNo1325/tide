# Tide — Sous-projet #2 : progression & déverrouillage — Design

> Date : 2026-06-19
> Statut : approuvé (design)
> Contexte : 2e des 4 sous-projets (#1 morceaux finis ✅ ⟶ **#2 progression** ⟶ #3 carte SMB3 ⟶ #4 monétisation).

## Objectif

Introduire une **campagne par tiers de difficulté** qui débloque progressivement morceaux et mondes,
et **gater** la sélection libre en conséquence.

## Décisions (validées)

- **Mondes = tiers de difficulté** : Calme (0) → Flot (1) → Tempête (2) → Hardcore (3).
- **Seuil de déblocage = ≥ ★★** (≥ 70 % de perfect, défini au #1).
- **Morceaux 0‑4 gratuits**, **5‑10 verrouillés** (déblocables en jouant ; paiement = #4).
- **Une fois un morceau débloqué**, il est rejouable à **n'importe quel monde/difficulté déjà débloqué**.

## Modèle (entièrement dérivé des `stats` du #1 — aucun nouvel état persisté)

Soit `starsFor(ti,di) = stats["ti|di"].stars || 0` (0/1/2/3).

- **Monde débloqué** : `worldUnlocked(di) = (di===0) || [0,1,2,3,4].every(ti => starsFor(ti, di-1) >= 2)`
  → un monde s'ouvre quand les **5 morceaux gratuits** du monde précédent sont à ≥ ★★.
- **Morceau débloqué (axe gratuit/gagné)** : `songUnlocked(ti) = (ti <= 4) || starsFor(ti-1, 0) >= 2`
  → 0‑4 toujours ouverts ; 5‑10 s'ouvrent en réussissant le morceau précédent à ≥ ★★ en **Calme**
  (le « gagné en jouant »). Le paiement direct est le #4.
- **Niveau jouable** : `levelUnlocked(ti,di) = worldUnlocked(di) && songUnlocked(ti)`.

> Comme tout dérive des étoiles déjà stockées (local + Firestore), la progression est automatiquement
> persistée et synchronisée entre appareils, sans nouveau champ.

## Ordre de campagne & « prochain niveau »

Ordre tier‑major : pour `di` de 0→3, pour `ti` de 0→10 : niveau `(ti,di)`.
`nextLevel()` = **premier niveau de cet ordre qui est débloqué et pas encore à ≥ ★★**
(`levelUnlocked && starsFor < 2`). S'il n'y en a plus → campagne terminée (le bouton mène au dernier
niveau / message « tout est maîtrisé »).

## Ce que livre le #2

### Logique (section GAME/UI de `index.html`)
- `starsFor`, `worldUnlocked`, `songUnlocked`, `levelUnlocked`, `nextLevel` (fonctions pures sur `curProfile().stats`).

### Accès
- **Bouton « ⛵ Voyage »** sur l'accueil → fixe `selTrack/selDiff = nextLevel()` puis `startGame()`.
- Au démarrage d'une partie (`playBtn` / Voyage), garde-fou : si `!levelUnlocked(selTrack,selDiff)`,
  on refuse et on affiche un toast.

### Gating de l'UI existante
- **`buildTrackCards`** : chaque carte affiche les **étoiles** obtenues `(ti, selDiff)` ; si
  `!songUnlocked(ti)` → carte **🔒 grisée, non sélectionnable** (l'aperçu reste autorisé). Si le morceau
  est verrouillé pour le monde courant mais débloqué ailleurs, il reste sélectionnable (règle
  `levelUnlocked`).
- **`buildDiffCards`** : un monde `di` non débloqué → **🔒 grisé, non sélectionnable**.
- **Sélection par défaut** : à l'init, si `(selTrack,selDiff)` n'est pas débloqué, retomber sur
  `nextLevel()` (ou (0,0)).

### Style
- Badges d'étoiles `★★☆` et cadenas `🔒` réutilisant les classes existantes (`.opt`, `.meter`…),
  état verrouillé = opacité réduite + `pointer-events` désactivés sur la carte.

## Ce qui ne change pas
- Mécanique de jeu, complétion (#1), audio, défis, auth, persistance (réutilisée telle quelle).
- Le « Jeu libre » reste l'accueil (sélecteurs), mais gaté aux niveaux débloqués.

## Critères de réussite
- Au départ (profil neuf) : seuls les morceaux 0‑4 en **Calme** sont jouables ; le reste est 🔒.
- Réussir un morceau à ≥ ★★ débloque le suivant (et, pour 0‑4 du monde, contribue à ouvrir le monde
  suivant). Le bouton **Voyage** enchaîne toujours sur le bon prochain niveau.
- Les mondes Flot/Tempête/Hardcore restent verrouillés tant que les 5 gratuits du monde précédent ne
  sont pas à ≥ ★★.
- La progression survit au rechargement et se synchronise (déjà via les étoiles).
- Impossible de lancer un niveau verrouillé.

## Hors périmètre
- **#3** : carte visuelle SMB3 (ici, simple bouton Voyage + cartes gatées).
- **#4** : paiement pour débloquer 5‑10 sans jouer.
