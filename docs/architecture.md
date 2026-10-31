# Architecture

Vue d'ensemble du code : qui fait quoi, comment les données circulent, et où vit l'état. Pour la liste des fichiers avec une ligne chacun, voir aussi [Organisation du code](../README.md#organisation-du-code) dans le README.

## Les dossiers

| Dossier | Rôle | Dépend de |
| --- | --- | --- |
| [src/core/](../src/core/) | Moteur pur : seed, grille, formes, générateur, solveur, état de jeu, progression, défi du jour, modèle de temps. **Aucun accès au DOM, aucun texte** (les noms sont traduits à l'affichage). | rien (sauf lui-même) |
| [src/render/](../src/render/) | Rendu Canvas 2D, animations des parcelles, palette, styles ([themes/](../src/render/themes/)), décor des parcelles, particules, fond, aperçus 2D. | `core` |
| [src/render3d/](../src/render3d/) | Rendu three.js : sous-classe du rendu 2D, géométrie, shaders, modèles low poly des détails ([props/](../src/render3d/props/)), aperçus 3D. | `core`, `render`, `three`, `polygon-clipping` |
| [src/ui/](../src/ui/) | HUD en DOM ([hud.ts](../src/ui/hud.ts)), gestes ([input.ts](../src/ui/input.ts)), sauvegarde ([storage.ts](../src/ui/storage.ts)), partage, fausse pub, cartes de ligue, avatars, titre animé. | `core`, `i18n`, `online` |
| [src/online/](../src/online/) | Ligues et amis : barème, interface `SocialBackend`, implémentations Supabase et démo, file hors ligne. | `core`, `i18n` |
| [src/i18n/](../src/i18n/) | Traductions (9 langues), `t()`, `tn()`, `applyDom()`. | rien |
| [src/audio/](../src/audio/) | Sons synthétisés en WebAudio ([sound.ts](../src/audio/sound.ts)). | rien |
| [src/](../src/) (racine) | [main.ts](../src/main.ts) (démarrage et boucle), [game.ts](../src/game.ts) (contrôleur), [tutorial.ts](../src/tutorial.ts), [progress.ts](../src/progress.ts) (déblocage des styles), [streak.ts](../src/streak.ts), [daily.ts](../src/daily.ts) (résultat et texte du défi du jour), [native.ts](../src/native.ts) (Capacitor). | tout |
| [supabase/migrations/](../supabase/migrations/) | Schéma SQL et fonctions du serveur. | — |
| [scripts/](../scripts/) | [level-points.ts](../scripts/level-points.ts) (table des points), [make-icon.mjs](../scripts/make-icon.mjs) (icône). | `core`, `online` |
| [tests/](../tests/) | Vitest (moteur, styles, modèles 3D, traductions, serveur sur PGlite). | — |
| [index.html](../index.html) | Tout le HUD statique (barres, cartes, accueil) avec ses attributs `data-i18n`, et le `<canvas id="garden">`. | — |
| [public/](../public/) | Copié tel quel dans `dist/` : icône, manifeste web, images des aperçus de styles ([public/previews/](../public/previews/)). | — |
| `android/`, `ios/` | Projets natifs Capacitor (générés, puis versionnés). | `dist/` |

Règle à garder : `src/core` ne doit importer ni `render`, ni `ui`, ni `i18n`. C'est ce qui permet aux tests et au script [level-points.ts](../scripts/level-points.ts) de tourner sous Node.

## Démarrage et boucle principale ([main.ts](../src/main.ts))

Dans l'ordre :

1. Charge les polices Fredoka et [style.css](../src/style.css).
2. `?reset` dans l'adresse : `clearSave()` puis l'adresse est nettoyée.
3. **Langue d'abord** : `setLang(detectLang(loadSave().settings.lang))` puis `applyDom()`, car tout ce qui est construit ensuite lit ses textes dans cette langue.
4. `new Game(canvas)` sur `#garden`. En dev (`import.meta.env.DEV`), l'objet est exposé en `window.__game`.
5. `setupNativeApp(game)` : écouteurs Capacitor (n'agit que dans l'app native).
6. `fit()` sur `resize` et `visualViewport.resize` : `renderer.resize(w, h, devicePixelRatio)` puis `game.relayout()`.
7. `game.start()`, puis `relayout()` une fois les polices chargées.
8. Boucle `requestAnimationFrame(frame)` :

```ts
// Plein régime quand ça bouge, ~30 i/s quand seule l'eau scintille.
const IDLE_FRAME = 1 / 30 - 0.002;
if (dt >= IDLE_FRAME || game.renderer.isBusy()) {
  game.tick(dt);            // logique : chrono, fin de victoire, tutoriel
  game.renderer.update(dt); // animations : ressorts, eau, floraison, minuteries, particules
  game.renderer.draw();     // dessin
}
```

Le prochain `requestAnimationFrame` est demandé **avant** le travail de la frame : une exception dans une frame n'arrête pas la boucle. `isBusy()` ([renderer.ts](../src/render/renderer.ts)) renvoie vrai tant qu'une minuterie, un appui, un projecteur de tutoriel, des particules d'effet, une rotation, un remplissage d'eau, une floraison, un cadenas ou un saut de victoire est en cours ; [Garden3D](../src/render3d/garden3d.ts) ajoute le tour de victoire.

## Le contrôleur `Game` ([game.ts](../src/game.ts))

`Game` possède : le `Board` en cours, sa dernière `Analysis`, le `LevelInfo` (ou `DailyInfo`), le moteur de rendu, le `Hud`, le `Sound`, la sauvegarde `SaveData`, le `Social` (en ligne) et l'écran de ligue.

Trois modes (`type Mode = 'home' | 'play' | 'tutorial'`) :

- `home` : un petit jardin décoratif résolu (`generate({ width: 7, height: 7, shape: 'flower', seed: 'accueil', ... })`) derrière le titre ; les touchers sur le jardin sont ignorés (`cellAt` renvoie -1).
- `play` : un niveau (`play(n)` → `loadLevel(n)`) ou le défi du jour (`playDaily()` → `loadDaily(key)`), tous deux via `startGarden(info, puzzle, snapshot)`.
- `tutorial` : un des deux tutoriels de [tutorial.ts](../src/tutorial.ts) (`startTutorial(id, level)`).

Méthodes clés, dans l'ordre où elles s'enchaînent pendant une partie :

| Méthode | Rôle |
| --- | --- |
| `loadLevel(n)` | Choisit le style (`pickStyle(n)`), lance le tutoriel des bords reliés au premier niveau difficile, restaure l'instantané si `save.snapshot.level === n`, affiche les cartes d'introduction (hexagones, conseils). |
| `startGarden(info, puzzle, snap)` | Crée le `Board`, remet les compteurs à zéro, restaure l'instantané **seulement si** `snap.version === GENERATOR_VERSION`, passe le plateau au rendu, sauvegarde. |
| `onTap(cell)` | Tutoriel → `tutorialTap` ; zone armée → `applyZone` ; parcelle verrouillée → secousse + son refusé ; sinon `board.rotate` + `renderer.rotate` + `afterChange()`. |
| `paintStart/paintMove/paintEnd` | Peinture des verrous : la première parcelle bascule, les suivantes prennent le même état. |
| `afterChange()` | `board.analyze()` → `renderer.setAnalysis()`, toast si une nouvelle boucle apparaît, `onWin()` si résolu, sauvegarde différée de 400 ms. |
| `hint()`, `applyZone(cell)` | Indices : voir [ui-and-input.md](ui-and-input.md#indices-et-indices-de-zone). |
| `onWin()` | `recordWin` (rang, statistiques des défis), progression, série (`waterStreak`), déblocages (`refreshUnlocks`), `writeSave`, puis `scoreWin()` (envoi au serveur). |
| `tick(dt)` | Chrono (uniquement en jeu, page visible, aucune carte ouverte) ; une fois l'eau arrivée partout (`renderer.waterComplete()`) : son, vibration, `startShowcase()` après 0,5 s, `celebrate()` puis carte de victoire. |
| `persist()` | Écrit la sauvegarde ; en jeu non gagné, y joint l'instantané de la partie (`save.snapshot`, ou `save.daily.snapshot` pour le défi du jour). |
| `back()` | Bouton retour Android : ferme la carte du dessus, désarme la zone, ou revient à l'accueil ; `false` à l'accueil. |

Paramètres d'adresse lus par `Game` : `?niveau=N` (ouvre le niveau N, débloque jusqu'à N), `?debloquer` (tous les styles, 99 indices et 99 zones), `?rendu=2d` (force le rendu 2D), `?ami=CODE` et `?ligue=demo|off` (voir [online.md](online.md)). `?reset` est lu par [main.ts](../src/main.ts).

## Flux de données

```
            toucher / clic                                   requestAnimationFrame
                 │                                                    │
         ui/input.ts (attachInput)                                main.ts
                 │  tap / paintStart / zoom / drag ...                │ tick, update, draw
                 ▼                                                    ▼
   ┌──────────────────────────── game.ts (Game) ─────────────────────────────┐
   │  Board (core/board.ts) : rot[], locked[], analyze()  ──► Analysis       │
   │  LevelInfo / Puzzle (core/levels.ts, core/daily.ts, core/generator.ts) │
   └──┬──────────────┬──────────────────┬───────────────┬──────────────┬─────┘
      │setBoard       │setHints, toast   │writeSave      │recordSolve   │sound.*
      │setAnalysis    │showWin ...       │               │              │
      │rotate, ...    ▼                  ▼               ▼              ▼
      ▼          ui/hud.ts (DOM)    ui/storage.ts    online/social.ts  audio/sound.ts
 GardenRenderer                    (localStorage)    (file + Supabase
 ou Garden3D                                          ou démo)
 (render/, render3d/)
      │ events.onWaterArrive(cell, dist) ──► sound.water(dist)
```

Points importants :

- **Le `Board` est la vérité** (rotations `rot[i]`, verrous `locked[i]`, compteur `moves`). Le moteur de rendu garde son propre état visuel par parcelle (`CellVis` : angle animé, eau, floraison…) et ne modifie jamais le `Board`.
- Après chaque changement, `Game` recalcule `board.analyze()` et la passe au rendu par `setAnalysis()`. L'`Analysis` dit quelles parcelles sont reliées (`linked`), arrosées (`watered`), à quelle distance de la source (`dist`), par quel côté l'eau entre (`inflow`), quels côtés sont dans une boucle (`loopSides`), l'ordre de parcours (`order`) et si le jardin est résolu (`solved`).
- La victoire est **logique** (`analysis.solved`) dès le dernier toucher ; la célébration attend que l'eau **visible** ait tout rempli (`renderer.waterComplete()`).
- Le rendu notifie l'arrivée de l'eau dans chaque parcelle (`events.onWaterArrive`) : c'est ce qui joue la mélodie pentatonique.

## Le moteur de jeu ([src/core/](../src/core/))

| Fichier | Contenu |
| --- | --- |
| [rng.ts](../src/core/rng.ts) | `hashString` (hachage 32 bits) et `Rng` (sfc32) : `next`, `int`, `range`, `float`, `chance`, `pick`, `shuffle`, `fork(label)`. **Toute** l'aléa du moteur passe par là, jamais par `Math.random`. |
| [grid.ts](../src/core/grid.ts) | `Grid` : cellules actives, voisins précalculés (`neighbor(i, d)`), bords reliés (`wrap`), hexagones (`hex`, `sides` 4 ou 6), `rotate`, `opposite`, `openMask`, `center`. Masques de connexion : N=1, E=2, S=4, W=8 ; hexagones N, NE, SE, S, SW, NW = bits 0 à 5. Tourner d'un pas horaire décale le masque d'un bit à gauche. |
| [shapes.ts](../src/core/shapes.ts) | `buildShape(shape, w, h, rng, hex)` : masque des cellules actives (réduit à la composante connexe de la source) ; `sourceCell` ; `heartHeight`, `cloisterThickness`, `hexDistance`. |
| [generator.ts](../src/core/generator.ts) | `generate(params)` → `Puzzle` (`grid`, `source`, `solution`, `tiles` mélangées, `unique`, `repairs`, `deepCells`). |
| [solver.ts](../src/core/solver.ts) | `solve(grid, tiles, depth)` → `'solved' \| 'stuck' \| 'contradiction'`. |
| [board.ts](../src/core/board.ts) | `Board` (état jouable) et `analyze()` ; boucles détectées par Tarjan itératif (arêtes qui ne sont pas des ponts). |
| [levels.ts](../src/core/levels.ts) | `levelInfo(n)`, `buildLevel(n)` (cache de 8 puzzles), `isHardLevel`, `isHexLevel`, `GENERATOR_VERSION`. |
| [daily.ts](../src/core/daily.ts) | `dayKey`, `dailyInfo(key)`, `buildDaily(key)` (cache de 4). |
| [timing.ts](../src/core/timing.ts) | `timeModel(puzzle)`, `fasterThan(seconds, model, hints)`, `formatTime`. |

Détails dans [levels.md](levels.md).

## Les deux moteurs de rendu

`Game` choisit à la construction :

```ts
const flat = params.get('rendu') === '2d';
this.renderer = !flat && Garden3D.supported() ? new Garden3D(canvas) : new GardenRenderer(canvas);
```

`Garden3D.supported()` teste la création d'un contexte `webgl2` ou `webgl`. Sans WebGL, le jeu tourne en 2D.

### `GardenRenderer` ([render/renderer.ts](../src/render/renderer.ts)) : la classe de base

Elle porte **toute l'animation**, indépendante de la façon de dessiner :

- par parcelle (`CellVis`) : ressort de rotation (`angle`, `vel`, `target` ; raideur 320, amortissement 0,68), `water` (remplissage 0..1), `bloom` (floraison), `loop`, `lock`, `press`, `shake`, `popAt` (saut de victoire), `decor` (décor déterministe, voir [rendering-2d-and-styles.md](rendering-2d-and-styles.md#le-décor-dune-parcelle-decorts)) ;
- l'eau **avance physiquement** (`update`) : une parcelle ne se remplit (`FILL_RATE = 6.5`/s) que si elle est immobile et que la parcelle qui l'alimente (`inflow`) est pleine et immobile ; une parcelle sèche se vide (`DRAIN_RATE = 5`) ; la floraison suit l'eau (`BLOOM_RATE = 1.05`, `WILT_RATE = 1.6`) ;
- minuteries (`after(delay, fn)`, temps du rendu) et `celebrate(onDone)` (vague de sauts depuis la source, pétales, papillons si `theme.creature === 'butterfly'`) ;
- état d'interface : `lockMode`, `hold` (anneau d'appui long), `spotlight` (projecteur du tutoriel), `showLocks`, `insets` (place laissée par le HUD), `maxTile` (96 px par défaut) ;
- particules ([particles.ts](../src/render/particles.ts)) : ambiance du style et effets.

Elle dessine aussi en 2D : fond ([background.ts](../src/render/background.ts)), socle, bandes fantômes, ombres, parcelles (images en cache par parcelle : sèche/mouillée × fond/premier plan), passerelles entre parcelles, détails, superpositions (cadenas, anneaux), projecteur.

Méthodes que `Game` appelle sur le rendu : `resize`, `setInsets`, `setBoard(board, decorSeed)`, `setAnalysis`, `rotate(cell, steps)`, `syncRotations()`, `shake`, `setPressed`, `cellAt(x, y)`, `cellCenter(i)`, `after`, `celebrate`, `waterComplete`, `refreshScenery`, `refreshTheme`, et les méthodes de vue (`canDrag`, `zoomAt`, `drag`, `dragEnd`, `panBy`, `startShowcase`, `setShowcaseSpace`), **vides en 2D**.

### `Garden3D` ([render3d/garden3d.ts](../src/render3d/garden3d.ts)) : la sous-classe

Elle **réutilise** de la base : tout `update()` (ressorts, eau, floraison, minuteries, particules), `setBoard` (création des `CellVis` et du décor), `celebrate`, `waterComplete`, `isBusy` (complété), le fond 2D (`this.bg`) et les particules.

Elle **remplace** :

| Méthode | En 3D |
| --- | --- |
| `layout()` | Cadre la caméra (recherche de distance) au lieu de calculer une taille de parcelle. |
| `setBoard()` | Remet zoom et tour de victoire à zéro, appelle la base, puis `build()` (scène three.js). |
| `draw()` | Fond 2D → `sync()` (copie l'état animé dans les objets 3D) → rendu WebGL dans un canevas caché → `drawImage` dans le canevas 2D → anneau d'appui long et projecteur dessinés en 2D par-dessus → particules. |
| `cellAt`, `cellCenter`, `facePos`, `boardBounds` | Rayon caméra → plan du gazon ; projection des positions 3D. |
| `refreshScenery`, `refreshTheme`, `resize` | Mettent aussi à jour la palette des shaders, reconstruisent la scène, dimensionnent WebGL (ratio de pixels plafonné à 2). |
| `canDrag`, `zoomAt`, `drag`, `dragEnd`, `panBy`, `startShowcase`, `setShowcaseSpace` | Zoom, déplacement et tour de victoire (inexistants en 2D). |

Les méthodes de dessin 2D des parcelles (`drawCell`, `drawCellProps`, `drawBridges`, `drawCellOverlay`, `drawSpotlight`) ne sont pas appelées en 3D. Tout le détail : [rendering-3d.md](rendering-3d.md).

## État et sauvegarde ([ui/storage.ts](../src/ui/storage.ts))

Toute la progression tient dans **une** entrée `localStorage`, clé `jardin-des-sources:v1`, au format JSON `SaveData` :

| Champ | Contenu |
| --- | --- |
| `level`, `maxLevel` | Niveau en cours, plus haut niveau débloqué. |
| `snapshot` | Partie en cours d'un niveau : `LevelSnapshot` = `BoardSnapshot` (`rot` et `locked` en chaînes d'un chiffre par cellule, `moves`, `time`, `version`) + `level`, `hints`, `zones`, `usedLock`. |
| `settings` | `sound`, `haptics`, `theme` (id de style ou `'aleatoire'`), `lang` (absent : langue de l'appareil). |
| `solved`, `hints`, `zoneHints`, `skipped`, `unlocked` | Compteurs, stocks d'indices (départ : `STARTING_HINTS = 5`, `STARTING_ZONE_HINTS = 3`), niveaux passés par vidéo, styles débloqués. |
| `seenTutorial`, `seenLockTip`, `seenHardIntro`, `seenHexIntro` | Cartes et tutoriels déjà vus. |
| `stats` | Chiffres des défis de styles (`hardSolved`, `bestFasterThan`, `noHelpBest`, `bestTimes`, `noHintBest`, `noHintStreak`, `noHintBestStreak`, `biggestSolved`, `shapesSolved`, `dailyDone`, `shared`). |
| `daily` | `{ key, snapshot, result }` du dernier défi du jour joué. |
| `streak` | `{ last, count, best }` (série d'arrosage). |

Comportement :

- `loadSave()` fusionne la sauvegarde avec `DEFAULTS` (champ par champ, et en profondeur pour `settings`, `stats`, `streak`). **Ajouter un champ** à `SaveData` ne demande donc pas de migration : il prend sa valeur par défaut. Renommer ou changer le type d'un champ en demande une (il n'y a pas de numéro de version du format, seulement le `:v1` de la clé).
- `writeSave()` et `loadSave()` avalent les erreurs (navigation privée, quota) : le jeu tourne sans sauvegarde.
- `Game.persist()` est appelé au retour à l'accueil, au début d'un jardin, sur `visibilitychange` (page cachée), `pagehide`, l'événement Capacitor `pause`, et 400 ms après chaque changement (`persistSoon`). La victoire écrit directement la sauvegarde (`writeSave` dans `onWin`), instantané effacé.

### `GENERATOR_VERSION`

Un niveau est reconstruit depuis sa seed ; l'instantané ne contient que les rotations et verrous **par index de cellule**. Si la génération change, le même index désigne un autre jardin. D'où `GENERATOR_VERSION` dans [levels.ts](../src/core/levels.ts) : il est écrit dans chaque instantané (`persist()`), et `startGarden()` ignore un instantané d'une autre version (la partie repart de zéro, la progression `level`/`maxLevel` est gardée). **À incrémenter à chaque changement de génération** (voir [maintenance.md](maintenance.md#je-change-la-génération-des-niveaux)).

### Autres clés `localStorage`

| Clé | Écrite par | Contenu |
| --- | --- | --- |
| `gardendoku:social-queue` | [social.ts](../src/online/social.ts) | File des jardins résolus pas encore envoyés. |
| `gardendoku:social-demo` | [social.ts](../src/online/social.ts) | `'1'` quand le mode démo de la ligue est actif. |
| `gardendoku:demo-social` | [demo.ts](../src/online/demo.ts) | État du joueur dans la ligue de démo. |
| `gardendoku:auth` | supabase-js | Session Supabase anonyme (`storageKey` dans [supabase.ts](../src/online/supabase.ts)). |

`?reset` n'efface que `jardin-des-sources:v1` : la session en ligne, la file et la démo restent.

## L'app native ([native.ts](../src/native.ts))

`isNativeApp = Capacitor.isNativePlatform()`. Dans le navigateur, tout se replie sur les API web. Dans l'app :

- `vibrate(pattern)` : nombre → `Haptics.impact` (léger si ≤ 8 ms, moyen sinon) ; tableau → chaque impulsion jouée à son heure (`Haptics.vibrate` avec durée sur Android, impact fort sur iOS). `WIN_BUZZ` est le motif de victoire.
- `nativeShare(text)` : feuille de partage native (`@capacitor/share`).
- `setupNativeApp(host)` : barres système à icônes foncées, sauvegarde sur `pause`, liens `gardendoku://ami/CODE` (`appUrlOpen` → `host.friendLink`), bouton retour Android (`host.back()`, sinon `App.minimizeApp()`).

`Game` implémente l'interface `NativeHost` (`back`, `persist`, `friendLink`).
