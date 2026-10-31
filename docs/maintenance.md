# Maintenance : listes de contrôle, pièges, glossaire

## Listes de contrôle

### Je change la génération des niveaux

Concerne : [levels.ts](../src/core/levels.ts) (tableaux `BANDS`, `FIRST_SIZES`, `FIXED_SHAPES`, `SET_HEX`, `HEX_CHANCE`, `HEX_LADDER`, `HEX_CYCLE`, `WRAP_LADDER`, `WRAP_RUNG_FROM`, `MAX_EXTRA_ROWS`, `advancedShare`, `fitShape`, ordre des tirages dans `levelInfo`), [generator.ts](../src/core/generator.ts), [solver.ts](../src/core/solver.ts) (s'il change ce qui est accepté), [shapes.ts](../src/core/shapes.ts), [grid.ts](../src/core/grid.ts), [rng.ts](../src/core/rng.ts). Voir [levels.md](levels.md).

1. Faire le changement. Garder `src/core` sans DOM ni texte, et toute l'aléa dans `Rng` (jamais `Math.random`).
2. **Incrémenter `GENERATOR_VERSION`** dans [levels.ts](../src/core/levels.ts) : les parties en cours sauvegardées avec l'ancienne version ne seront pas restaurées (sinon elles s'appliqueraient à un autre jardin).
3. **Nouvelle table des points** : `npm run level-points` écrit une **nouvelle** migration, nommée avec la date et l'heure ([scripts/level-points.ts](../scripts/level-points.ts)) ; l'appliquer sur le serveur. Un fichier déjà appliqué n'est jamais réécrit. Voir [online.md](online.md#table-des-points-des-niveaux).
4. `npm test`. À surveiller : unicité des 150 premiers niveaux ([core.test.ts](../tests/core.test.ts)), fréquence des hexagones entre 22 % et 28 % et niveaux 4 et 8 hexagonaux ([hex.test.ts](../tests/hex.test.ts)), tailles des premiers niveaux, tailles des niveaux difficiles (le plus grand = 80 parcelles jusqu'au niveau 250), table des points conforme au jeu et niveaux supposés à 1, 2 ou 4 points dans [online.test.ts](../tests/online.test.ts).
5. Mettre à jour le README si un comportement visible change (tailles, fréquences, liste des premiers niveaux hexagonaux…).
6. À la sortie : appliquer la migration de points sur le serveur.

Si seul le défi du jour change ([core/daily.ts](../src/core/daily.ts)) : `GENERATOR_VERSION` protège aussi l'instantané du défi en cours ; la table des points n'est pas concernée (le défi vaut toujours 3 points).

### J'ajoute ou je modifie un détail (prop)

1. **2D** : dans `src/render/themes/<style>.ts`, un `PropDef` (`id` unique dans le style, `place`, `size`, `weight`, `when`, `upright`, `animated`, `screen`, `draw`) ajouté à `props` du thème. Voir [rendering-2d-and-styles.md](rendering-2d-and-styles.md#un-détail-propdef).
2. **3D** : un modèle de même `id` dans `src/render3d/props/<style>.ts`. Voir [rendering-3d.md](rendering-3d.md#ajouter-ou-modifier-un-modèle). Sans modèle, un détail `screen` ou `animated` est **invisible** en 3D.
3. Vérifier à l'œil : `npm run dev`, choisir le style, `__game.renderer.gallery()` dans la console ; et `?rendu=2d` pour la version 2D.
4. `npm test` ([themes.test.ts](../tests/themes.test.ts) pour l'équilibre `save()`/`restore()` du dessin 2D, [props3d.test.ts](../tests/props3d.test.ts) pour le modèle).
5. Si le détail apparaît dans l'aperçu du menu (jardin 2×2 de `stage()`), régénérer les aperçus (`await __game.savePreviews()`).

Changer le catalogue d'un style (ajout, ordre, poids) change les détails tirés sur tous ses jardins : c'est visuel seulement, sans incidence sur la sauvegarde ni le serveur.

### Je change le look 3D

- Dimensions des parcelles : `M` dans [models.ts](../src/render3d/models.ts). `M.half`, `M.groove` et `M.gap` sont aussi utilisés par les passerelles, les copies fantômes, le badge et le projecteur ([garden3d.ts](../src/render3d/garden3d.ts)) : tout vérifier sur un niveau à bords reliés et un niveau hexagonal.
- Couleurs : palette du style ([palette.ts](../src/render/palette.ts), fichiers de [themes/](../src/render/themes/)), reprise en 3D par `updatePalette()` ; les couleurs fixes des modèles sont dans [props/](../src/render3d/props/).
- Shaders : [materials.ts](../src/render3d/materials.ts). Garder les clés `customProgramCacheKey` distinctes par variante de shader ; un patch `onBeforeCompile` qui dépend d'un paramètre doit changer la clé (comme `misty()` qui ajoute `-ghost`).
- Caméra et lumière : constantes en tête de [garden3d.ts](../src/render3d/garden3d.ts) (`FOV`, `ELEVATION`, `SHOW_*`) et constructeur (soleil, ombres).
- Tester : `npm test` ([render3d.test.ts](../tests/render3d.test.ts) si la géométrie du canal ou du socle change), puis sur téléphone (performances, ombres).
- **Régénérer les aperçus** du menu des styles (`await __game.savePreviews()` en dev), sinon le menu montre l'ancien look.

### J'ajoute un style

Voir la procédure complète dans [rendering-2d-and-styles.md](rendering-2d-and-styles.md#ajouter-un-style-de-bout-en-bout) : `ThemeId`, fichier du thème, `THEMES`, modèles 3D et `STYLE_MODELS`, défi dans `STYLE_CHALLENGES`, traductions `theme.<id>.name/.blurb`, aperçu, tests, README.

### J'ajoute une clé de traduction

1. Dans [fr.ts](../src/i18n/fr.ts), puis dans les 8 autres langues, avec les mêmes `{placeholders}` et balises ; pluriel = paire `_one`/`_other`.
2. `t('cle')` / `tn('cle', n)` dans le code, ou `data-i18n` / `data-i18n-html` / `data-i18n-attr` dans [index.html](../index.html).
3. `npm run typecheck` (clé manquante) et `npm test` ([i18n.test.ts](../tests/i18n.test.ts)).

Détails : [i18n.md](i18n.md).

### Je change le serveur

1. **Nouveau fichier** dans `supabase/migrations/`, nommé `AAAAMMJJHHMMSS_description.sql`, postérieur à tous les autres. Ne jamais modifier une migration déjà appliquée.
2. Pour une fonction modifiée : `create or replace function` (même signature), ou `drop` puis `create` si la signature change.
3. Nouvelle table : `enable row level security` et aucun accès direct (`revoke all ... from anon, authenticated`).
4. Nouvelle fonction appelable par l'app : `security definer`, `set search_path = public`, identifier l'appelant par `me()`, puis `revoke execute ... from public, anon;` et `grant execute ... to authenticated;`. Fonction interne : `revoke` sans `grant`. Voir [le piège des droits par défaut](online.md#modèle-de-sécurité).
5. Côté app : méthode dans `SocialBackend` ([backend.ts](../src/online/backend.ts)), implémentée dans [supabase.ts](../src/online/supabase.ts) **et** [demo.ts](../src/online/demo.ts), appelée via [social.ts](../src/online/social.ts). Nouveau code d'erreur affiché au joueur : l'ajouter à `MESSAGES` (et la clé `error.*` dans les traductions) ; refus définitif : l'ajouter à `PERMANENT`, sinon l'entrée restera dans la file.
6. Si une constante du barème change ([points.ts](../src/online/points.ts)), changer aussi le SQL correspondant (`join_league`, `submit_solve`, `claim_rewards`) et régénérer `level_points`.
7. Tests dans [online.test.ts](../tests/online.test.ts) (PGlite applique toutes les migrations dans l'ordre) ; `npm test`.
8. Appliquer sur le serveur : `npx supabase db push` (ou *SQL Editor*).

### Je change le HUD

- Balisage dans [index.html](../index.html) (avec `data-i18n`), style dans [style.css](../src/style.css), logique dans [hud.ts](../src/ui/hud.ts).
- Si la hauteur des barres change, vérifier `gameInsets`, `homeInsets`, `coachInset` et `winCardHeight` : le jardin est cadré dans l'espace qu'elles laissent (`Game.relayout()`).
- Une nouvelle carte qu'on doit pouvoir fermer d'un toucher extérieur ou avec le bouton retour : l'ajouter à la liste `closable` de `Hud`.

## Pièges connus

### Génération et données

- **Tout changement de génération change les niveaux existants**, y compris un simple réordonnancement des appels à `rng` dans `levelInfo` (le flux `jardin-n:params` est partagé par tous les tirages) et toute retouche de `SET_HEX` (la suite des niveaux hexagonaux est calculée en chaîne : un niveau changé peut décaler tous les suivants). Toujours : `GENERATOR_VERSION` + nouvelle migration de points.
- **Les migrations appliquées ne sont jamais modifiées** : le serveur ne rejoue pas un fichier déjà passé. D'où un nouveau fichier `*_level_points.sql` à chaque changement (le script le nomme lui-même avec la date et l'heure).
- **Droits par défaut sur les nouveaux objets SQL** : le `revoke` global du premier fichier ne couvre pas les fonctions et tables créées plus tard. Voir [online.md](online.md#modèle-de-sécurité).
- **Constantes dupliquées** entre [points.ts](../src/online/points.ts) et le SQL (taille de ligue 20, 3 points du défi, cadeaux, table des points). Au-delà du niveau 5 000, le serveur compte 4 points si `n % 5 = 0`, sinon 1 : il ignore le bonus hexagonal (+1) et celui des grands jardins (+1), alors que l'app les compte (l'app n'affiche que ce que renvoie le serveur, donc pas d'incohérence visible).
- **Ajouter un style** décale le style du défi du jour (`% THEMES.length`) et le style tiré en mode « Aléatoire » pour chaque niveau.
- **Tests qui figent les premiers niveaux** : niveaux 4 et 8 hexagonaux, 1 à 9 sinon carrés ([hex.test.ts](../tests/hex.test.ts)) ; tailles 3×3, 3×4, 4×4 des niveaux 1 à 3 et 25 parcelles au niveau 13 ([core.test.ts](../tests/core.test.ts)) ; points des niveaux 1 à 10 ([online.test.ts](../tests/online.test.ts)).
- **Format de sauvegarde** : un champ ajouté à `SaveData` prend sa valeur par défaut (fusion avec `DEFAULTS`), mais un champ renommé ou dont le type change n'est pas migré. Il n'y a pas de numéro de version du format en dehors du `:v1` de la clé `jardin-des-sources:v1`.
- **`?reset`** n'efface que la sauvegarde : la session Supabase (`gardendoku:auth`), la file d'envoi et le mode démo restent.
- **Mode démo collant** : une fois `?ligue=demo` ouvert, le drapeau est gardé dans `localStorage` et l'emporte sur un vrai serveur configuré, jusqu'à `?ligue=off`. Les clés `gardendoku:social-demo` (drapeau) et `gardendoku:demo-social` (état) se ressemblent beaucoup.
- **Défi du jour et fuseaux** : la clé du jour est la date locale de l'appareil ; le serveur raisonne en heure de Paris et accepte un jour d'écart de chaque côté.

### Rendu

- **Palette partagée** : `P` ([palette.ts](../src/render/palette.ts)) est un objet global mutable, et `PAL` ([materials.ts](../src/render3d/materials.ts)) est **un seul jeu d'uniforms pour tous les matériaux 3D**. Tout rendu dans un autre style (`withTheme`, aperçus) change les couleurs de la scène en cours : il faut appeler `updatePalette()` après (comme `Garden3D.stylePreview`). Un shader qui aurait besoin de couleurs propres à un style différent du style courant ne peut pas passer par `PAL`.
- **Géométries partagées** : `canalModel`, `bodyModel`, `outlineBand` (caches de [models.ts](../src/render3d/models.ts)), `PRIM`, la géométrie `RIPPLE` et les `GEO` du [kit](../src/render3d/props/kit.ts) sont partagés : ne jamais les passer à `keep()` ni les disposer. `keep()` est réservé à ce que `build()` crée pour le jardin en cours.
- **Aperçus à régénérer** : les images de [public/previews/](../public/previews/) **remplacent** le rendu en direct dès qu'elles existent. Après un changement de modèles, de palette ou de look 3D, le menu montre l'ancien rendu tant qu'on n'a pas relancé `await __game.savePreviews()`.
- **`/__save` n'existe qu'en dev** (plugin `saveFiles` de [vite.config.ts](../vite.config.ts), `apply: 'serve'`) : `savePreviews()` ne fonctionne qu'avec `npm run dev`. Il n'écrit que dans `public/previews/` et `assets/`.
- **Détails invisibles en 3D** : un détail `screen` ou `animated` sans modèle 3D n'est pas dessiné (`buildTile` les saute). Le test des modèles affiche le nombre de détails sans modèle : il doit rester à 0.
- **Ponts « face écran »** (`screen: true`) : jamais tirés sur les hexagones (ils ne connaissent que les canaux verticaux et horizontaux).
- **Animations des détails** : les mouvements des modèles (`spin`, `swing`, `hover`) sont dans les attributs de sommets ; les ombres les suivent parce que `partsDepthMaterial` applique le même patch. Un nouveau matériau pour les pièces doit faire de même.
- **Deux canevas** : en 3D, le rendu WebGL se fait dans un canevas caché, recopié chaque frame dans le canevas 2D ; ce qui est dessiné en 2D (particules, projecteur, anneau d'appui long) passe toujours par-dessus la 3D.
- **Rendu 2D** : il reste le repli sans WebGL ; vérifier `?rendu=2d` après un changement de [renderer.ts](../src/render/renderer.ts), [tileArt.ts](../src/render/tileArt.ts) ou des thèmes.

### Divers

- La vidéo récompensée ([ads.ts](../src/ui/ads.ts)) est **factice** et récompense toujours.
- Le choix de la parcelle d'un indice utilise `Math.random` (hors du moteur, sans incidence sur les niveaux).
- `vite.config.ts` contient un nom d'hôte ngrok dans `server.allowedHosts`.
- `sharp` (utilisé par [make-icon.mjs](../scripts/make-icon.mjs)) n'est qu'une dépendance indirecte (via `@capacitor/assets`).
- Commentaires du code qui ne correspondent plus au code (au moment de la rédaction) :
  - en-tête de [levels.ts](../src/core/levels.ts) : « Every fifth level is a hard one » (c'est tous les 10 niveaux jusqu'au 50, puis tous les 5) et « About one normal level in five is hexagonal » (répété sur `isHexLevel`), alors que `HEX_CHANCE` vise un sur quatre ;
  - `PartsBuilder.add` ([models.ts](../src/render3d/models.ts)) documente les genres de pousse 0, 1, 2, mais le genre 3 existe (`Kit.bloom`, détails `when: 'bloom'`) ;
  - [backend.ts](../src/online/backend.ts) dit que les codes d'erreur sont « turned into French by social.ts » : ils sont traduits dans la langue courante ;
  - commentaires doublés : au-dessus de `THEMES` ([themes/index.ts](../src/render/themes/index.ts)) et de `SAMPLE` ([preview.ts](../src/render/preview.ts)).

## Glossaire FR / EN

| Français (jeu, README) | Anglais (code) | Sens |
| --- | --- | --- |
| parcelle | tile, cell | Une case du jardin. `cell` = index dans la grille (`y * width + x`). |
| jardin | garden, board, puzzle | Un niveau. `Puzzle` = jardin généré ; `Board` = état jouable. |
| canal | canal, arm, groove | Le chemin de l'eau sur une parcelle ; un « bras » (`arm`) par côté ouvert. `groove` = la rigole creusée. |
| masque | mask | Bits des côtés ouverts d'une parcelle (N=1, E=2, S=4, W=8 ; 6 bits sur les hexagones). |
| source | spring, source | La parcelle centrale d'où part l'eau (`Puzzle.source`). |
| mare, bassin | pond, basin | Le rond d'eau de la source ; le bout d'un cul-de-sac, où éclot le lotus. |
| cul-de-sac | dead end, leaf | Parcelle à un seul côté ouvert. |
| arrosée | watered | Reliée à la source (`Analysis.watered`). |
| boucle | loop | Cycle du réseau, interdit (`loopSides`). |
| verrou, cadenas | lock, padlock | Parcelle bloquée par le joueur (`Board.locked`). |
| mode Verrou | lock mode | Bouton qui transforme un toucher en verrouillage. |
| peindre les verrous | paint (locks) | Glisser après un appui long pour verrouiller plusieurs parcelles. |
| appui long | long press, hold | 420 ms. |
| indice | hint | Remet une parcelle dans le bon sens et la verrouille. |
| indice de zone, zone | zone hint, zone | Remet un carré 3×3 (ou une parcelle et ses 6 voisines). |
| bords reliés, niveau difficile | joined edges, wrap, hard level | Les bords opposés communiquent (tore). |
| bande fantôme, copie | ghost strip, ghost | Copie pâle des parcelles du bord opposé. |
| passerelle, rigole | bridge, channel | Petit canal de pierre entre deux parcelles reliées (3D) ; à ne pas confondre avec les ponts décoratifs (`plank-bridge`…). |
| jardin hexagonal | hex garden | Parcelles à 6 côtés. |
| alvéole, rayon de miel, couronne | hexagon, comb, crown | Formes des jardins hexagonaux. |
| parterre, étangs, cloître, rond-point, losange, croisée, cœur, trèfle, sablier | rect, ponds, cloister, circle, diamond, plus, heart, flower, hourglass | Formes des jardins carrés (`ShapeId`). |
| raisonnement par hypothèse, déductions avancées | trial, hypothesis, advanced, deep cells | Profondeur 1 du solveur ; `deepCells` = parcelles qui l'exigent. |
| sinuosité | windiness | Réglage du générateur : canaux longs ou réseau touffu. |
| défi du jour | daily challenge, daily | Jardin commun du jour (`dayKey`). |
| série d'arrosage | watering streak, streak | Jours d'affilée avec au moins un jardin fini. |
| style | theme, style | Ambiance graphique (`Theme`, `ThemeId`). |
| détail | prop | Objet décoratif d'un style (`PropDef`, `PropInstance`). |
| touffe, galet, tache d'herbe | tuft, pebble, blob | Petites pièces du décor (`Decor`). |
| floraison | bloom | Pousse de l'herbe et des fleurs après l'eau (0..1). |
| socle, plateau | bed, plinth, tray | Support sous le jardin (plateau lilas des bords reliés). |
| tour de victoire | showcase | Caméra basse et jardin qui tourne après la victoire. |
| aperçu | preview | Image d'un style dans le menu. |
| ligue, amis, code ami | league, friends, friend code | En ligne. |
| pseudo | name | Nom du joueur (3 à 16 caractères). |
| points de la semaine | week points | Score de ligue. |
| cadeau | prize, reward | Indices et zones gagnés (série ou ligue). |
| file d'envoi | queue | Jardins résolus en attente d'envoi au serveur. |
