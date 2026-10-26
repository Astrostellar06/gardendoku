# Jardin des Sources

Jeu de puzzle mobile zen inspiré de *Pipe Puzzle / Net* : on fait pivoter les parcelles d'un jardin pour relier tous les canaux à la source centrale, sans former de boucle. Quand une parcelle reçoit l'eau, l'herbe pousse, les fleurs s'ouvrent et un lotus éclot au bout de chaque canal.

## Lancer le jeu

```bash
npm install
npm run dev      # serveur de dev (accessible sur le réseau local pour tester sur téléphone)
npm test         # tests du moteur (génération, solveur, boucles, victoire)
npm run build    # build de production dans dist/
```

Sur téléphone : lancer `npm run dev`, puis ouvrir l'adresse « Network » affichée, depuis le même Wi-Fi.

### Tester un niveau précis

Ajouter `?niveau=N` à l'adresse, par exemple `http://localhost:5173/?niveau=60`. Le jeu s'ouvre directement sur ce niveau, et tous les niveaux jusqu'à N deviennent accessibles dans l'écran **Niveaux**.

En mode dev, la console du navigateur expose aussi `__game` : `__game.debugSolve(5)` résout tout sauf 5 parcelles (pratique pour voir la victoire).

## Commandes de jeu

| Action | Geste |
| --- | --- |
| Tourner une parcelle | Tap |
| Verrouiller / déverrouiller | Appui long, ou bouton **Verrou** puis tap (clic droit sur ordinateur) |
| Indice | Bouton **Indice** : remet une parcelle dans le bon sens et la verrouille |
| Recommencer | Bouton **Recommencer**, à toucher deux fois |

## Organisation du code

```
src/
  core/            Moteur, sans dépendance au DOM (testé avec Vitest)
    rng.ts         Générateur pseudo-aléatoire à seed (sfc32)
    grid.ts        Grille, directions en masque de bits (N=1, E=2, S=4, W=8), rotations
    shapes.ts      Formes de jardin : rectangle, cercle, cœur, trèfle, losange, croix, sablier, étangs…
    generator.ts   Génération d'un niveau à partir d'une seed
    solver.ts      Solveur logique (preuve d'unicité de la solution)
    board.ts       État de jeu : rotations, verrous, eau, boucles, victoire
    levels.ts      Progression infinie : niveau n → taille, forme, seed
  render/          Rendu Canvas 2D
    tileArt.ts     Dessin procédural d'une parcelle (sol, canal, eau, herbe, fleurs, lotus)
    decor.ts       Décor de chaque parcelle, déterministe (placé hors des canaux)
    renderer.ts    Animations (ressort de rotation, eau qui avance, floraison), cache des parcelles
    particles.ts   Pétales, étincelles, papillons
    background.ts  Ciel pastel, nuages, collines
  audio/sound.ts   Sons synthétisés en WebAudio (aucun fichier audio)
  ui/              HUD (DOM), saisie tactile, sauvegarde localStorage
  game.ts          Contrôleur qui relie le tout
```

## Génération des niveaux

Aucun niveau n'est stocké : le niveau `n` est entièrement reconstruit à partir de la seed `jardin-n`.

1. **Paramètres** (`levels.ts`) : une seed dérivée choisit la taille (5×5 au départ, jusqu'à 9 colonnes × 12 à 15 lignes), la forme (à partir du niveau 9), et le caractère « sinueux » du réseau. La largeur est plafonnée à 9 colonnes pour garder des parcelles assez grandes sur un téléphone en portrait.
2. **Arbre couvrant** (`generator.ts`) : un algorithme *growing tree* part de la source et relie toutes les parcelles sans cycle (au plus 3 sorties par parcelle, 4 pour la source).
3. **Unicité** : le solveur (`solver.ts`) ne fait que des déductions sûres (accord entre voisins, interdiction des boucles, un groupe isolé doit prendre sa seule sortie, deux groupes ne doivent pas s'enfermer mutuellement). S'il reste des parcelles ambiguës, l'arbre est localement « recâblé » autour d'elles, puis on recommence. Sur les 400 premiers niveaux, 100 % ont une solution unique trouvable par pure logique, en moins de 2 ms chacun.
4. **Mélange** : chaque parcelle reçoit une rotation aléatoire.

La victoire ne compare pas avec la solution d'origine : elle est déclarée dès que toutes les parcelles sont reliées à la source et qu'il n'y a aucune boucle (les boucles sont détectées en cherchant les arêtes qui ne sont pas des ponts, avec l'algorithme de Tarjan).

> Modifier l'algorithme de génération (ou les tableaux de `levels.ts`) change les niveaux existants. Il faudra donc le figer avant une sortie publique.

## Pistes pour la suite

- **Application native** : empaqueter avec [Capacitor](https://capacitorjs.com/) (iOS / Android), ajouter un service worker pour jouer hors ligne, et des icônes PNG.
- Zoom par pincement pour les très grandes grilles.
- Variantes exotiques : grilles toriques (les bords se rejoignent), tuiles hexagonales.
- Musique d'ambiance, réglage des vibrations, statistiques et défi quotidien (seed = date du jour).
