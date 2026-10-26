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

### Repartir de zéro (simuler un premier lancement)

Ajouter `?reset` à l'adresse, par exemple `http://localhost:5173/?reset` : la sauvegarde (progression, réglages, tutoriel vu) est effacée et le jeu redémarre comme au tout premier lancement, tutoriel compris. Le tutoriel peut aussi être relancé depuis l'aide (« Revoir le tutoriel »).

### Débloquer tous les styles (tests)

Ajouter `?debloquer` à l'adresse débloque tous les styles et met 99 indices. Le paramètre se combine avec `?niveau=N`.

En mode dev, la console du navigateur expose aussi `__game` : `__game.debugSolve(5)` résout tout sauf 5 parcelles (pratique pour voir la victoire).

## Commandes de jeu

| Action | Geste |
| --- | --- |
| Tourner une parcelle | Tap |
| Verrouiller / déverrouiller | Appui long, ou bouton **Verrou** puis tap (clic droit sur ordinateur) |
| Verrouiller plusieurs parcelles | Après l'appui long (ou en mode Verrou), glisser le doigt : chaque parcelle touchée prend l'état de la première |
| Indice | Bouton **Indice** : remet une parcelle dans le bon sens et la verrouille |
| Recommencer | Bouton **Recommencer**, à toucher deux fois |
| Aide | Bouton **?** en jeu |
| Changer de style | Bouton **Styles** sur l'écran d'accueil (dont « Aléatoire ») |

## Tutoriel

Au premier lancement, un mini-jardin 3×3 explique le jeu en 5 étapes. Un projecteur met en valeur la parcelle à tourner, puis la parcelle à verrouiller (appui long). On peut le passer, et le revoir depuis l'aide.

## Formes de jardin

| Forme | Nom affiché |
| --- | --- |
| Rectangle | Parterre |
| Rectangle avec quelques trous | Étangs |
| Cadre évidé au centre (cour vide), source sur la galerie intérieure | Cloître |
| Cercle | Rond-point |
| Losange | Losange |
| Croix | Croisée |
| Cœur (en escalier, 5×5, 7×6 ou 9×8) | Cœur |
| Trèfle à quatre lobes | Trèfle |
| Sablier | Sablier |
| Carré ou rectangle aux bords reliés (niveaux difficiles) | Bords reliés |

Le cœur est dessiné case par case comme en pixel art : ses bords descendent d'une case par ligne jusqu'à une pointe d'une seule case. Le cercle et le trèfle ne s'allongent que de 2 lignes au plus en hauteur.

## Difficulté : déductions avancées

Le solveur connaît deux niveaux de raisonnement :

1. **Déductions directes** : accord entre voisins, pas de canal vers le bord, interdiction des boucles, un groupe de parcelles qui n'a plus qu'une sortie doit la prendre, deux groupes ne doivent pas s'enfermer l'un l'autre.
2. **Raisonnement par hypothèse** : « si cette parcelle était orientée ainsi, on aboutirait à une contradiction ». Par exemple, un cul-de-sac, une ligne droite puis un autre cul-de-sac formeraient un système fermé. Ou deux culs-de-sac voisins se retrouveraient face à face. L'orientation fautive est éliminée.

Jusqu'au niveau 20, chaque jardin se résout par déductions directes. À partir du niveau 21, le générateur retouche le jardin jusqu'à ce qu'une partie des parcelles (de 6 % à 12 %, croissant jusqu'au niveau 80) exige le raisonnement par hypothèse. La solution reste toujours unique, vérifiée par force brute dans les tests. Les niveaux difficiles à bords reliés en exigent eux aussi à partir du niveau 50.

## Niveaux difficiles : bords reliés

Un niveau sur 5 (5, 10, 15…) est un niveau difficile : une grille carrée ou rectangulaire (de 5×5 à 8×10) dont les bords opposés sont reliés. L'eau qui sort d'un côté réapparaît du côté opposé. Pour que ça reste lisible :

