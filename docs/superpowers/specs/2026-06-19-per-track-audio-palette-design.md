# Tide — Palette audio par piste (chœur amélioré + son de tap) — Design

> Date : 2026-06-19
> Statut : approuvé (design)

## Objectif

Deux améliorations audio liées, pour que chaque piste sonne cohérente avec son univers :

1. **Chœur `voc` plus vocal et audible** (les pistes vocales sonnaient « cuivres » et trop faibles),
   + démasquage (couper la nappe `pad` qui se mélangeait au chœur).
2. **Son du tap réussi propre à chaque piste** (« la bille frappe la vague ») au lieu du `pluck`
   unique pour tout le monde — accordé à l'instrument-palette de la piste.

Contrainte assumée : voix **synthétisées** (pas de fichiers). Le résultat est un *chœur de synthé*
convaincant (« aah/ooh »), pas une voix humaine réelle.

## Partie 1 — Chœur `voc` amélioré

Réécriture de `voc(t,freqs,dur,type,gain)` (section AUDIO) :

- **Chœur désaccordé** : par fréquence de note, 3 oscillateurs saw (détune −7 / 0 / +7 cents) plus
  un saw une **octave en dessous** à faible niveau (corps). Donne une largeur chorale.
- **4 formants de voyelle** en bandpass parallèles, gains relatifs F1>F2>F3>F4 (F1 dominant) :
  - `aah` : 800 / 1150 / 2900 / 3900 Hz
  - `ooh` : 300 / 870 / 2240 / 3000 Hz
  - Q modéré (≈ 6–10) : assez étroit pour l'identité voyelle, assez large pour rester audible ;
    gains de formant compensés pour le niveau.
- **Vibrato** ~5,5 Hz, profondeur ±12 cents (LFO sur le detune de tous les oscillateurs).
- **Souffle** : un léger lit de bruit (réutilise `noiseBuf`) passé en bandpass autour de F2, très
  bas niveau, pour l'aspect « chanté » plutôt que tenu/cuivre.
- **Enveloppe** : attaque douce (~120 ms), tenue, release ~0,5 s (inchangé dans l'esprit).
- **Niveau** : `gain` effectif remonté pour audibilité claire ; envoi delay conservé.

Démasquage dans `playStep` : la couche `pad` (saw, `combo>=10`) n'est **pas** jouée si la piste
est `lead:true` → le chœur devient la voix soutenue dominante.

## Partie 2 — Son du tap par piste

Nouveau champ optionnel de piste `hitVoice` (+ `hitVoc:'aah'|'ooh'` pour les pistes vocales),
et un aiguilleur `hitSound(freq, perfect, T)` appelé par `success()` à la place du `pluck` direct.
La **note** jouée reste la montée pentatonique actuelle ; seul le **timbre** change.

Nouveaux synthés courts et mélodiques (section AUDIO) :
- `bell(t,freq,vel,bright)` — cloche FM (porteuse sine + modulante), décroissance type cloche/marimba.
- `pianoNote(t,freq,vel)` — saw → passe-bas avec enveloppe rapide, note « piano/stab » house.
- `blip(t,freq,vel,bright)` — saw/carré court, attaque nette (trance / dark / synthwave).

`hitSound` dispatche selon `hitVoice` :
```
'pluck'  → pluck(...)            (défaut, rétro-compatible)
'bell'   → bell(...)
'piano'  → pianoNote(...)
'blip'   → blip(...)
'voc'    → voc(actx.currentTime,[freq],0.55,T.hitVoc||'aah',perfect?.34:.28)
```

`perfect` reste plus brillant/fort (comme aujourd'hui : `vel` plus élevé, `bright` true).

### Mapping des 11 pistes

| Piste | `hitVoice` (+`hitVoc`) |
|---|---|
| Tide | `pluck` |
| Undertow | `bell` (grave/doux) |
| Riptide | `blip` (brillant) |
| Maelström | `blip` (agressif) |
| Sirène | `voc` / `aah` |
| Écume | `voc` / `ooh` |
| Abysse | `voc` / `ooh` |
| Raz-de-marée | `piano` |
| Orbite | `blip` |
| Néon | `bell` (brillante) |
| Mirage | `bell` (très brillante) |

> La distinction « grave/doux » vs « brillante » pour `bell`, et « brillant » vs « agressif » pour
> `blip`, passe par le paramètre `bright` (et le niveau `vel`), pas par des synthés séparés.

## Ce qui ne change pas

- Note mélodique du tap (montée pentatonique avec le combo), `burst` de particules, jugement
  PERFECT/GOOD, scheduler, rendu, UI, persistance.
- Les pistes sans `hitVoice` retombent sur `pluck` (rétro-compatible).

## Critères de réussite

- Sur Sirène/Écume/Abysse, on entend clairement un **chœur** (aah/ooh), sans nappe « cuivre »
  qui domine ; le timbre « aah » se distingue de « ooh ».
- Chaque piste a un **son de tap distinct** raccord avec son style (cloche, piano, blip, voix…).
- Les 4 pistes d'origine restent jouables ; Tide garde son `pluck`.
- Aucun décalage rythmique (les sons de tap sont déclenchés à l'instant du tap réussi, comme avant).

## Hors périmètre

- Vraies voix échantillonnées (écarté).
- Mélodies écrites par piste (écarté ; on garde la montée pentatonique).
