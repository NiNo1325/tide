# Tide — 7 nouvelles pistes (vocal / 90s / 80s) — Design

> Date : 2026-06-19
> Statut : approuvé (design) — en attente de relecture spec avant plan d'implémentation

## Objectif

Ajouter **7 nouvelles pistes** musicales jouables, parfaitement calées sur les taps :
- 3 pistes **vocales** (voix synthétisées « aah/ooh », pas de vraies paroles),
- 2 pistes **style années 90**,
- 2 pistes **style années 80**.

Chaque piste hérite automatiquement des 4 difficultés existantes (Calme/Flot/Tempête/Hardcore)
et reskine le jeu via sa couleur `accent`.

## Contraintes & principes conservés

- **100 % synthétisé** en Web Audio : aucun fichier audio, aucune dépendance, aucun copyright.
- **Invariant rythmique** : tout est joué par `playStep(step,t,combo)` sur la grille 1/16 dérivée de
  l'horloge audio (`actx.currentTime`). Les nouvelles couches s'ajoutent sur cette grille → elles
  restent verrouillées au tempo et donc « en rythme avec les clics » par construction.
- Pistes existantes **inchangées** : les nouveaux champs de piste sont optionnels.
- Strings d'UI en **français**.

## Décision d'architecture : étendre le moteur (approche A retenue)

Les styles 80s/90s ont des signatures que le moteur n'a pas encore (notamment **pas de caisse
claire/clap** : seulement kick + hi-hat). On ajoute **3 voix de synthèse réutilisables**, puis on
écrit 7 pistes paramétriques par-dessus.

## Nouvelles voix de synthèse (section AUDIO de `index.html`)

Toutes suivent la signature des synthés existants : `fn(t, …)` planifiés sur `actx.currentTime`,
connectés à `master` (et `delaySend` si pertinent).