- le jardin est posé sur un **plateau lilas**, avec un **liseré en pointillés** sur les bords qui mènent de l'autre côté ;
- des **bandes fantômes** autour du jardin montrent en transparence le bord des parcelles opposées : le canal qui arrive de l'autre côté est visible juste à côté du bord (toucher une parcelle fantôme fait tourner la vraie) ;
- quand deux parcelles sont reliées à travers un bord, le **canal se prolonge** jusque dans la bande fantôme, et l'eau qui passe fait une petite **étincelle** des deux côtés ;
- une **carte d'explication** s'affiche la première fois, et le bandeau du niveau passe en lilas avec la mention « ★ Difficile ».

## Rang, défis et indices

### « Plus rapide que X % des joueurs »

Le calcul se fait sans serveur, dans `src/core/timing.ts` :

- **Temps médian estimé** d'un niveau : `0,8 × parcelles^1,3` secondes, plus 7 s par parcelle qui exige un raisonnement par hypothèse, le tout × 1,45 pour les bords reliés (au moins 20 s).
- **Répartition des temps des joueurs** : une loi log-normale (courbe en cloche sur le logarithme du temps, écart-type 0,55). Le rang affiché est la part des joueurs théoriquement plus lents.
- **Indices** : chaque indice utilisé ajoute 25 s au temps pris en compte.

Exemple : sur un 5×5, le temps médian estimé est de 52 s. En 25 s, on est plus rapide que 91 % des joueurs ; en 2 min, que 6 %.

### Styles à débloquer

Seul le printemps est disponible au départ ; chaque autre style se débloque par un défi (`src/progress.ts`). Dans le menu, les styles verrouillés sont grisés, avec un cadenas, le défi et la progression ; un toucher rappelle le défi. Un déblocage est définitif et s'annonce sur la carte de victoire.

| Style | Défi |
| --- | --- |
| Japon | Atteindre le niveau 8 |
| Automne | Finir un jardin d'au moins 40 parcelles sans verrou ni indice |
| Hiver | Réussir 3 niveaux difficiles |
| Savane | Atteindre le niveau 25 |
| Désert | Finir un niveau plus vite que 80 % des joueurs |
| Jungle | Réussir 10 niveaux difficiles |
| Sauvage | Finir un niveau plus vite que 95 % des joueurs |

Le choix **Aléatoire** donne à chaque niveau un style tiré parmi ceux débloqués. Le tirage est stable : rejouer un niveau redonne le même style.

### Indices

On commence avec 5 indices ; le compteur est affiché sur le bouton. À 0, une fenêtre propose de regarder une vidéo pour en gagner 3. **Pour l'instant, la vidéo est un exemple factice** (`src/ui/ads.ts`, 3 secondes) : il faudra y brancher une vraie régie publicitaire (par exemple AdMob via Capacitor).

## Styles de jardin

Huit styles, choisis depuis l'écran d'accueil (bouton **Styles**, avec un aperçu dessiné de chacun) :

