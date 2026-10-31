# Rendu 3D (three.js)

Sur la branche `style-3d`, le jardin est dessiné en 3D par [Garden3D](../src/render3d/garden3d.ts), sous-classe du rendu 2D [GardenRenderer](../src/render/renderer.ts). Ce que voit le joueur est décrit dans le README, section [Rendu 3D](../README.md#rendu-3d-branche-style-3d). Ce qu'elle hérite et remplace de la classe de base est résumé dans [architecture.md](architecture.md#les-deux-moteurs-de-rendu).

Fichiers :

| Fichier | Rôle |
| --- | --- |
| [garden3d.ts](../src/render3d/garden3d.ts) | Scène, caméra, cadrage, zoom, déplacement, tour de victoire, construction des parcelles, copies fantômes, passerelles, saisie au doigt, aperçus en direct. |
| [models.ts](../src/render3d/models.ts) | Géométrie : dimensions `M`, contours, canal creusé (polygon-clipping), socle, bandes de contour, `PartsBuilder`, primitives `PRIM`. |
| [materials.ts](../src/render3d/materials.ts) | Palette en uniforms partagés (`PAL`), uniforms par parcelle, shaders du gazon, de l'eau et des petites pièces. |
| [props/](../src/render3d/props/) | Modèles low poly des détails de chaque style ; [kit.ts](../src/render3d/props/kit.ts) (API `Kit`), [common.ts](../src/render3d/props/common.ts) (modèles partagés), un fichier par style, [index.ts](../src/render3d/props/index.ts) (`STYLE_MODELS`). |
| [sprites.ts](../src/render3d/sprites.ts) | Repli « découpe de papier » d'un détail sans modèle, à partir de son dessin 2D ; texture du badge de cadenas. |
| [stylePictures.ts](../src/render3d/stylePictures.ts) | Aperçus du menu des styles : images de [public/previews/](../public/previews/), ou rendu en direct. |

## Repère et dimensions

- Unité : une parcelle. Une cellule va de -0,5 à 0,5 ; **y vers le haut**.
- Le repère 2D d'une parcelle (x à droite, y vers le bas de l'écran) est posé au sol : x reste x, **y devient z** (vers la caméra).
- Monde : `x = x_grille − mid[0]`, `z = y_grille − mid[1]` ; le jardin est centré sur l'origine (`measure()`). Les hexagones utilisent `grid.center(i)`.
- Les constantes de forme sont dans `M` ([models.ts](../src/render3d/models.ts)) :

| Constante | Valeur | Sens |
| --- | --- | --- |
| `M.half` | 0,45 | Centre → milieu d'un côté de la face (il reste un jour `M.gap = 0.1` entre deux faces). |
| `M.body` | 0,24 | Bloc de terre, de `-body` à 0. |
| `M.turf` | 0,085 | Couche de gazon, de 0 à `turf` ; le canal la traverse. |
| `M.groove` | 0,25 | Largeur du canal. |
| `M.pond`, `M.basin` | 0,29, 0,17 | Rayon de la mare de la source, du bassin d'un cul-de-sac. |
| `M.waterY` | 0,05 | Hauteur de la surface de l'eau. |
| `M.corner`, `M.hexCorner`, `M.bevel` | | Arrondis. |

## Géométrie d'une parcelle ([models.ts](../src/render3d/models.ts))

