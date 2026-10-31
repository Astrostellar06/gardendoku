# Documentation technique de Gardendoku

Cette documentation s'adresse à qui doit **lancer, comprendre, modifier, tester, construire et publier** le jeu sans relire tout le code. Elle complète le [README principal](../README.md), qui décrit le jeu côté joueur (règles, styles, défis, ligues) : ici, on explique **comment c'est fait** et **comment le changer**.

Tout ce qui est écrit ici vient du code de la branche `style-3d` (rendu three.js). Les noms de fichiers, fonctions et constantes sont donnés tels quels, en anglais, comme dans le code.

## Par où commencer

1. [architecture.md](architecture.md) : la carte du code, la boucle principale et le trajet d'un toucher jusqu'à l'écran. **À lire en premier.**
2. [build-and-release.md](build-and-release.md) : installer, lancer, tester, construire l'APK.
3. [maintenance.md](maintenance.md) : listes de contrôle pour les changements courants, pièges connus, glossaire FR/EN.

Ensuite, selon le sujet :

| Document | Contenu |
| --- | --- |
| [architecture.md](architecture.md) | Dossiers et modules, flux de données (`Game` ↔ `Board` ↔ moteur de rendu ↔ HUD ↔ sauvegarde ↔ en ligne), boucle de [main.ts](../src/main.ts), les deux moteurs de rendu, état et sauvegarde ([storage.ts](../src/ui/storage.ts), `GENERATOR_VERSION`) |
| [levels.md](levels.md) | Progression des niveaux ([levels.ts](../src/core/levels.ts)) : tailles, bandes, niveaux difficiles, tirage des hexagones, formes imposées, seeds ; générateur, solveur, unicité ; défi du jour ; modèle de temps et rang « plus rapide que X % » |
| [rendering-3d.md](rendering-3d.md) | Le rendu three.js : géométrie des parcelles, shaders, kit des détails low poly, caméra, zoom, tour de victoire, copies des bords reliés, passerelles instanciées, aperçus des styles, performances |
| [rendering-2d-and-styles.md](rendering-2d-and-styles.md) | Rendu Canvas 2D (repli et base du rendu 3D), palette, thèmes, décor des parcelles ; ajouter un style de bout en bout |
| [ui-and-input.md](ui-and-input.md) | HUD (DOM), gestes (tap, appui long, peinture des verrous, pincement, molette, rotation du jardin), tutoriels, titre de l'accueil, série, indices, paramètres |
| [i18n.md](i18n.md) | Système de traduction, ajouter une clé, ajouter une langue, tests |
| [online.md](online.md) | Supabase : tables, fonctions, sécurité, ligues, amis, table des points, file hors ligne, mode démo, variables d'environnement, tests PGlite |
| [build-and-release.md](build-and-release.md) | Scripts npm, tests (contenu de chaque fichier), Capacitor, APK Android sous Windows, iOS, icônes, versions, liste de contrôle de sortie |
| [maintenance.md](maintenance.md) | « Je change la génération », « j'ajoute un détail », « je change le look 3D », « j'ajoute une clé », « je change le serveur » ; pièges ; glossaire |

## En deux phrases

Le niveau `n` n'est jamais stocké : il est **reconstruit** à partir de la seed `jardin-n` par le moteur pur de [src/core/](../src/core/) (aucune dépendance au DOM, testé avec Vitest). Le contrôleur [Game](../src/game.ts) relie ce moteur à un moteur de rendu ([GardenRenderer](../src/render/renderer.ts) en 2D, ou sa sous-classe [Garden3D](../src/render3d/garden3d.ts) en three.js), au HUD en DOM, aux sons, à la sauvegarde `localStorage` et, s'il est configuré, au serveur Supabase des ligues.

## Conventions de cette documentation

- Les chemins sont relatifs à la racine du dépôt ; les liens pointent vers les fichiers.
- « Parcelle » = *tile* / *cell* dans le code. Voir le [glossaire](maintenance.md#glossaire-fr--en).
- Ce qui relève du joueur (tableaux des styles, des défis, des formes) reste dans le [README principal](../README.md) et n'est pas recopié.