| Style | Ambiance et détails |
| --- | --- |
| Printemps | Le style d'origine : tulipes, coccinelles, escargots, nichoirs, arrosoirs, canetons, abeilles |
| Japon | Gravier ratissé, mousse, ponts rouges arqués, lanternes de pierre (allumées quand l'eau arrive), pagodes, torii, pas japonais, bambous, pins bonsaï, cerisiers, carpes koï |
| Automne | Herbe dorée, feuilles mortes, glands, citrouilles, hérissons, écureuils, pommes, arbres roux |
| Hiver | Tuiles enneigées, bonshommes de neige, sapins (illuminés quand l'eau arrive), cadeaux, sucres d'orge, houx, pingouins, luges |
| Savane | Terre craquelée, acacias, baobabs, termitières, girafes, éléphants, suricates, hippopotames dans l'eau |
| Désert | Sable ondulé, oasis verte, saguaros (qui fleurissent), cactus tonneaux, palmiers, jarres, chameaux, lézards |
| Jungle | Monsteras, fougères, hibiscus, bambous, toucans, statues tiki, bananiers, grenouilles, tortues |
| Sauvage | Roseaux et massettes, fleurs des champs, bûches moussues, grenouilles sur nénuphar, canards, libellules |

Chaque style a sa palette, son paysage de fond, ses particules d'ambiance (sakura, feuilles, neige, pollen, sable, lucioles, aigrettes) et son catalogue de détails. Environ 80 % des parcelles reçoivent un ou deux détails tirés au hasard (de façon déterministe : un même niveau garde les mêmes détails). Certains sont là dès le départ (lanternes, rochers…), d'autres apparaissent quand l'eau arrive (animaux, fleurs). Les éléments debout restent droits quelle que soit la rotation de la tuile.

Ajouter un style = un fichier dans `src/render/themes/` (palette, décor de fond, liste de détails), à déclarer dans `themes/index.ts`.

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
    timing.ts      Temps médian estimé d'un niveau et rang du joueur
  render/          Rendu Canvas 2D
    tileArt.ts     Dessin procédural d'une parcelle (sol, canal, eau, herbe, fleurs, lotus, détails)
    decor.ts       Décor de chaque parcelle, déterministe (placé hors des canaux)
    themes/        Les 8 styles (palette, paysage, détails), kit de dessin partagé
    preview.ts     Aperçu d'un style pour le menu
    renderer.ts    Animations (ressort de rotation, eau qui avance, floraison), cache des parcelles
    particles.ts   Pétales, étincelles, papillons
    background.ts  Ciel pastel, nuages, collines
  audio/sound.ts   Sons synthétisés en WebAudio (aucun fichier audio)
  ui/              HUD (DOM), saisie tactile, sauvegarde localStorage
  tutorial.ts      Mini-jardin et étapes du tutoriel
  progress.ts      Défis qui débloquent les styles
  game.ts          Contrôleur qui relie le tout
```

## Génération des niveaux

Aucun niveau n'est stocké : le niveau `n` est entièrement reconstruit à partir de la seed `jardin-n`.

1. **Paramètres** (`levels.ts`) : une seed dérivée choisit la taille (5×5 au départ, jusqu'à 9 colonnes × 12 à 15 lignes), la forme (à partir du niveau 9), et le caractère « sinueux » du réseau. La largeur est plafonnée à 9 colonnes pour garder des parcelles assez grandes sur un téléphone en portrait.
2. **Arbre couvrant** (`generator.ts`) : un algorithme *growing tree* part de la source et relie toutes les parcelles sans cycle (au plus 3 sorties par parcelle, 4 pour la source).
3. **Unicité** : le solveur (`solver.ts`) ne fait que des déductions sûres (accord entre voisins, interdiction des boucles, un groupe isolé doit prendre sa seule sortie, deux groupes ne doivent pas s'enfermer mutuellement). S'il reste des parcelles ambiguës, l'arbre est localement « recâblé » autour d'elles, puis on recommence. Sur les 400 premiers niveaux, 100 % ont une solution unique trouvable par pure logique, en moins de 2 ms chacun.
4. **Mélange** : chaque parcelle reçoit une rotation aléatoire.

La victoire ne compare pas avec la solution d'origine : elle est déclarée dès que toutes les parcelles sont reliées à la source et qu'il n'y a aucune boucle (les boucles sont détectées en cherchant les arêtes qui ne sont pas des ponts, avec l'algorithme de Tarjan).

> Modifier l'algorithme de génération (ou les tableaux de `levels.ts`) change les niveaux existants. Il faudra donc le figer avant une sortie publique. En attendant, `GENERATOR_VERSION` (dans `levels.ts`) est enregistré avec la partie en cours : une partie sauvegardée avec une autre version n'est pas restaurée.

## Pistes pour la suite

- **Application native** : empaqueter avec [Capacitor](https://capacitorjs.com/) (iOS / Android), ajouter un service worker pour jouer hors ligne, et des icônes PNG.
- Zoom par pincement pour les très grandes grilles.
- Variantes exotiques : tuiles hexagonales.
- Musique d'ambiance, réglage des vibrations, statistiques et défi quotidien (seed = date du jour).
