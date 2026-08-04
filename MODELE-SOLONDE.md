# Le modèle Solônde — référence consolidée

> Document de travail. Rassemble tout ce qui a été établi et vérifié jusqu'ici, pour servir de socle avant l'implémentation 3D. Les points encore ouverts sont marqués **[OUVERT]**.

---

## 1. L'unité : la Solônde

- **Solônde** : le tick de l'horloge OmcV.
- **Solônde neutre = 1/2 seconde** — référentiel caché, jamais affiché.
- Aucune notion d'heures / minutes / 24h : le système est autonome.

## 2. Le cadran — 432 repères, 4 saisons

Le cycle se lit sur **432 repères fixes**, divisés en 4 quarts égaux de 108 :

| Quart | Repères | Saison | Ratio |
|---|---|---|---|
| 1 | 1–108 | Printemps | 11/10 |
| 2 | 109–216 | Été | 12/11 |
| 3 | 217–324 | Automne | 11/12 |
| 4 | 325–432 | Hiver | 10/11 |

Les jonctions : Printemps↔Été = solstice, Été↔Automne = équinoxe, Automne↔Hiver = solstice, Hiver↔Printemps = solstice.

## 3. Le fractal jour ⟷ année

La même cascade de 4 ratios s'applique à deux échelles imbriquées :

**À l'échelle du jour** (répartition des Solônde dans les 4 quarts d'un jour dont le total est 142560) :

```
32400 →(×11/10)→ 35640 →(×12/11)→ 38880 →(×11/12)→ 35640 →(×10/11)→ 32400
```
Somme = 142560 Solônde = 71280 secondes.

**À l'échelle de l'année** (le total quotidien lui-même oscille, jour après jour) :

```
129600 →(×11/10)→ 142560 →(×12/11)→ 155520 →(×11/12)→ 142560 →(×10/11)→ 129600
```

- 129600 = solstice hiver (jour neutre, aucune respiration interne)
- 142560 = équinoxe (jour de référence, celui de la section 3a)
- 155520 = solstice été = **360 × 432** (coïncidence exacte avec la grille calendaire)

Il n'y a pas de "jours repères" isolés : c'est une **sinusoïdale continue**, les solstices/équinoxes n'étant que les 4 points d'inflexion.

## 4. Racine numérique 9

432, 396, 360, 108, 129600, 142560, 155520, 25920, 51840 ont tous une racine numérique de **9**. Ce n'est pas une coïncidence mystique : 108 = 12×9, 432 = 48×9, 396 = 44×9, 360 = 40×9 — le facteur 9 est câblé dès la base, et les multiplications par 10/11/12 ne le retirent jamais (aucun facteur commun avec 9).

## 5. La polarité de la sphère

Les deux grilles structurelles (432 = repères de phase, 360 = jours de l'année) sont elles-mêmes les deux pôles de densité :

| | Calcul | Résultat |
|---|---|---|
| Pôle expansion | 432 × 360 | **155520** |
| Pôle contraction | 360 × 360 | **129600** |
| Centre (équateur) | 396 × 360 | **142560** |

396 = moyenne exacte de 432 et 360 — et 142560 est aussi (vérifié) la moyenne arithmétique exacte de 129600 et 155520.

**Brique minimale : 12960**
```
12960 = 142560 − 129600 = 155520 − 142560
12960 = 36 × 360   (quantum du cadran × grille des jours)
12960 = 432 × 30 = 360 × 36   (proportion 432/360 = 36/30 = 6/5)
```
Un seul nombre (12960), mirroré, suffit à diviser la sphère en deux hémisphères cohérents autour du centre commun : **Nord = centre + 12960**, **Sud = centre − 12960**. Amplitude totale pôle-à-pôle : 155520 − 129600 = **25920**.

Les hémisphères sont en **opposition de phase exacte** (miroir à 180°) : la contraction d'un pôle entraîne mécaniquement l'expansion de l'autre.

## 6. Les bornes d'élasticité (6/5 ↔ 5/6)

```
155520 / 129600 = 6/5     129600 / 155520 = 5/6
```
Vérifié algébriquement : 6/5 = (11/10)×(12/11) [Printemps+Été composés], 5/6 = (11/12)×(10/11) [Automne+Hiver composés]. Ce ratio n'est donc rien d'autre que le trajet pôle-à-pôle déjà connu, écrit sur un demi-cycle.

**Rôle exact de 6/5 et 5/6** : appliqués à une densité (ex. 142560×6/5=171072, 142560×5/6=118800), ils ne donnent **pas une nouvelle densité** — ils donnent le **point-limite géométrique** : la borne maximale que l'élasticité de cette densité peut atteindre en expansion / en contraction. Chaque densité a sa propre élasticité ; 6/5 et 5/6 bornent le maximum fractal atteignable, à toutes les échelles.

## 7. Le centre est un point 3D, pas l'équateur

Le "centre" (142560) n'est pas un point à la surface de la sphère (comme l'équateur) — c'est le **centre géométrique de la sphère** (son origine 3D). C'est là que l'élasticité agit :

