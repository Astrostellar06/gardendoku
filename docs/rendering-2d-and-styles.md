# Rendu 2D, palette et styles

Le rendu Canvas 2D ([render/](../src/render/)) a deux rôles sur la branche `style-3d` :

1. **classe de base** du rendu 3D : toutes les animations, le fond, les particules et le décor des parcelles viennent d'ici (voir [architecture.md](architecture.md#les-deux-moteurs-de-rendu)) ;
2. **repli** quand WebGL manque, et comparaison avec `?rendu=2d` dans l'adresse. La version 2D d'origine vit aussi sur la branche `v1`.

La liste des 18 styles, leur ambiance et leurs défis de déblocage sont dans le README : [Styles de jardin](../README.md#styles-de-jardin), [Styles à débloquer](../README.md#styles-à-débloquer).

## Fichiers

| Fichier | Rôle |
| --- | --- |
| [renderer.ts](../src/render/renderer.ts) | `GardenRenderer` : état animé par parcelle, mise en page, dessin, cache d'images par parcelle. |
| [tileArt.ts](../src/render/tileArt.ts) | Dessin procédural d'une parcelle : `drawTile` (sol, canal, herbe, fleurs, lotus), `drawTileWater`, `drawTileProps` (premier plan statique), `drawTileCritters` (détails animés), chemins (`facePath`, `hexPath`, `roundRectPath`), `TILE_OVERFLOW`. |
| [decor.ts](../src/render/decor.ts) | `makeDecor` : décor déterministe d'une parcelle ; dimensions `G` de la parcelle 2D. |
| [palette.ts](../src/render/palette.ts) | Interface `Palette`, `SPRING` (palette d'origine), `P` (palette courante, mutable), `applyPalette`, `grassFrom`, `mixColor`. |
| [themes/](../src/render/themes/) | Un fichier par style, plus [types.ts](../src/render/themes/types.ts), [index.ts](../src/render/themes/index.ts) (registre), [kit.ts](../src/render/themes/kit.ts) (primitives de dessin), [common.ts](../src/render/themes/common.ts) (détails partagés : rochers, champignons, ponts, nénuphars, escargots, arbres, pins, bancs), [scenery.ts](../src/render/themes/scenery.ts) (éléments de paysage). |
| [background.ts](../src/render/background.ts) | `renderBackground` : dégradé du ciel, taches de lumière (`bokeh`), paysage du style ; rendu une fois par redimensionnement ou changement de style. |
| [particles.ts](../src/render/particles.ts) | Particules d'ambiance (`AmbientKind` : pétales, sakura, feuilles, neige, pollen, sable, lucioles, aigrettes, cœurs) et effets (`burst`, `sparkle`, `butterfly`). |
| [preview.ts](../src/render/preview.ts) | Aperçus 2D du menu des styles (`renderThemePreview`) et aperçu « Aléatoire » (`renderRandomPreview`, quatre styles débloqués et un dé). |
| [easing.ts](../src/render/easing.ts) | `clamp01`, `easeOutBack`… |

## Palette ([palette.ts](../src/render/palette.ts))

- `P` est **un seul objet mutable** : `setTheme(id)` ([themes/index.ts](../src/render/themes/index.ts)) y recopie la palette du style (`applyPalette`). Toutes les fonctions de dessin lisent `P` au moment de dessiner ; le rendu 3D le recopie dans ses uniforms (`updatePalette`).
- `withTheme(id, fn)` exécute `fn` avec un autre style actif puis restaure le précédent (aperçus).
- Une palette de style part de `SPRING` et remplace ce qui change : `{ ...SPRING, bgTop: ..., ...grassFrom(h, s, l) }`.
- `grassFrom(teinte, saturation, clarté)` dérive les six verts (`grass`, `grassLight`, `grassDark`, `grassDeep`, `grassSide`, `grassSideDark`) avec les mêmes rapports que le printemps.
- Champs principaux : ciel (`bgTop`, `bgMid`, `bgBottom`, `bokeh`), socle (`bed`, `bedShadow`, `tileShadow`), bords reliés (`hardBed`, `hardEdge`, `hardMist`), terre (`soil*`), galets, herbe (`grass*`), canal (`rim`, `rimShade`, `groove`, `grooveDeep`), eau (`water`, `waterDeep`, `waterLight`), `loop`, fleurs (`petals`, `centers`, `lotus`, `lily`, `lilyDark`), verrous (`lockRing`, `lockBadge`, `lockIcon`), `ink`.
- `Game.applyStyleColors(id)` reporte aussi quelques couleurs dans le DOM : fond de la page, `meta[name="theme-color"]`, et les variables CSS `--logo-*` utilisées par le titre de l'accueil.

## Un style ([themes/types.ts](../src/render/themes/types.ts))

```ts
interface Theme {
  id: ThemeId;               // 'printemps', 'japon'... (union fermée dans types.ts)
  palette: Palette;
  ambient: AmbientKind;      // particules d'ambiance
  ambientColors: string[];
  creature: 'butterfly' | 'none'; // papillons à la victoire
  props: PropDef[];          // catalogue de détails
  propChance: number;        // chance d'un 1er détail sur une parcelle
  extraChance: number;       // puis d'un 2e
  dryGround?, bloomGround?, smallFlower?, tuft?, basin?; // remplacements optionnels du dessin
  scenery(ctx, w, h): void;  // paysage du fond
}
```

Le nom et la description affichés ne sont pas dans le thème : ce sont les clés `theme.<id>.name` et `theme.<id>.blurb` des traductions.

### Un détail (`PropDef`)

| Champ | Sens |
| --- | --- |
| `id` | Identifiant, aussi clé du modèle 3D dans `STYLE_MODELS[style]`. |
| `place` | `ground` (sol libre autour des canaux), `canal` (en travers d'un bras : ponts ; x traverse, +y va vers l'extérieur), `water` (dans l'eau du canal, même repère). |
| `size` | Plage du rayon d'emprise (unités de parcelle), avant mise à l'échelle par `decor.ts`. |
| `weight` | Poids du tirage. |
| `when` | `always` (là sur une parcelle sèche) ou `bloom` (apparaît avec l'eau). |
| `upright` | Dessiné debout, face à l'écran (arbres, animaux, bâtiments). |
| `animated` | Dessiné à chaque frame en superposition (au lieu de l'image en cache). |
| `screen` | Détail de canal dessiné dans le repère de l'écran (ponts en 2,5D) ; il reçoit `axis: 'v' \| 'h'`. Ces détails ne sont pas tirés sur les hexagones. |
| `drawScale` | Agrandissement d'un détail debout (1,5 par défaut). |
| `draw(ctx, p)` | Dessin autour de (0, 0), « haut » = -y ; `p` donne `r`, `bloom`, `water`, `time`, `v`, `v2`, `axis`. |

## Le décor d'une parcelle ([decor.ts](../src/render/decor.ts))

`makeDecor(mask, seed, isSource, minProps, sides)` produit le `Decor` d'une parcelle, **dans son propre repère** (il tourne avec elle et évite les canaux) :

- `props` : détails du style. Nombre : 0, 1 ou 2 selon `propChance` puis `extraChance` (au moins `minProps`, utilisé par les aperçus). Un détail au sol est placé à l'un des endroits les plus dégagés (40 essais) ; un détail de canal ou d'eau sur un bras (jamais dans la mare de la source, au plus un par parcelle). Mise à l'échelle : `ground × 1.75`, `canal × 1.25`, `water × 1.2`, `upright × 1.2`.
- `blobs` (taches d'herbe), `flowers`, `tufts` (touffes), `pebbles` (galets) ; `ground` (aléas pour les textures), `bloomColor`, `bloomPetals`, `padAngle` (lotus), `tint`.
- Seeds : `seed` est `${decorSeed}:${i}` (le rendu passe `info.seed`, par exemple `jardin-12`) ; les détails utilisent en plus le style : `` `${seed}:${theme.id}` ``. Un même niveau garde donc les mêmes détails dans un même style ; changer le catalogue d'un style (ordre, poids, ajout) change les détails de tous ses jardins (purement visuel, aucune incidence sur la sauvegarde).

Le décor est recalculé par `setBoard` et par `refreshTheme` (changement de style).

## Le rendu 2D en bref ([renderer.ts](../src/render/renderer.ts))

- `layout()` : taille de parcelle = place libre entre les `insets` du HUD (avec la marge des bandes fantômes `GHOST = 0.42` sur les bords reliés), plafonnée à `maxTile` (96 px). Puis socle (`renderBed`) et sprites d'ombre et de reflet.
- `draw()` : fond, socle, bandes fantômes (bords reliés), ombres, parcelles (`drawCell`), passerelles (`drawBridges`), premier plan (`drawCellProps`), superpositions (`drawCellOverlay` : cadenas, anneaux), projecteur, particules. Les hexagones sont dessinés d'arrière en avant (`order`).
- Cache : chaque parcelle garde jusqu'à 4 images (`dry`, `wet`, `dryFg`, `wetFg`), redessinées si sa rotation change ; une parcelle en train de se remplir ou de fleurir est dessinée en direct.

## Ajouter un style, de bout en bout

1. **Identifiant** : ajouter l'id à l'union `ThemeId` de [types.ts](../src/render/themes/types.ts).
2. **Style 2D** : créer `src/render/themes/<id>.ts` qui exporte un `Theme` : palette (`{ ...SPRING, ..., ...grassFrom(h, s, l) }`), `ambient` et ses couleurs, `creature`, `props` (en réutilisant au besoin [common.ts](../src/render/themes/common.ts) et les primitives de [kit.ts](../src/render/themes/kit.ts)), `propChance`/`extraChance`, `scenery` (avec [scenery.ts](../src/render/themes/scenery.ts)). S'inspirer de [printemps.ts](../src/render/themes/printemps.ts).
3. **Registre** : l'importer et l'ajouter à `THEMES` dans [themes/index.ts](../src/render/themes/index.ts). L'ordre de `THEMES` est l'ordre du menu. **Attention** : ajouter un style change le style tiré pour chaque défi du jour (`hashString(...) % THEMES.length`) et pour chaque niveau en mode « Aléatoire » (pool des styles débloqués).
4. **Modèles 3D** : créer `src/render3d/props/<id>.ts` (une `ModelMap` avec un modèle par `PropDef.id`) et l'ajouter à `STYLE_MODELS` dans [props/index.ts](../src/render3d/props/index.ts). Voir [rendering-3d.md](rendering-3d.md#ajouter-ou-modifier-un-modèle). Un détail sans modèle s'affiche en découpe de papier, sauf `screen`/`animated` qui disparaissent en 3D.
5. **Défi de déblocage** : ajouter une entrée à `STYLE_CHALLENGES` dans [progress.ts](../src/progress.ts), avec une des fabriques existantes (`reachLevel`, `hardLevels`, `fasterThan`, `noHelp`, `counted`, `bigGarden`) ou un `Challenge` sur mesure (`text()` traduit, `state(save)` → `{ done, progress }`). Si le défi a besoin d'un nouveau chiffre, l'ajouter à `Stats` dans [storage.ts](../src/ui/storage.ts) (avec sa valeur dans `DEFAULTS`) et le tenir à jour dans `Game.recordWin` ou ailleurs. Sans entrée, le style n'est jamais débloqué (seul `printemps` est gratuit, `isUnlocked`).
6. **Traductions** : ajouter `theme.<id>.name` et `theme.<id>.blurb` dans [fr.ts](../src/i18n/fr.ts) **et** les 8 autres langues, plus les éventuelles clés `challenge.*` nouvelles. Voir [i18n.md](i18n.md).
7. **Aperçu** : `npm run dev`, puis `await __game.savePreviews()` dans la console pour écrire `public/previews/<id>.webp` (voir [rendering-3d.md](rendering-3d.md#aperçus-des-styles-stylepicturests)).
8. **Tests** : `npm test`. Vérifient le nouveau style : [themes.test.ts](../tests/themes.test.ts) (équilibre `save()`/`restore()` de chaque détail et de parcelles entières, carrées et hexagonales), [props3d.test.ts](../tests/props3d.test.ts) (modèles 3D), [i18n.test.ts](../tests/i18n.test.ts) (nom et description dans toutes les langues), [progress.test.ts](../tests/progress.test.ts) (« un défi pour chaque style sauf le gratuit »).
9. **README** : ajouter le style aux tableaux des styles et des défis.