- `faceOutline(sides)` : carré arrondi ou hexagone à sommet plat arrondi (`roundedPolygon`).
- `canalAreas(mask, sides, isSource)` : avec **polygon-clipping**, union des bras (`armRect` de largeur `M.groove` vers chaque côté ouvert) et du moyeu (mare, bassin ou simple rond), puis `turf = face − canal`, `water = face ∩ canal`. Les points sont arrondis sur une grille de 1/4096 (`ring()`), car la bibliothèque trébuche sur des coordonnées presque égales.
- `canalModel(mask, sides, isSource)` : `turf` extrudé de 0 à `M.turf` (bords arrondis), `water` en surface plate à `M.waterY`. **Mis en cache** par `sides:mask:source` : toutes les parcelles de même forme partagent la géométrie. Ne pas la disposer.
- `bodyModel(sides)` : le bloc de terre, en cache par nombre de côtés ; groupe 0 (dessus/dessous) et groupe 1 (flancs), d'où les deux matériaux `[groove, side]`.
- `bedModel(centers, sides, pad)` : socle sous tout le jardin, union des cellules agrandies (repli sur des socles superposés si l'union échoue) ; `trayModel` : plateau rectangulaire arrondi des jardins à bords reliés (bandes fantômes comprises).
- `outlineBand(sides, inset, width, dashes)` : bande plate qui suit le contour (anneaux de boucle, de verrou, et anneau pointillé du mode Verrou), en cache.
- `toShapes` inverse y, car les formes sont couchées par une rotation de -90° autour de x qui envoie y vers -z.

Un test ([render3d.test.ts](../tests/render3d.test.ts)) vérifie, pour les 120 premiers niveaux, que chaque parcelle a du gazon et de l'eau et que le socle se construit.

### Construction de la scène (`build()`)

Appelée par `setBoard`, `refreshTheme` et `gallery`. Elle vide la scène (`clear()` dispose tout ce qui a été passé à `keep()`), met la palette à jour, règle la lumière hémisphérique sur les couleurs du style, pose le socle (ou le plateau lilas + liseré pointillé `addEdgeDashes` pour les bords reliés), puis pour chaque cellule `buildTile(i)` :

```
holder (Group)          position : home + saut, appui, secousse ; échelle (cellScale)
├─ spin (Group)         rotation.y = -angle animé × pas
│  ├─ body (bloc de terre, 2 matériaux)
│  ├─ turf (gazon creusé, turfMaterial)
│  ├─ water (eau du canal, waterMaterial)
│  ├─ parts (un seul maillage : herbe, fleurs, galets, lotus/pierres de la source, détails modélisés)
│  ├─ spring : dôme + 3 rides (source seulement)
│  └─ découpes de papier (détails sans modèle)
├─ loopRing, lockRing, modeRing (bandes de contour, ne tournent pas)
└─ badge (sprite du cadenas)
```

Enfin `buildGhosts()` (bords reliés) et `buildBridgeKit()`.

Chaque frame, `sync()` recopie l'état animé de la classe de base (`this.vis`) dans ces objets : position et échelle du `holder`, rotation du `spin`, uniforms de la parcelle (`uBloom`, `uWater`, `uFill`, `uLoop`, `uIn`), échelle des découpes de papier, rides de la source, opacité des anneaux, badge. Puis `syncBridges()`.

## Matériaux et shaders ([materials.ts](../src/render3d/materials.ts))

### Palette partagée

`PAL` contient les couleurs du style en uniforms (`uSoil`, `uSoilDark`, `uGrass`, `uGrassDark`, `uGrassLight`, `uWater`, `uWaterDeep`, `uWaterLight`, `uLoopColor`) et le temps `uTime`. **Un seul objet pour tous les matériaux** : `updatePalette()` le recopie depuis `P` (la palette 2D courante). Conséquence : rendre un aperçu dans un autre style (`withTheme`) change les couleurs du jardin en cours ; `stylePreview` rappelle donc `updatePalette()` après chaque aperçu. Voir les [pièges](maintenance.md#pièges-connus).

### Uniforms par parcelle (`TileUniforms`)

`uBloom`, `uWater`, `uFill` (remplissage 0..1), `uIn` (côté d'entrée de l'eau dans le repère de la parcelle, `z = 1` s'il y en a un), `uLoop`, `uSeed`, `uBlob[6]` + `uSpan[6]` (taches d'herbe : x, y, rayon, délai), `uMask` (masque du canal), `uDirs[6]` (vecteurs des côtés). Ils sont partagés par tous les matériaux de la parcelle **et par sa copie fantôme**.

### Gazon (`turfMaterial`)

`MeshStandardMaterial` patché par `onBeforeCompile` : la couleur passe de la terre (`uSoil`/`uSoilDark`, bruitée) à l'herbe dans des taches circulaires qui grandissent avec `uBloom` (une tache par `decor.blobs`, la première centrée de rayon 0,8 ; chacune démarre à son délai `w` et grandit sur `uSpan`). Le dessus du gazon est éclairci (`uGrassLight`). Clé de programme : `'g3-turf'`.

### Eau (`waterMaterial`)

`ShaderMaterial` dessiné sur la surface du canal :

- `s` = distance parcourue par l'eau pour atteindre le fragment : depuis le bras d'entrée (`uIn`), puis vers les autres bras ; sans entrée (source), depuis le centre ;
- `discard` si `s ≥ uFill` : l'eau avance réellement dans le canal ;
- couleur plus profonde au milieu (`lat` = écart à l'axe du bras le plus proche), deux reflets qui dérivent vers l'aval (`flow = s × 6 − uTime × 1.3`), front d'eau clair et mousseux tant que `uFill < 1`, teinte de boucle (`uLoop`) ;
- gère les plans de coupe (copies fantômes).

### Petites pièces (`partsMaterial`, `partsDepthMaterial`)

Un seul maillage par parcelle, couleurs par sommet, construit par `PartsBuilder`. Le vertex shader (`GROW` + `GROW_VERTEX`) lit des attributs par sommet :

| Attribut | Contenu |
| --- | --- |
| `aAnchor` (vec3) | Point d'où la pièce pousse (mise à l'échelle autour de lui). |
| `aGrow` (vec2) | `x` = délai, `y` = genre de pousse (tableau ci-dessous). |
| `aMove0` (vec4) | Pivot (xyz) et vitesse de rotation continue `w` (rad/s). |
| `aMove1` (vec4) | Axe de rotation (xyz) et amplitude du flottement `w` (bob). |
| `aMove2` (vec2) | Amplitude du balancement (rad) et pulsation (`freq × 2π`). |

| `aGrow.y` | Pousse | Utilisé pour |
| --- | --- | --- |
| 0 | Avec `uBloom` (rebond `g3Back`) + ondulation au vent | Brins d'herbe, fleurs |
| 1 | Toujours là | Galets, pierres de la source, détails `when: 'always'` |
| 2 | Quand l'eau arrive (`uWater > 0,5`) puis avec la floraison | Lotus, détails posés sur l'eau |
| 3 | Avec `uBloom`, sans ondulation | Détails `when: 'bloom'`, parties ajoutées par `Kit.bloom` |

Le mouvement (`g3Angle`, `g3Turn`) est appliqué avant la pousse, et aussi aux normales. Le matériau de profondeur (`partsDepthMaterial`, `customDepthMaterial` du maillage) applique le même patch : les ombres poussent et bougent avec les plantes.

## Les détails modélisés ([props/](../src/render3d/props/))

### Comment un détail est placé

Le décor d'une parcelle (`decor.props`, tiré par [decor.ts](../src/render/decor.ts), voir [rendering-2d-and-styles.md](rendering-2d-and-styles.md#le-décor-dune-parcelle-decorts)) est le même en 2D et en 3D. Dans `buildParts(i)`, pour chaque détail qui a un modèle (`STYLE_MODELS[themeId][def.id]`) :

- unité `unit = p.r × MODEL_SCALE` (`ground: 1.2`, `upright: 1.6`) ;
- ancrage : sur le gazon (`M.turf`), ou à la surface de l'eau pour `place: 'water'` ;
- orientation : un détail au sol fait à peu près face à la caméra (`(v2 − 0.5) × 1.2` rad) ; un détail de canal ou d'eau suit son bras (`-p.angle`) ;
- genre de pousse : `when: 'always'` → 1, sur l'eau → 2, sinon → 3 ;
- un détail `animated` en 2D (sauf ceux de `STANDING` : moulin, fontaines, geyser) flotte : sur l'eau, `swing` de 0,3 rad (lacet) + `hover(0.12)` ; ailleurs `hover(0.35)` ;
- le modèle est appelé avec `ModelInfo` : `v`, `v2` (aléas stables, les mêmes qu'en 2D), `canalHalf` (demi-largeur du canal en unités du détail), `waterY` (hauteur de l'eau sous le sol, négative).

Un détail **sans** modèle est affiché en découpe de papier ([sprites.ts](../src/render3d/sprites.ts)) : `uprightArt` (sprite debout) pour un détail `ground` + `upright`, `flatArt` (plan couché) sinon. Attention : un détail `screen` ou `animated` sans modèle n'est **pas affiché du tout** en 3D (`buildTile` les saute). Aujourd'hui tous les détails ont un modèle : le test [props3d.test.ts](../tests/props3d.test.ts) affiche « 0 props without a 3D model ».

### Repère d'un modèle ([kit.ts](../src/render3d/props/kit.ts))

En unités du rayon d'emprise du détail :

- y monte depuis le sol (le gazon, ou la surface de l'eau pour un détail sur l'eau) ;
- z pointe vers la caméra (bas de l'écran), x vers la droite ;
- détail de canal : x traverse le canal, z suit le canal vers l'extérieur ;
- un détail au sol reste à peu près dans un rayon de 1 ; un détail debout peut monter vers 2,5 (arbres), la plupart restent sous 1,8.

### L'API `Kit`

Un `Model` est une fonction `(k: Kit, info: ModelInfo) => void`. Chaque forme est ajoutée au `PartsBuilder` de la parcelle (donc fusionnée dans son maillage unique).

| Méthode | Forme |
| --- | --- |
| `box(paint, pos, [w, h, d], o)` | Boîte posée sur `pos`. |
| `ball(paint, pos, [rx, ry, rz], o)` | Ellipsoïde centré (`o.sides` 0 = icosaèdre brut, 1 = plus rond). |
| `dome(paint, pos, radii, o)` | Demi-sphère posée. |
| `rock(paint, pos, radii, o)` | Dodécaèdre (rocher). |
| `cyl(paint, pos, r, h, { sides, top, rz })` | Cylindre posé ; `top` < 1 l'effile. |
| `cone(paint, pos, r, h, o)` | Cône posé. |
| `ring(paint, pos, r, thick, o)` | Tore couché. |
| `stick(paint, a, b, w, sides)` | Bâton de `a` à `b`. |
| `at(pos, turn, scale, fn)` | Sous-repère déplacé, tourné autour de y, mis à l'échelle (tête d'un animal…). |
| `bloom(delay, fn)` | Parties qui n'apparaissent qu'arrosées (fruits sur un arbre toujours là) : genre 3, poussant depuis leur propre position. |
| `spin(pivot, axis, speed, fn)` | Rotation continue (ailes de moulin). |
| `swing(pivot, axis, amount, freq, fn)` | Balancement (ailes d'abeille, ballons). |
| `hover(amount, fn)` | Flottement vertical (nageurs, insectes). |

`paint` est une couleur CSS ou un dégradé `[bas, haut]`. `o.rot` est une rotation d'Euler XYZ en radians. `eyes(k, x, y, z, gap, size)` ajoute deux yeux. Les mouvements sont **calculés par la carte graphique** (attributs `aMove*`), sans appel de dessin en plus.

Exemple (ailes de moulin, [champs.ts](../src/render3d/props/champs.ts)) :

```ts
const hub: [number, number, number] = [0, 1.42, 0.38];
k.spin(hub, [0, 0, 1], -1.4 - v * 0.6, () => {
  // les 4 ailes, dessinées autour du moyeu
});
```

### Ajouter ou modifier un modèle

1. Le détail existe déjà en 2D dans `src/render/themes/<style>.ts` (son `id`, `place`, `size`, `upright`, `when`, `animated`).
2. Dans [src/render3d/props/&lt;style&gt;.ts](../src/render3d/props/), ajouter une entrée `'<id>'(k, { v, v2 }) { ... }` à la `ModelMap` du style (ou réutiliser une fabrique de [common.ts](../src/render3d/props/common.ts) : `rock3d`, `mushroom3d`, `snail3d`, `lilyPads3d`, `bridge3d`, `steppingStones3d`, `tree3d`, `pine3d`, `quadruped`).
3. Reprendre les couleurs du dessin 2D ; utiliser `v`/`v2` pour les variantes comme le fait le dessin 2D.
4. Regarder le résultat : en dev, dans la console, `__game.renderer.gallery()` pose un détail du style courant sur chaque parcelle, arrosé et fleuri (`gallery(12)` commence au 13e détail).
5. `npm test` : [props3d.test.ts](../tests/props3d.test.ts) construit chaque modèle pour trois valeurs de `v` et vérifie qu'il produit des formes, **moins de 2 500 triangles**, des coordonnées finies, une hauteur < 4 et une demi-largeur < 3,5 unités.
6. Refaire les aperçus du menu si le style y montre ce détail (voir plus bas).

## Caméra, cadrage, zoom, déplacement

- `PerspectiveCamera` de champ `FOV = 30°`, élévation `ELEVATION = 58°`, azimut 0 en jeu.
- `fit(bounds)` : recherche par dichotomie (40 itérations) de la distance de caméra la plus courte pour laquelle la boîte du jardin (socle compris, de `-M.body − 0.16` à 0,3 en hauteur) tient dans l'espace libre entre les barres du HUD (`insets`) et pour laquelle une parcelle ne dépasse pas `maxTile` pixels ; puis décalage de vue (`setViewOffset`) pour centrer ce qui est réellement vu (la perspective grossit l'avant).
- `layout()` cadre deux fois : le jardin (`base`) et un jardin 3×3 fictif ; `maxZoom = tuile du 3×3 / tuile du jardin` (au moins 1). Le zoom survit à un recadrage (HUD qui change, écran qui tourne), mais un nouveau jardin repart cadré.
- `zoomAt(x, y, factor)` : zoom de caméra (`camera.zoom`) entre 1 et `maxZoom` (× 1,6 pendant le tour de victoire), en gardant le point (x, y) immobile ; `panBy` déplace la vue ; `clampPan` arrête le déplacement quand un bord du jardin atteint le bord de l'espace libre.
- `canDrag(lockMode)` : vrai pendant le tour de victoire, ou si zoomé hors mode Verrou. C'est ce qui fait qu'un doigt qui glisse déplace la vue au lieu d'annuler le toucher (voir [ui-and-input.md](ui-and-input.md#gestes-uiinputts)).
- Saisie : `cellAt(x, y)` lance un rayon depuis la caméra jusqu'au plan `y = M.turf`, puis retrouve la cellule (la plus proche à 0,58 près sur les hexagones ; sur les bords reliés, un toucher dans une bande fantôme renvoie la vraie parcelle de l'autre côté).
- Ombres : soleil directionnel en `(-0.45, 1, -0.5)` (ombres vers le bas à droite comme en 2D), `PCFSoftShadowMap`, carte de 2048 px (1024 pour les aperçus) ; la caméra d'ombre couvre `max(largeur, hauteur) × 0.75 + 1`.

### Tour de victoire

1. `Game.tick` : une fois l'eau partout, `startShowcase()` après 0,5 s (zoom et déplacement remis à zéro).
2. `applyView()` : sur `SHOW_TRANSITION = 1.8` s, l'élévation descend de 58° à `SHOW_ELEVATION = 30°` et la caméra recule pour que le jardin (rayon × 1,05) tienne dans la zone libre ; l'azimut tourne à `SHOW_SPEED = 0.32` rad/s.
3. Quand la carte de victoire s'ouvre, `Game` appelle `setShowcaseSpace({ top, bottom: hauteur de la carte + 12 })` : le jardin glisse au-dessus de la carte (`update` interpole la zone). « Admirer le jardin » appelle `setShowcaseSpace(null)` : retour au centre.
4. Glisser un doigt : `drag(dx)` tourne de `-dx × 0.009` rad, avec élan (`vel`) ; relâché, la vitesse revient vers la rotation automatique. Zoomé, le jardin ne tourne plus seul.

## Bords reliés : copies fantômes

`buildGhosts()` crée quatre bandes (`Strip`) de largeur `GHOST = 0.42` autour du jardin : à gauche les copies de la dernière colonne, à droite celles de la première, en haut la dernière ligne, en bas la première. Chaque copie :

- réutilise les géométries et **les uniforms** de la parcelle d'origine (même eau, même herbe) ; ses pièces réutilisent la géométrie `parts` (repérée par l'attribut `aGrow`) ;
- est coupée par 4 plans de coupe (`clippingPlanes`, `renderer.localClippingEnabled = true`) au rectangle de la bande ;
- est noyée dans une brume vers l'extérieur par `misty()` (patch de shader, clé de programme suffixée `-ghost`) ;
- suit sa parcelle à chaque frame (`sync()` : position + décalage, échelle, rotation).