- Le centre s'étire selon 6/5 (expansion) ou se resserre selon 5/6 (contraction) le long d'un axe.
- Cet étirement déforme la sphère entière en **ellipsoïde**.
- L'ellipse qu'on observe (vue de dessus, ou en coupe) est la **conséquence géométrique directe** de cette déformation — ce n'est pas un calque 2D indépendant posé sur une sphère rigide.
- Chaque densité (chacune des 9 — cf. §8) a sa propre élasticité : le modèle final est une série de **coquilles concentriques emboîtées**, chacune respirant à son propre rythme autour du même centre.

## 8. Cadran solaire à 12 découpes (précision d'horloger)

Câblé directement sur la sphère (pas seulement en overlay plat) :

| Repère | Sens |
|---|---|
| 432 | minuit solaire |
| 36, 72 | — |
| 108 | lever solaire |
| 144, 180 | — |
| 216 | zénith solaire |
| 252, 288 | — |
| 324 | coucher solaire |
| 360, 396 | — |

Les 4 cardinaux (minuit/lever/zénith/coucher) tombent exactement sur les quarts (432/4=108) — même logique fractale qu'entre jour et année.

## 9. Les 216 nœuds de densité

Grille proposée : **9 densités × 2 (polarité N/S) × 12 (états, division par 36) = 216 nœuds**, cartographiables sur une projection 2D-cercle du globe.

**Curseur maître** : le point sub-solaire (là où le soleil est au zénith) porte à lui seul les deux informations nécessaires — sa **latitude/déclinaison** (phase saisonnière → quelle densité) et sa **longitude/angle horaire** (heure → position sur le cadran 432). En théorie, connaître ce point unique suffit à dériver les 216 lectures par décalages fixes, sans capteur local (l'équivalent OmcV de Greenwich pour l'UTC).

## 10. Points encore ouverts **[OUVERT]**

1. **Valeurs précises des 9 densités** — paliers entre 129600 et 155520 : espacement régulier, ou logique fractale propre à définir ?
2. **Élasticité propre à chaque densité** — quel ratio local (11/10↔10/11, 12/11↔11/12, ou autre) pour chacune des 9, sachant que 6/5↔5/6 n'en est que la borne maximale ?
3. **Projection concrète des 216 nœuds** sur le disque 2D du globe.
4. **Formalisation mathématique du curseur sub-solaire** comme source unique du champ.

## 11. Postulat symbolique (hors physique)

Le modèle pose que le Soleil serait simultanément notre attracteur central et notre soleil — postulat assumé comme symbolique/spéculatif par le projet lui-même, pas comme un fait astrophysique établi.

---

*Fichier de travail — à mettre à jour au fil des clarifications, avant toute nouvelle passe sur `solonde-saturne.html`.*
