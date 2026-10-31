# Niveaux : progression, génération, défi du jour, temps

Aucun niveau n'est stocké. Le niveau `n` est **entièrement reconstruit** à partir de la chaîne `jardin-n` : [levels.ts](../src/core/levels.ts) en tire les paramètres (`LevelInfo`), puis [generator.ts](../src/core/generator.ts) construit le jardin (`Puzzle`). Le côté joueur est décrit dans le README : [Génération des niveaux](../README.md#génération-des-niveaux), [Formes de jardin](../README.md#formes-de-jardin), [Niveaux difficiles](../README.md#niveaux-difficiles--bords-reliés), [Jardins hexagonaux](../README.md#jardins-hexagonaux), [Difficulté](../README.md#difficulté--déductions-avancées).

> **Règle d'or** : changer quoi que ce soit dans ce document (tableaux, ordre des tirages, générateur, solveur, formes) change les niveaux existants. Il faut alors incrémenter `GENERATOR_VERSION` et régénérer la table des points du serveur. Voir [maintenance.md](maintenance.md#je-change-la-génération-des-niveaux).

## Déterminisme : `Rng` et seeds

[rng.ts](../src/core/rng.ts) fournit `Rng` (sfc32, initialisé par `hashString(seed)` puis 15 tirages de chauffe) et `fork(label)`, qui dérive un générateur indépendant. Le moteur n'utilise **jamais** `Math.random`.

Seeds utilisées :

| Chaîne | Usage |
| --- | --- |
| `jardin-${n}` | Seed du niveau `n` (`LevelInfo.seed`), passée au générateur. |
| `jardin-${n}:params` | Tirage des paramètres du niveau dans `levelInfo`. |
| `ruche-${n}` | Tirage « hexagonal ou non » du niveau `n` (`drawHex`). |
| `jour-${YYYY-MM-DD}` (+ `:params`) | Défi du jour. |
| `jour-style:${key}` | Style du défi du jour ([src/daily.ts](../src/daily.ts)). |
| `style:${n}` | Style « Aléatoire » du niveau `n` ([game.ts](../src/game.ts), `pickStyle`). |
| `accueil`, `tutoriel`, `tutoriel-bords`, `preview` | Jardin de l'accueil, décors des tutoriels et des aperçus. |

Dans `generate()`, la seed est découpée en flux indépendants : `rng.fork('shape')`, `fork('tree')`, `fork('repair')`, `fork('scramble')`, puis `fork('harden')`. Ajouter un tirage dans l'un ne décale pas les autres. En revanche, dans `levelInfo`, **l'ordre des appels** au même `rng` compte : pour un niveau normal, on tire toujours `pick(band.sizes)` (même si `FIRST_SIZES` impose la taille), puis `windiness`, puis `chance(shapeChance)`, puis `pick(pool)`, puis `fork('fit')`. Insérer ou retirer un appel change tous les niveaux.

## Progression : `levelInfo(n)` ([levels.ts](../src/core/levels.ts))

`LevelInfo` : `index`, `width`, `height`, `shape`, `windiness`, `seed`, `cells` (nombre de parcelles), `wrap` (bords reliés), `advanced` (part de parcelles à hypothèse visée), `hex`.

Trois branches, dans cet ordre :

### 1. Niveau difficile (bords reliés)

`isHardLevel(n)` : `n % 10 === 0` jusqu'à `HARD_EVERY_5_FROM = 50` inclus, puis `n % 5 === 0`. `hardOrdinal(n)` donne son rang (1 pour le niveau 10, 5 pour le 50, 6 pour le 55…).