Le projecteur du tutoriel des bords reliés sait cibler la copie du bas (`spotlight.ghost`).

## Passerelles instanciées

Les petites rigoles de pierre entre deux parcelles reliées sont dessinées par **4 `InstancedMesh`** (`buildBridgeKit`) : fonds, murets (2 par passerelle), eau, eau de boucle. Capacité : `cellules × côtés` (murets ×2). `syncBridges()` les replace à chaque frame : pour chaque côté partagé relié (`analysis.linked`) entre deux parcelles au repos, une passerelle orientée dans le sens de l'eau (`inflow`), mouillée si l'eau y passe, teintée si le côté est dans une boucle. Sur un bord relié, une demi-passerelle part de chaque parcelle vers sa bande. L'eau des passerelles utilise `waterMaterial` avec des uniforms fixes (`uFill = 1`, entrée en -x).

## Aperçus des styles ([stylePictures.ts](../src/render3d/stylePictures.ts))

- Le menu des styles appelle `stylePicture(id, size, dpr)` : il peint d'abord le ciel du style, charge `previews/<id>.webp` (dans [public/previews/](../public/previews/)), et, **seulement si l'image manque**, rend l'aperçu en direct avec `Garden3D.stylePreview`.
- `Garden3D.stylePreview` : un seul `Garden3D` statique (`still = true` : pas de particules, carte d'ombre 1024) rend, un aperçu toutes les 16 ms (file `queue` / `pump`), un jardin 2×2 (`stage()` : source, deux parcelles arrosées, une parcelle sèche tournée) dans le style demandé (`withTheme`), puis rend la palette au style courant (`updatePalette()`).
- **Régénérer les images** quand les modèles, la palette ou le look 3D changent : lancer `npm run dev`, ouvrir le jeu, puis dans la console `await __game.savePreviews()`. Chaque aperçu est rendu en 168 px × 2 = 336 px (`PICTURE`), encodé en WebP qualité 0,9, et envoyé en `POST /__save?path=public/previews/<id>.webp` au serveur de dev, qui l'écrit dans le projet (plugin `saveFiles` de [vite.config.ts](../vite.config.ts), actif seulement en `serve`, chemins limités à `public/previews/` et `assets/`). La fonction renvoie la liste des styles enregistrés. Effacer une image fait revenir le rendu en direct pour ce style.

## Performances

- Le canevas WebGL est un canevas **hors document** ; chaque frame, son image est copiée dans le canevas 2D (`drawImage`). Le ciel, les particules, l'anneau d'appui long et le projecteur du tutoriel restent en 2D par-dessus.
- Par parcelle : bloc (2 groupes de matériaux), gazon, eau, un seul maillage de pièces (herbe, fleurs, galets, détails), plus sa passe d'ombre. Les anneaux et le badge sont invisibles la plupart du temps. Les passerelles sont 4 appels instanciés pour tout le jardin.
- Les géométries de canal, de bloc et de bandes de contour sont partagées (caches de [models.ts](../src/render3d/models.ts)) ; les programmes de shader sont partagés grâce à `customProgramCacheKey` (`g3-turf`, `g3-parts`, `g3-parts-depth`).
- Tout ce qui est animé (pousse, eau, ailes, flottement) l'est dans les shaders par uniforms (`uTime`, `uBloom`, `uWater`, `uFill`) : aucune géométrie n'est reconstruite pendant le jeu. La scène n'est reconstruite (`build()`) qu'à un nouveau jardin, un changement de style ou un appel à `gallery()`.
- Ratio de pixels WebGL plafonné à 2 (le canevas 2D à 2,5). La boucle de [main.ts](../src/main.ts) descend à ~30 images/s quand rien ne bouge ; le tour de victoire la garde à plein régime.
- La construction (`buildParts`) fusionne les pièces sur le processeur ; c'est le coût principal d'un changement de jardin sur les grands niveaux.