1. **`snare(t, vel)`** — caisse claire / clap.
   - Source bruit (réutilise `noiseBuf`) → passe-bande ~1.8 kHz, Q modéré, enveloppe percussive
     (~120 ms). Option « clap » = 3 micro-impulsions rapprochées (~10 ms d'écart) pour le grain 90s.
   - Paramètre `vel` (0..1) pour le gain.

2. **`voc(t, freqs, dur, type)`** — chœur à formants (voix synthétiques).
   - Pour chaque fréquence d'accord : 1-2 oscillateurs (saw/triangle) → 2-3 filtres passe-bande en
     parallèle réglés sur des **formants de voyelle** (`type:'aah'` ≈ 800/1150/2900 Hz ;
     `type:'ooh'` ≈ 300/870/2240 Hz) → enveloppe douce (attaque ~80 ms, release long).
   - Léger vibrato (LFO ~5 Hz sur le pitch) pour l'aspect « voix ». Envoi delay pour l'espace.

3. **`stab(t, freqs, dur, bright)`** — accord percussif (piano house / brass 80s).
   - Oscillateurs saw par fréquence → passe-bas (cutoff selon `bright`) avec enveloppe de filtre
     rapide → enveloppe d'ampli courte (~150-250 ms). Donne le « stab » staccato.

> Réutilisations : `noiseBuf` (déjà créé pour `hat`), `N(semi,oct)`, `PENT`, `chord(...)`, la chaîne
> master/lowShelf/comp et le `delaySend`.

## Extension du schéma de piste

Champs **optionnels** ajoutés à l'objet piste (absents = couche non jouée) :

```js
{
  // … champs existants …
  snareSteps:[...],        // steps 0..15 où jouer la caisse claire/clap
  snareVel:0..1,           // gain de la snare (défaut .25)
  snareClap:bool,          // true = grain « clap » (multi-impulsions)
  stabSteps:[...],         // steps 0..15 où jouer un stab d'accord (utilise prog[].pad)
  stabBright:0..1,         // brillance du stab
  vocSteps:[...],          // steps 0..15 où (re)déclencher le chœur
  vocType:'aah'|'ooh',     // voyelle
  vocGain:0..1,            // gain du chœur (défaut .3)
  lead:bool                // true pour les pistes « vocales » : le chœur entre tôt et fort
}
```

## Intégration dans `playStep`

Ajouts dans `playStep(step,t,combo)`, sur la grille existante (`sib` = step dans la mesure 0..15),
gated par combo pour conserver la montée en intensité :

- **Snare/clap** : `if(combo>=2 && T.snareSteps?.includes(sib)) snare(t, T.snareVel ?? .25 [, clap])`.
- **Stab** : `if(combo>=4 && T.stabSteps?.includes(sib)){ const ch=prog courant; stab(t, ch.pad, dur, T.stabBright); }`.
- **Chœur vocal** : déclenché aux `vocSteps`. Pour une piste `lead:true`, seuil bas (`combo>=4`) et
  `vocGain` plus élevé ; sinon `combo>=10`. Utilise l'accord courant (`prog[...].pad`) et `vocType`.

Le reste de `playStep` (kick/hat/basse/pad/pluck) est inchangé.

## Les 7 pistes (données)

Noms océaniques (cohérents avec Tide/Undertow/Riptide/Maelström), style indiqué dans le `blurb`.
BPM, tonalité, couleur et signatures rythmiques ci-dessous ; les valeurs fines (prog d'accords,
`bassHits`, etc.) seront fixées à l'implémentation en s'appuyant sur les pistes existantes comme gabarit.

| Nom | Style (blurb) | BPM | keyRoot | accent | Éléments clés |
|---|---|---|---|---|---|
| **Sirène** | downtempo vocal, chœurs éthérés | 110 | 0 | `#9b8cff` (violet) | `voc aah` lead, sub doux, hats clairsemés |
| **Écume** | vocal uplifting | 124 | 2 | `#41e0a3` (vert d'eau) | `voc ooh` montant, `stab`, clap léger |
| **Abysse** | vocal sombre | 100 | 7 | `#5566aa` (bleu nuit) | `voc ooh` grave, sub-bass, peu de hats |
| **Raz-de-marée** | house / eurodance 90s | 128 | 0 | `#2fd0ff` (cyan) | four-on-floor (`kickSteps` 0/4/8/12), `clap` 4/12, piano `stab`, basse offbeat |
| **Orbite** | trance 90s | 136 | 5 | `#7b6cff` (indigo) | basse roulante en croches, `stab` saw, `clap` 4/12, hats offbeat |
| **Néon** | synthwave / retrowave 80s | 115 | 0 | `#ff5fa2` (magenta) | `snare` gated (4/12), basse arpégée, hats 1/8 |
| **Mirage** | italo-disco 80s | 120 | 3 | `#ffce54` (or) | basse en octaves (`bassHits` croches), `clap`, `stab` brillant |

> Total après ajout : 4 (existantes) + 7 = **11 pistes** dans le sélecteur. `buildTrackCards`
> construit déjà la liste dynamiquement (scroll), aucune limite à lever.

## Ce qui ne change pas

- `previewTrack(i)` : fonctionne déjà pour n'importe quel index → aperçu OK sans modif.
- `buildTrackCards`, sélection, persistance des scores par `ti|di`, défis, classement : inchangés
  (un nouvel index de piste est traité comme les autres).
- Difficultés, scheduler, rendu, synchro.

## Critères de réussite

- Les 7 pistes apparaissent dans le sélecteur, chacune avec sa couleur et son aperçu.
- À l'écoute, les couches (snare/clap, stab, chœurs) tombent **sur la grille** : aucun décalage
  audible avec les taps réussis.
- Les pistes vocales font clairement entendre des chœurs « aah/ooh » synthétiques.
- Les styles 80s (gated snare/brass/arp) et 90s (four-on-floor/clap/piano stab/supersaw) sont
  reconnaissables.
- Les 4 pistes existantes sonnent exactement comme avant.

## Hors périmètre

- Vraies voix échantillonnées / paroles (choix : voix synthétiques uniquement).
- Nouveaux modes de difficulté.
- Refonte du moteur de scheduling.