- Taille (`wrapSize`) : marche de `WRAP_LADDER` (4×4, 4×5, 5×5, 5×6, 6×6, 6×7, 7×7, 7×8, 8×8, 8×9, 8×10), atteinte quand le rang dépasse `WRAP_RUNG_FROM` (`[1, 2, 3, 4, 6, 8, 11, 14, 18, 23, 29]`). À partir de la 4e marche, 30 % de chances de redescendre d'une marche.
- Forme `rect`, `windiness` entre 0,3 et 0,8, `wrap: true`, jamais hexagonal.
- `advanced` : 0,05 à partir de `ADVANCED_HARD_FROM = 50`, 0 avant.

### 2. Niveau hexagonal

`isHexLevel(n)` remplit à la demande deux tableaux en mémoire : `hexFlags[n]` (hexagonal ou non) et `hexBefore[n]` (nombre de niveaux hexagonaux avant `n`). Le tirage (`drawHex(n, afterHex)`) :

1. si `n` est dans `SET_HEX` (niveaux fixés à la main), sa valeur ;
2. sinon `false` si le niveau est difficile, suit un niveau hexagonal, ou a une forme imposée (`FIXED_SHAPES`) ;
3. sinon `new Rng('ruche-n').chance(HEX_CHANCE)` avec `HEX_CHANCE = 0.31` (au-dessus de 1/4 pour compenser les niveaux écartés).

