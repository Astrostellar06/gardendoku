# Gardendoku

Jeu de puzzle mobile zen inspiré de *Pipe Puzzle / Net* : on fait pivoter les parcelles d'un jardin pour relier tous les canaux à la source centrale, sans former de boucle. Quand une parcelle reçoit l'eau, l'herbe pousse, les fleurs s'ouvrent et un lotus éclot au bout de chaque canal.

Dépôt : [github.com/Astrostellar06/gardendoku](https://github.com/Astrostellar06/gardendoku)

Sur l'accueil, le « G » du titre est un petit jardin de 9 parcelles : à chaque retour sur l'accueil, une parcelle pivote, puis l'eau part de la source au centre, parcourt toute la lettre et fait éclore un lotus au bout. Ses couleurs suivent le style choisi.

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

Ajouter `?debloquer` à l'adresse débloque tous les styles et met 99 indices et 99 indices de zone. Le paramètre se combine avec `?niveau=N`.

En mode dev, la console du navigateur expose aussi `__game` : `__game.debugSolve(5)` résout tout sauf 5 parcelles (pratique pour voir la victoire).

## Applications iOS et Android

Le jeu est empaqueté avec [Capacitor](https://capacitorjs.com) : le build Vite (`dist/`) tourne dans la vue web du système, dans un vrai projet natif (`android/` pour Android Studio, `ios/` pour Xcode). Identifiant de l'app : `io.github.astrostellar06.gardendoku` (dans `capacitor.config.ts`, à fixer avant la première publication sur les stores).

```bash
npm run sync      # build web + copie dans les projets natifs (à refaire après chaque changement)
npm run android   # sync, puis ouvre le projet dans Android Studio (bouton Run pour un téléphone ou l'émulateur)
npm run ios       # sync, puis ouvre le projet dans Xcode (Mac uniquement)
npm run icons     # régénère icônes et écrans de lancement à partir de assets/*.png
```

APK de test sans Android Studio (Windows, avec le JDK fourni par Android Studio) :

```bash
cd android && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew assembleDebug
```

L'APK sort dans `android/app/build/outputs/apk/debug/app-debug.apk`, à installer avec `adb install -r` ou en le copiant sur le téléphone.

Ce que l'app fait en plus de la version web (`src/native.ts`) :

- **vibrations** par le moteur haptique natif (l'iPhone n'a pas de vibration dans sa vue web) ;
- **partage** du défi du jour par la feuille de partage du système (la vue web Android n'a pas `navigator.share`) ;
- **bouton retour Android** : ferme la carte ouverte, annule l'indice de zone, puis revient à l'accueil ; depuis l'accueil, l'app passe en arrière-plan ;
- **sauvegarde** dès que l'app passe en arrière-plan (elle peut être tuée sans autre préavis) ;
- écran bloqué en **portrait** sur téléphone, icônes de barre d'état foncées.

Les icônes viennent de `public/icon.svg`, déclinée dans `assets/` : icône pleine (iOS), avant-plan et fond (icône adaptative Android), écran de lancement.

## Paramètres et langues

Le bouton engrenage (accueil, et en haut à droite en jeu) ouvre les **paramètres** : sons, vibrations et langue.

Le jeu existe en **français**, **anglais**, **espagnol**, **allemand**, **néerlandais**, **italien** et **portugais** (`src/i18n/`) :
- `fr.ts` est la référence, les autres (`en.ts`, `es.ts`, `de.ts`, `nl.ts`, `it.ts`, `pt.ts`) doivent avoir exactement les mêmes clés, les mêmes `{variables}` et les mêmes balises (le typage et `tests/i18n.test.ts` le vérifient) ;
- dans `index.html`, les textes portent `data-i18n` (ou `data-i18n-attr` pour les étiquettes et textes indicatifs), dans le code ils passent par `t()` / `tn()` (pluriels) ;
- sans choix enregistré, la langue suit celle du téléphone (anglais si le jeu ne la parle pas). En changer recharge la page, la partie en cours est reprise ;
- `src/core` reste sans texte : les noms de formes et de styles sont traduits à l'affichage.

Ajouter une langue : un fichier `xx.ts` typé comme `en.ts`, puis l'ajouter au type `Lang` et au sélecteur des paramètres.

## Commandes de jeu

| Action | Geste |
| --- | --- |
| Tourner une parcelle | Tap |
| Verrouiller / déverrouiller | Appui long, ou bouton **Verrou** puis tap (clic droit sur ordinateur) |
| Verrouiller plusieurs parcelles | Après l'appui long (ou en mode Verrou), glisser le doigt : chaque parcelle touchée prend l'état de la première |
| Indice | Bouton **Indice** : remet une parcelle dans le bon sens et la verrouille |
| Indice de zone | Bouton **Zone**, puis toucher une parcelle : le carré de 3×3 autour (sur les hexagones : la parcelle et ses 6 voisines) se remet en place et se verrouille |
| Passer le niveau | Bouton **»** en haut, contre une courte vidéo (pas pendant le défi du jour) |
| Recommencer | Bouton **Recommencer**, à toucher deux fois |
| Aide | Bouton **?** en jeu |
| Changer de style | Bouton **Styles** sur l'écran d'accueil (dont « Aléatoire ») |

Une fois le jardin réussi, les cadenas s'effacent pour le laisser voir dégagé.

Chaque parcelle que l'eau atteint joue une note : plus la parcelle est loin de la source, plus la note monte dans la gamme pentatonique. Au-delà de trois octaves, les parcelles lointaines tournent sur les cinq notes les plus aiguës (comme les notes du verrouillage en glissant) au lieu de répéter la même.

## Tutoriel

Au premier lancement, un mini-jardin 3×3 explique le jeu en 5 étapes. Un projecteur met en valeur la parcelle à tourner, puis la parcelle à verrouiller (appui long). On peut le passer, et le revoir depuis l'aide.

Avant le premier niveau difficile (niveau 10), un second tutoriel en 4 étapes présente les bords reliés sur un jardin 3×3 dont les bords sont reliés : on tourne une parcelle que l'eau atteint en traversant le bord gauche, puis on en tourne une autre en touchant sa copie pâle sous le jardin. On peut le revoir depuis l'aide (« Revoir le tutoriel des bords reliés »).

Les deux tutoriels sont décrits comme une suite d'étapes dans `src/tutorial.ts` : lire puis appuyer sur le bouton, tourner une parcelle donnée, en verrouiller une, ou finir le jardin seul.

## Formes de jardin

| Forme | Nom affiché |
| --- | --- |
| Rectangle | Parterre |
| Rectangle avec quelques trous | Étangs |
| Cadre évidé au centre (cour vide), galerie de 3 parcelles d'épaisseur (2 pour un cloître de moins de 8 de large), source sur la galerie | Cloître |
| Cercle | Rond-point |
| Losange | Losange |
| Croix | Croisée |
| Cœur (en escalier, 5×5, 7×6 ou 9×8) | Cœur |
| Trèfle à quatre lobes | Trèfle |
| Sablier | Sablier |
| Carré ou rectangle aux bords reliés (niveaux difficiles) | Bords reliés |
| Grand hexagone (jardins hexagonaux) | Alvéole |
| Rectangle de parcelles hexagonales | Rayon de miel |
| Hexagone évidé au centre, source sur l'anneau | Couronne |

Le cœur est dessiné case par case comme en pixel art : ses bords descendent d'une case par ligne jusqu'à une pointe d'une seule case. Le cercle et le trèfle ne s'allongent que de 2 lignes au plus en hauteur.

## Difficulté : déductions avancées

Le solveur connaît deux niveaux de raisonnement :

1. **Déductions directes** : accord entre voisins, pas de canal vers le bord, interdiction des boucles, un groupe de parcelles qui n'a plus qu'une sortie doit la prendre, deux groupes ne doivent pas s'enfermer l'un l'autre.
2. **Raisonnement par hypothèse** : « si cette parcelle était orientée ainsi, on aboutirait à une contradiction ». Par exemple, un cul-de-sac, une ligne droite puis un autre cul-de-sac formeraient un système fermé. Ou deux culs-de-sac voisins se retrouveraient face à face. L'orientation fautive est éliminée.

Jusqu'au niveau 20, chaque jardin se résout par déductions directes. À partir du niveau 21, le générateur retouche le jardin jusqu'à ce qu'une partie des parcelles (de 6 % à 12 %, croissant jusqu'au niveau 80) exige le raisonnement par hypothèse. La solution reste toujours unique, vérifiée par force brute dans les tests. Les niveaux difficiles à bords reliés en exigent eux aussi à partir du niveau 50.

## Niveaux difficiles : bords reliés

Les niveaux difficiles reviennent tous les 10 niveaux jusqu'au niveau 50 (10, 20, 30, 40, 50), puis tous les 5 (55, 60…). Ce sont une grille carrée ou rectangulaire dont les bords opposés sont reliés. L'eau qui sort d'un côté réapparaît du côté opposé.

Le premier (niveau 10) ne fait que 4×4, juste après son tutoriel. Ensuite, la taille monte d'une ligne ou d'une colonne à la fois : 4×5, 5×5, 5×6, 6×6, 6×7, 7×7, 7×8, 8×8, 8×9, puis 8×10 à partir du niveau 145. Les premières marches arrivent vite, les suivantes de plus en plus lentement (`WRAP_LADDER` et `WRAP_RUNG_FROM` dans `levels.ts`). Une fois sur trois, à partir du 5×6, le jardin garde la taille de la marche précédente, pour varier sans jamais faire de saut.

Pour que ça reste lisible :

- le jardin est posé sur un **plateau lilas**, avec un **liseré en pointillés** sur les bords qui mènent de l'autre côté ;
- des **bandes fantômes** autour du jardin montrent en transparence le bord des parcelles opposées : le canal qui arrive de l'autre côté est visible juste à côté du bord (toucher une parcelle fantôme fait tourner la vraie) ;
- quand deux parcelles sont reliées à travers un bord, le **canal se prolonge** jusque dans la bande fantôme, et l'eau qui passe fait une petite **étincelle** des deux côtés ;
- un **tutoriel** précède le premier niveau difficile (la carte d'explication reste pour le défi du jour du samedi, si on n'a pas encore vu de bords reliés), et le bandeau du niveau passe en lilas, avec une étoile après le numéro (« Niveau 10 ★ »). Le bandeau n'indique que le nombre de parcelles, pour rester lisible à côté des boutons.

## Jardins hexagonaux

Environ un niveau normal sur cinq a des **parcelles hexagonales** : six côtés, donc six voisines possibles, et chaque toucher tourne la parcelle d'un sixième de tour. La règle ne change pas.

- Les neuf premiers niveaux sont fixés : deux jardins hexagonaux seulement, au niveau 4 (un petit de 12 parcelles) et au niveau 8. Ensuite, chaque niveau normal est tiré au sort, sauf s'il suit un niveau hexagonal (jamais deux à la suite) ou s'il a une forme imposée. Les niveaux difficiles ne sont jamais hexagonaux. La chance du tirage (24 %, `HEX_CHANCE` dans `levels.ts`) est un peu au-dessus de 1/5 pour compenser les niveaux écartés : au final, un niveau normal sur cinq est hexagonal. Les premiers tombent aux niveaux 4, 8, 16, 19, 25, 34, 37, 39, 49…
- Les hexagones ont le sommet plat et sont rangés en colonnes, les colonnes impaires décalées d'une demi-parcelle vers le bas. Les côtés se numérotent N, NE, SE, S, SO, NO (bits 1 à 32 du masque).
- D'un jardin hexagonal au suivant, les formes s'enchaînent dans un ordre fixe, sans jamais deux fois la même à la suite, et de plus en plus grandes : rayon de miel de 12 parcelles (le 1er, niveau 4), alvéole de 19 (niveau 8), rayon de miel de 25, couronne de 30, rayon de miel de 35, alvéole de 37, rayon de miel de 42, couronne de 54, rayon de miel de 49, alvéole de 61, rayon de miel de 56 (le 11e), puis un cycle des plus grandes.
- Ils n'ont jamais de bords reliés. Ils demandent des hypothèses plus tard que les autres (à partir du niveau 43) et moins souvent : leurs six voisines suffisent déjà à les rendre exigeants.
- Une **carte d'explication** s'affiche la première fois. Le bandeau du niveau passe en jaune miel avec un petit hexagone, et ces niveaux apparaissent en alvéoles aux coins adoucis dans la liste des niveaux (contour pointillé s'ils ont été passés).
- Les détails posés en travers d'un canal et dessinés « face écran » (ponts en 2,5D) ne connaissent que les canaux verticaux et horizontaux : ils ne sont pas utilisés sur les hexagones.

## Rang, défis et indices

### « Plus rapide que X % des joueurs »

Le calcul se fait sans serveur, dans `src/core/timing.ts` :

- **Temps médian estimé** d'un niveau : `0,8 × parcelles^1,3` secondes, plus 7 s par parcelle qui exige un raisonnement par hypothèse, le tout × 2,5 pour les bords reliés et × 1,4 pour les hexagones (au moins 20 s). Exemples : un niveau difficile de 5×6 sans déduction avancée est estimé à environ 2 min 45, une alvéole de 37 parcelles à 2 min.
- **Répartition des temps des joueurs** : une loi log-normale (courbe en cloche sur le logarithme du temps, écart-type 0,55). Le rang affiché est la part des joueurs théoriquement plus lents.
- **Indices** : chaque indice utilisé ajoute 25 s au temps pris en compte.

Exemple : sur un 5×5, le temps médian estimé est de 52 s. En 25 s, on est plus rapide que 91 % des joueurs ; en 2 min, que 6 %.

### Styles à débloquer

Seul le printemps est disponible au départ ; chaque autre style se débloque par un défi (`src/progress.ts`). Dans le menu, les styles verrouillés sont grisés, avec un cadenas, le défi et la progression ; un toucher rappelle le défi. Un déblocage est définitif et s'annonce sur la carte de victoire.

| Style | Défi |
| --- | --- |
| Japon | Atteindre le niveau 8 |
| Roseraie | Finir un jardin en forme de cœur |
| Jardin de l'amitié | Partager le résultat d'un défi du jour |
| Été | Réussir 3 défis du jour |
| Automne | Finir un jardin d'au moins 40 parcelles sans verrou ni indice |
| Hiver | Réussir 3 niveaux difficiles |
| Champs | Finir 5 niveaux d'affilée sans indice |
| Savane | Atteindre le niveau 25 |
| Désert | Finir un niveau plus vite que 80 % des joueurs |
| Jardin à la française | Finir un jardin d'au moins 80 parcelles sans indice |
| Jungle | Réussir 10 niveaux difficiles |
| Parc urbain | Finir un jardin d'au moins 100 parcelles |
| Montagne | Jardiner 7 jours de suite |
| Verger | Jardiner 14 jours de suite |
| Sauvage | Finir un niveau plus vite que 95 % des joueurs |
| Canyon | Réussir 20 niveaux difficiles |
| Grands parcs | Finir un jardin de chaque forme (les 9 formes) |

Le choix **Aléatoire** donne à chaque niveau un style tiré parmi ceux débloqués. Le tirage est stable : rejouer un niveau redonne le même style.

### Défi du jour

Le bouton **Défi du jour** de l'accueil ouvre un jardin commun à tous les joueurs pour la journée (`src/core/daily.ts`). Sa seed vient de la date (`jour-AAAA-MM-JJ`) et sa difficulté du jour de la semaine : doux le lundi, de plus en plus grand et riche en déductions avancées jusqu'au vendredi, bords reliés le samedi, grand jardin le dimanche. Le style du jour est tiré au sort parmi tous les styles, y compris ceux qui ne sont pas encore débloqués : c'est l'occasion de les essayer.

- La partie en cours est sauvegardée à part, sans toucher à la progression des niveaux.
- Une fois réussi, le bouton affiche le temps ; le toucher ouvre le résultat avec le compte à rebours jusqu'au prochain défi.
- Réussir le défi compte pour la **série d'arrosage** (voir plus bas).
- **Partager** envoie un texte court sans rien dévoiler du jardin : date, temps, rang, une barre de 1 à 5 fleurs, indices utilisés et série. Sur téléphone, c'est la feuille de partage du système ; ailleurs, le texte est copié dans le presse-papiers.

```
🌸 Gardendoku · défi du 26/10
⏱️ 1:42 · plus rapide que 73 % des joueurs
🌸🌸🌸🌸🌱
💧 Sans indice
🪴 Arrosé 4 jours de suite
```

### Série d'arrosage

Un jour compte dans la série dès qu'un jardin fleurit : un niveau ou le défi du jour (`src/streak.ts`). Ouvrir le jeu ne suffit pas : il faut finir un jardin, et un jour sans jardin fleuri remet la série à zéro.

- L'icône est un **arrosoir** (la goutte sert déjà aux indices). Sur l'accueil, un badge en haut à droite montre la série : il est pâle et sans gouttes tant que le jardin du jour n'a pas fleuri, et le toucher ouvre le détail.
- La série avance par semaines de 7 cases, avec un cadeau le **3ᵉ jour** (1 indice) et le **7ᵉ jour** (3 indices et 1 indice de zone), puis on recommence (jours 10, 14…). Les récompenses se règlent dans `WEEK_REWARDS`.
- Le premier jardin du jour affiche la semaine sur la carte de victoire, avec la récompense gagnée ou le nombre de jours avant la prochaine.
- La carte de la série affiche toujours la **meilleure série** atteinte (`streak.best` dans la sauvegarde).
- Deux styles se débloquent avec la série : **Montagne** à 7 jours, **Verger** à 14 jours (meilleure série).

### Indices

On commence avec 5 indices ; le compteur est affiché sur le bouton. À 0, une fenêtre propose de regarder une vidéo pour en gagner 3. **Pour l'instant, la vidéo est un exemple factice** (`src/ui/ads.ts`, 3 secondes) : il faudra y brancher une vraie régie publicitaire (par exemple AdMob via Capacitor).

**Indice de zone** : un bonus plus rare. On en a 3 au départ, puis on en gagne avec la série d'arrosage. Toucher **Zone** l'arme (le bouton passe en lilas), puis toucher une parcelle remet en place et verrouille le carré de 3×3 autour, y compris par-dessus les bords reliés. Sur les hexagones, c'est la parcelle et ses 6 voisines. Une zone déjà juste ne consomme rien. Pour le rang, un indice de zone compte comme 3 indices ; les défis « sans indice » le comptent comme une aide.

**Passer un niveau** : le bouton **»** de la barre du haut propose de regarder une vidéo (la même régie factice) pour passer au niveau suivant. Le niveau passé reste jouable : il apparaît en pointillés dans la liste des niveaux, jusqu'à ce qu'il soit réussi. Passer un niveau ne compte ni pour la série ni pour les défis de styles, sauf « Atteindre le niveau N ».

## Ligues et amis (en ligne)

Le badge à la coupe, en haut à gauche de l'accueil, ouvre la **ligue de la semaine**. Il affiche le rang du joueur une fois qu'il en a un.

- **Ligue de 20** : on la rejoint avec son premier jardin de la semaine (du lundi 0 h au dimanche minuit, heure de Paris). On entre dans la plus ancienne ligue qui a encore de la place, ou dans une nouvelle.
- **Points** (`src/online/points.ts`) :
  - niveau normal : +1 ;
  - jardin hexagonal : +2 ;
  - bords reliés : +4 ;
  - jardin de 100 parcelles ou plus : +1 de plus ;
  - défi du jour : +3.

  Chaque niveau ne compte qu'une fois, et un niveau passé avec une vidéo ne rapporte rien tant qu'il n'est pas résolu. C'est le serveur qui compte : il lit les points du niveau dans sa propre table, jamais ceux envoyés par l'app. Il n'y a pas de plafond par jour pour l'instant.
- **Cadeaux** des 5 premiers à la fin de la semaine :

  | Place | Cadeau |
  | --- | --- |
  | 1re | 3 zones et 5 indices |
  | 2e | 1 zone et 3 indices |
  | 3e | 1 zone |
  | 4e | 2 indices |
  | 5e | 1 indice |

  Ils arrivent au lancement suivant, avec une carte qui donne le rang. Il faut au moins un point pour gagner un cadeau. À égalité de points, le premier arrivé à ce score passe devant.
- **Amis** :
  - chacun a un code ami de 6 caractères, que « Inviter un ami » partage ;
  - on ajoute un ami en tapant son code, ou par un lien `?ami=CODE` (web) ou `gardendoku://ami/CODE` (app) ;
  - l'amitié vaut dans les deux sens ;
  - l'onglet **Amis** classe les amis par points de la semaine, sans cadeaux (« Défie tes amis ! »).
- **Profil** : un des 12 avatars et un pseudo libre de 3 à 16 caractères (lettres, chiffres, espaces, `- _ ' .`). Le serveur refuse les mots grossiers, même avec accents, majuscules ou chiffres à la place des lettres (« C0nnard »). Les mots courts ne sont refusés que seuls (« con » oui, « Constance » non). Les classements montrent le pseudo, l'avatar et le niveau atteint.
- **Hors ligne** : les jardins résolus attendent dans une file (localStorage) et partent dès que le réseau revient.
- **Compte** : il est anonyme, créé sans rien demander au premier lancement et lié à l'appareil.

### Mettre en route le serveur (Supabase)

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Dans *Authentication › Sign In / Providers*, activer **Allow anonymous sign-ins**.
3. Appliquer les migrations de `supabase/migrations`, dans l'ordre : coller les fichiers dans le *SQL Editor*, ou utiliser `npx supabase link` puis `npx supabase db push`.
4. Créer un fichier `.env` à la racine (il est ignoré par git) :

   ```
   VITE_SUPABASE_URL=https://<projet>.supabase.co
   VITE_SUPABASE_KEY=<clé publishable ou anon>
   VITE_PUBLIC_URL=<adresse de la version web, facultatif : liens d'invitation>
   ```

   La clé est publique par nature : la base ne répond qu'à travers ses fonctions (sécurité au niveau des lignes activée, aucune table accessible directement).
5. `npm run build`, ou `npm run sync` pour les apps.

Sans `.env`, la ligue reste cachée.

**Mode démo** : `?ligue=demo` montre les écrans avec des joueurs inventés, sans serveur (`?ligue=off` pour en sortir). Il affiche aussi une fois la carte de fin de semaine.

Les tests (`tests/online.test.ts`) passent les migrations sur un vrai Postgres embarqué (PGlite), avec une imitation de Supabase Auth. Ils couvrent les ligues de 20, le barème, les cadeaux distribués une seule fois, les amis, le filtre de pseudos et l'accès fermé aux tables.

Si la génération des niveaux change, il faut régénérer les points : `npm run level-points` écrit `supabase/migrations/20261028000100_level_points.sql` (pour un nouveau changement, renommer d'abord `OUT` dans le script avec une nouvelle date : les migrations déjà passées ne sont pas rejouées) (5 000 niveaux ; au-delà, le serveur compte 4 pour les bords reliés et 1 sinon). Il faut ensuite appliquer cette migration sur le serveur. Un test vérifie que la table correspond au jeu.

## Styles de jardin

Dix-huit styles, choisis depuis l'écran d'accueil (bouton **Styles**, avec un aperçu dessiné de chacun) :

| Style | Ambiance et détails |
| --- | --- |
| Printemps | Le style d'origine : tulipes, coccinelles, escargots, nichoirs, arrosoirs, canetons, abeilles |
| Japon | Gravier ratissé, mousse, ponts rouges arqués, lanternes de pierre (allumées quand l'eau arrive), pagodes, torii, pas japonais, bambous, pins bonsaï, cerisiers, carpes koï |
| Automne | Herbe dorée, feuilles mortes, glands, citrouilles, hérissons, écureuils, pommes, arbres roux |
| Hiver | Tuiles enneigées, bonshommes de neige, sapins (illuminés quand l'eau arrive), cadeaux, sucres d'orge, houx, pingouins, luges |
| Savane | Terre craquelée, acacias, baobabs, termitières, girafes, éléphants, suricates, hippopotames dans l'eau |
| Désert | Sable ondulé, oasis verte, saguaros (qui fleurissent), cactus tonneaux, palmiers, jarres, chameaux, lézards |
| Jungle | Monsteras, fougères, hibiscus, bambous, toucans, statues tiki, bananiers, grenouilles, tortues, crocodiles (dans les canaux et sur les berges) |
| Sauvage | Roseaux et massettes, fleurs des champs, bûches moussues, grenouilles sur nénuphar, canards, libellules |
| Jardin de l'amitié | Topiaires en cœur, pique-niques, lapins câlins, ballons en cœur, lettres d'amour, lampadaires en cœur, bateaux en papier, pluie de petits cœurs, arc-en-ciel |
| Été | Tournesols, parasols, planches de surf plantées dans le sable, pastèques, stand de limonade, transats, châteaux de sable, bouées et canards en plastique, plage et voilier au fond |
| Roseraie | Rosiers qui fleurissent avec l'eau, arches de roses, bains d'oiseaux, topiaires, bancs blancs, vasques, pétales sur l'eau, kiosque |
| Verger | Pommiers et cerisiers chargés de fruits, potager, carottes, tomates, épouvantails, brouettes, ruches, poules, grange rouge |
| Champs | Bottes de foin, moulins (ailes qui tournent), coquelicots, lavande, gerbes de blé, lapins, tracteurs, collines en patchwork |
| Jardin à la française | Gravier ratissé, pelouse tondue en bandes, ifs taillés en cône, orangers en caisse, statues, vasques, broderies de buis, fontaines, cygnes, château au fond |
| Parc urbain | Pavés, lampadaires, bancs, vélos, chariot de hot-dogs, pigeons, bouches à incendie, fontaine, barques, pont de pierre, gratte-ciel au fond |
| Montagne | Sapins, chalets fleuris, marmottes, bouquetins, vaches à cloche, cairns, edelweiss et gentianes, sommets enneigés |
| Canyon | Cheminées de fées, arches de roche, genévriers, armoise, mouflons, campement (le feu s'allume avec l'eau), canoës, buttes en strates |
| Grands parcs | Grands pins, bisons, ours, geysers qui jaillissent, sources chaudes arc-en-ciel, cabane de ranger, wapitis, truites |

Chaque style a sa palette, son paysage de fond, ses particules d'ambiance (sakura, feuilles, neige, pollen, sable, lucioles, aigrettes, cœurs) et son catalogue de détails. Environ 80 % des parcelles reçoivent un ou deux détails tirés au hasard (de façon déterministe : un même niveau garde les mêmes détails). Certains sont là dès le départ (lanternes, rochers…), d'autres apparaissent quand l'eau arrive (animaux, fleurs). Les éléments debout restent droits quelle que soit la rotation de la tuile.

Chaque style a son propre vert : `grassFrom(teinte, saturation, clarté)` (`src/render/palette.ts`) en tire les six nuances d'herbe avec les mêmes rapports que le printemps.

Le canal qui passe d'une parcelle à sa voisine du dessous est dessiné par-dessus le liseré clair des deux parcelles, et ni l'ombre du bas de la parcelle ni celle de sa tranche ne le foncent : berges et eau gardent la même couleur d'une parcelle à l'autre.

Ajouter un style = un fichier dans `src/render/themes/` (palette, décor de fond, liste de détails), à déclarer dans `themes/index.ts`.

## Organisation du code

```
src/
  core/            Moteur, sans dépendance au DOM (testé avec Vitest)
    rng.ts         Générateur pseudo-aléatoire à seed (sfc32)
    grid.ts        Grille carrée ou hexagonale, directions en masque de bits (N=1, E=2, S=4, W=8 ; 6 bits sur les hexagones), rotations
    shapes.ts      Formes de jardin : rectangle, cercle, cœur, trèfle, losange, croix, sablier, étangs… et alvéole, rayon de miel, couronne
    generator.ts   Génération d'un niveau à partir d'une seed
    solver.ts      Solveur logique (preuve d'unicité de la solution)
    board.ts       État de jeu : rotations, verrous, eau, boucles, victoire
    levels.ts      Progression infinie : niveau n → taille, forme, seed
    timing.ts      Temps médian estimé d'un niveau et rang du joueur
    daily.ts       Défi du jour : seed par date, difficulté selon le jour de la semaine
  render/          Rendu Canvas 2D
    tileArt.ts     Dessin procédural d'une parcelle (sol, canal, eau, herbe, fleurs, lotus, détails)
    decor.ts       Décor de chaque parcelle, déterministe (placé hors des canaux)
    themes/        Les 18 styles (palette, paysage, détails), kit de dessin et décors partagés
    preview.ts     Aperçu d'un style pour le menu
    renderer.ts    Animations (ressort de rotation, eau qui avance, floraison), cache des parcelles
    particles.ts   Pétales, cœurs, étincelles, papillons
    background.ts  Ciel pastel, nuages, collines
  audio/sound.ts   Sons synthétisés en WebAudio (aucun fichier audio)
  ui/              HUD (DOM), saisie tactile, sauvegarde localStorage, partage
    league.ts      Cartes de la ligue, des amis, du profil et de fin de semaine
    avatars.ts     Les 12 avatars (SVG dans la direction artistique du jeu)
  online/          Ligues et amis : barème (points.ts), Supabase, démo, file d'attente hors ligne (social.ts)
  tutorial.ts      Mini-jardins et étapes des deux tutoriels (premiers pas, bords reliés)
  native.ts        App iOS / Android : vibrations, partage, bouton retour, sauvegarde en arrière-plan
  progress.ts      Défis qui débloquent les styles
  daily.ts         Résultat du défi du jour, texte à partager
  streak.ts        Série d'arrosage et ses récompenses
  game.ts          Contrôleur qui relie le tout
supabase/migrations  Schéma et fonctions du serveur (ligues, amis, profils), points des niveaux
scripts/level-points.ts  Régénère la migration des points des niveaux
```

## Génération des niveaux

Aucun niveau n'est stocké : le niveau `n` est entièrement reconstruit à partir de la seed `jardin-n`.

1. **Paramètres** (`levels.ts`) : une seed dérivée choisit la taille (3×3 au niveau 1, puis 3×4, 4×4, 4×5 et 5×5 vers le niveau 10, jusqu'à 9 colonnes × 12 à 15 lignes), la forme (à partir du niveau 9), et le caractère « sinueux » du réseau. La largeur est plafonnée à 9 colonnes pour garder des parcelles assez grandes sur un téléphone en portrait.
2. **Arbre couvrant** (`generator.ts`) : un algorithme *growing tree* part de la source et relie toutes les parcelles sans cycle (au plus 3 sorties par parcelle, 4 pour la source, carrée comme hexagonale).
3. **Unicité** : le solveur (`solver.ts`) ne fait que des déductions sûres (accord entre voisins, interdiction des boucles, un groupe isolé doit prendre sa seule sortie, deux groupes ne doivent pas s'enfermer mutuellement). S'il reste des parcelles ambiguës, l'arbre est localement « recâblé » autour d'elles, puis on recommence. Sur les 400 premiers niveaux, 100 % ont une solution unique trouvable par pure logique, en moins de 2 ms chacun.
4. **Mélange** : chaque parcelle reçoit une rotation aléatoire.

La victoire ne compare pas avec la solution d'origine : elle est déclarée dès que toutes les parcelles sont reliées à la source et qu'il n'y a aucune boucle (les boucles sont détectées en cherchant les arêtes qui ne sont pas des ponts, avec l'algorithme de Tarjan).

> Modifier l'algorithme de génération (ou les tableaux de `levels.ts`) change les niveaux existants. Il faudra donc le figer avant une sortie publique. En attendant, `GENERATOR_VERSION` (dans `levels.ts`) est enregistré avec la partie en cours : une partie sauvegardée avec une autre version n'est pas restaurée.

## Pistes pour la suite

- Apps : sauvegarde dans le stockage natif (iOS peut vider celui de la vue web en manque de place), vraies vidéos récompensées, version signée pour les stores.
- Compte : « Se connecter avec Apple / Google » pour retrouver ses amis et sa ligue sur un autre téléphone.
- Ligues : vérifier côté serveur la solution envoyée (le niveau se régénère depuis sa seed), et peut-être un plafond de points par jour.
- Défi du jour : un vrai classement sur le serveur (aujourd'hui, le rang est estimé localement).
- Zoom par pincement pour les très grandes grilles.
- Variantes exotiques : défi du jour hexagonal, formes hexagonales en étoile ou en triangle.
- Musique d'ambiance, réglage des vibrations, écran de statistiques.