`SET_HEX` fixe les 9 premiers niveaux (hexagones aux niveaux 4 et 8) et quelques retouches plus loin pour équilibrer les 50 premiers niveaux. Comme la suite est calculée **en chaîne**, changer une seule entrée de `SET_HEX` peut changer tous les niveaux hexagonaux suivants (règle « jamais deux à la suite », et rang dans l'échelle des formes).

Forme et taille (`hexPlan`) : le k-ième niveau hexagonal (`k = hexBefore[n]`) prend `HEX_LADDER[k]` (rayon de miel 3×4, alvéole 5×5, rayon de miel 5×5, couronne 7×7…), puis tourne sur `HEX_CYCLE`. `advanced` : 0 avant `ADVANCED_HEX_FROM = 43`, puis de 0,04 à 0,08 sur 60 niveaux.

### 3. Niveau normal

- **Bande** : la première de `BANDS` dont `upTo ≥ n`. Chaque bande donne des tailles candidates `[w, h]` et une chance de forme (`shapeChance`, 0 jusqu'au niveau 9, puis 0,2 → 0,5). La taille est tirée dans la bande, sauf si `FIRST_SIZES[n]` l'impose (3×3 au niveau 1, 3×4, 4×4, 4×5… 5×5 au niveau 9).
- **Forme** : `FIXED_SHAPES[n]` si présent (cœur au 9, trèfle au 11, cercle au 14, étangs au 17, cloître au 22, losange au 27, sablier au 36, cœur au 44), sinon une forme de `SHAPES` si le tirage `chance(shapeChance)` réussit (le cœur est exclu au-delà de 80 parcelles). Sinon `rect`.
- **Boîte** : `ponds` garde le rectangle (il y creuse des trous) ; les autres formes passent par `fitShape(shape, w*h, rng)` qui cherche une boîte de largeur impaire 5, 7 ou 9, de hauteur au plus `w + MAX_EXTRA_ROWS[shape]` et 15, dont le nombre de cellules approche la cible (score `|écart| + 0,6 × (h − w)`). Le cœur a une seule hauteur par largeur (`heartHeight` : 5×5, 7×6, 9×8). La largeur ne dépasse jamais 9 (téléphone en portrait).
- `advanced` (`advancedShare`) : 0 avant `ADVANCED_FROM = 21`, puis de 0,06 à 0,12 linéairement jusqu'au niveau 80.
- `cells` est compté avec `buildShape(shape, w, h, new Rng(seed).fork('shape'))`, le même flux que le générateur.

`buildLevel(n)` appelle `generate()` avec ces paramètres et garde les 8 derniers puzzles en cache.

## Formes ([shapes.ts](../src/core/shapes.ts))

`buildShape(shape, width, height, rng?, hex)` renvoie un masque `Uint8Array` des cellules actives :

- formes carrées (`circle`, `diamond`, `plus`, `flower`, `hourglass`, `rect`) : test `inside(shape, u, v)` sur les coordonnées normalisées dans [-1, 1] ; `heart` : dessin case par case (`heartMask`) ; `cloister` : cadre évidé (`cloisterMask`, épaisseur `cloisterThickness`) ; `ponds` : rectangle dont `carvePonds` retire quelques cellules (aléa du flux `shape`) ;
- formes hexagonales (`hexagon`, `comb`, `crown`, liste `HEX_SHAPES`) : `hexMask` ;
- toutes sont réduites à la composante connexe de la source (`keepConnected`).

`sourceCell` : la cellule centrale (`centerOf`) si active, sinon (cloître, couronne) la cellule active la plus proche, de préférence en dessous du centre, puis au plus près de la colonne du milieu.

## Générateur ([generator.ts](../src/core/generator.ts))

`generate(params: GenParams): Puzzle`. Étapes :

1. **Arbre couvrant** (`growTree`) : algorithme *growing tree* depuis la source. À chaque pas, avec la probabilité `windiness` on prolonge la dernière branche active (canaux longs et sinueux), sinon une branche au hasard (réseau touffu). Degré maximal `maxDegree = 3` (4 pour la source). Si les plafonds de degré enferment une partie du jardin, ils sont levés (`relaxed`) pour finir.
2. **Unicité** : boucle jusqu'à `maxRepairs` (400, ou 3000 pour les bords reliés) : `solve(grid, conn, 0)` ; si `'stuck'`, `repair()` recâble l'arbre près d'une parcelle ambiguë (ajoute une arête vers un voisin, retire une arête du cycle ainsi créé, en respectant les degrés). Si l'unicité n'est pas prouvée en déduction pure, une dernière tentative en profondeur 1 peut la prouver.
3. **Durcissement** (si `advanced > 0`) : jusqu'à `maxHarden = 1200` recâblages aléatoires, gardés seulement si le jardin reste unique en profondeur 1 et si le nombre de parcelles laissées ouvertes par les déductions directes (`deepCells`) augmente sans dépasser `2 × cible`. Cible : `max(2, round(parcelles × advanced))`.
4. **Mélange** : chaque parcelle reçoit une rotation aléatoire ; si moins de 3 parcelles ont bougé, toutes sont tournées d'un pas (le jardin ne commence jamais résolu).

`Puzzle.deepCells` est utilisé par le modèle de temps. `Puzzle.unique` est vérifié par les tests (150 premiers niveaux, force brute dans [brute.test.ts](../tests/brute.test.ts)).

## Solveur ([solver.ts](../src/core/solver.ts))

État : pour chaque cellule, ses orientations distinctes (`distinctRotations`) et un masque des orientations encore possibles (`alive`). Au départ, les orientations qui ouvrent vers un bord ou une case vide sont éliminées.

Déductions sûres, répétées jusqu'à stabilité (`deduce`) :

- **locales** (`propagateLocal`) : un côté ouvert à coup sûr force le voisin à être ouvert de son côté, un côté impossible le force fermé ;
- **globales** (`globalPass`, union-find sur les côtés sûrs) : pas de boucle (un côté indécis entre deux cellules déjà reliées est fermé) ; un groupe qui n'a plus qu'une sortie doit la prendre ; deux groupes dont l'union n'aurait plus de sortie ne doivent pas être reliés ; un groupe sans sortie (et pas tout le jardin) est une contradiction ;
- **hypothèse** (si `depth > 0`) : pour chaque orientation encore possible, on la suppose et on déduit en `depth − 1` ; si cela mène à une contradiction, elle est éliminée.

Résultat : `'solved'` (une seule orientation partout : solution unique), `'stuck'` (avec la liste `undetermined`), ou `'contradiction'`. Les niveaux « directs » se résolvent en profondeur 0, les niveaux avancés en profondeur 1.

## Victoire ([board.ts](../src/core/board.ts))

La victoire ne compare pas à `Puzzle.solution` : `analyze()` déclare `solved` quand toutes les cellules sont arrosées depuis la source et qu'aucun côté n'est dans une boucle (`findLoopSides` : Tarjan itératif, les côtés reliés qui ne sont pas des ponts). Le jardin étant unique, c'est équivalent. `isCorrect(i)` et `applySolution(i)` (indices) utilisent, eux, `Puzzle.solution`.

## Défi du jour ([core/daily.ts](../src/core/daily.ts), [src/daily.ts](../src/daily.ts))

- Clé du jour : `dayKey()` = date **locale** `YYYY-MM-DD`. Seed : `jour-${key}`. Index : `0`.
- Difficulté selon `date.getDay()` (tableau `WEEK`, dimanche = 0) : tailles candidates, chance de forme, bords reliés (samedi uniquement), part `advanced` (0 lundi et mardi, 0,05 → 0,09 de mercredi à vendredi, 0,04 samedi, 0,1 dimanche avec les plus grands jardins). Jamais hexagonal (`hex: false`).
- `buildDaily(key)` garde 4 puzzles en cache.
- Style du jour : `dailyThemeId(key, THEMES)` = `THEMES[hashString('jour-style:' + key) % THEMES.length]`, parmi **tous** les styles, débloqués ou non.
- Sauvegarde à part : `save.daily = { key, snapshot, result }` ; la progression des niveaux n'est pas touchée. Le résultat (`DailyResult` : temps, coups, indices, zones, rang) alimente le texte à partager (`shareText`).

## Modèle de temps et rang « plus rapide que X % » ([timing.ts](../src/core/timing.ts))

Calcul local, sans serveur.

```ts
median = 0.8 * tiles ** 1.3 + deepCells * 7;   // secondes
if (wrap) median *= WRAP_FACTOR;  // 2.5
if (hex)  median *= HEX_FACTOR;   // 1.4
return { median: Math.max(20, median), sigma: TIME_SPREAD };   // 0.95
```

- Les temps des joueurs sont supposés **log-normaux** : `z = (ln t − ln median) / sigma`. L'écart `TIME_SPREAD` est large (il valait 0,55 au début, ce qui donnait à tout le monde un très bon rang).
- `fasterThan(seconds, model, hints)` : `t = max(1, seconds + hints × HINT_PENALTY)` avec `HINT_PENALTY = 25` s, puis `100 × (1 − Φ(z))`, arrondi et borné entre 1 et 99. `normalCdf` utilise l'approximation d'Abramowitz et Stegun.
- `Game.recordWin` passe `hints + ZONE_HINT_WEIGHT × zones` (`ZONE_HINT_WEIGHT = 3`) et `this.elapsed` (chrono qui ne tourne qu'en jeu, page visible, sans carte ouverte).
- Le rang sert à la carte de victoire, au résultat du défi du jour, et aux défis des styles Désert (80 %) et Sauvage (95 %) via `stats.bestFasterThan`.

Pour régler l'estimation, ce sont `0.8`, `1.3`, `7`, `WRAP_FACTOR`, `HEX_FACTOR`, `TIME_SPREAD` et `HINT_PENALTY` qu'il faut toucher ; les tests de [progress.test.ts](../tests/progress.test.ts) et [hex.test.ts](../tests/hex.test.ts) vérifient le sens des effets (plus grand ou plus dur = plus long, indice = pénalité).

**Vrais temps.** Chaque jardin réussi envoie son temps au serveur (premier passage seulement). Dès que 20 autres joueurs ont un temps sur le même jardin (même numéro, même `GENERATOR_VERSION`), le vrai rang remplace l'estimation sur la carte de victoire. Ces temps servent aussi à recaler les constantes ci-dessus : voir [Temps de résolution](online.md#temps-de-résolution).
