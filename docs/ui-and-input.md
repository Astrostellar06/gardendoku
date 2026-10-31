# Interface et gestes

Le HUD est du **DOM** posé sur le canevas : tout son balisage est dans [index.html](../index.html), son style dans [style.css](../src/style.css), sa logique dans [ui/hud.ts](../src/ui/hud.ts). Les gestes sur le jardin passent par [ui/input.ts](../src/ui/input.ts). Le tableau des gestes côté joueur est dans le README : [Commandes de jeu](../README.md#commandes-de-jeu).

## HUD ([ui/hud.ts](../src/ui/hud.ts))

`Hud` récupère les éléments par id à sa construction (`topbar`, `bottombar`, `home`, `win`, `howto`, `levels`, `hard-intro`, `hex-intro`, `styles`, `coach`, `hint-shop`, `daily-result`, `streak`, `zone-info`, `skip`, `settings`, `league`, `profile`, `league-result`, `ad`, boutons…). Il n'a pas d'état de jeu : `Game` l'appelle.

- **Cartes** : `open(el)` retire `hidden` ; `close(el)` ajoute `closing` puis `hidden` après 260 ms (animation CSS). Les cartes de la liste `closable` se ferment d'un toucher hors de la carte ou sur un élément `[data-close]`. `closeTopOverlay()` (bouton retour Android) ferme la dernière carte ouverte de cette liste ; la fausse pub (`#ad`) ne se ferme pas avant la fin. `overlayOpen()` arrête le chrono.
- **Barres** : `showGameBars(on)`, `setLevel(info)` (titre « Niveau N », « ★ » et pastille lilas `.hard` pour les bords reliés, pastille miel `.hex` pour les hexagones, sous-titre « N parcelles »), `setDaily(info, styleName)`, `setHints`, `setZoneHints`, `setLockMode`, `setZoneMode`, `setSkipVisible`, `setWonBar` (bouton flottant « Niveau suivant » après « Admirer »).
- **Place du jardin** : `gameInsets(h)` et `homeInsets(h)` mesurent les barres (avec `offsetTop`/`offsetHeight`, pas les boîtes animées) ; `coachInset(h)` la bulle du tutoriel. `Game.relayout()` les passe au rendu (`setInsets`). Toute modification de mise en page du HUD passe par ces fonctions.
- **Toasts** : `toast(message, warn, ms)`, `hideToast()`.
- **Victoire** : `showWin(WinView)` (temps, rotations, rang, styles débloqués, série du jour), `setWinLeague(text)` (points de ligue, ajoutés quand le serveur a répondu), `winCardHeight()` (pour placer le jardin qui tourne au-dessus de la carte), `hideWin()`.
- **Listes** : `openLevels(maxLevel, current, skipped, onPick)` affiche au moins 20 niveaux (`maxLevel + 4`), marque les difficiles, hexagonaux et passés ; `openStyles(cards, current, preview, onPick, onLocked)` construit le menu des styles avec un aperçu de 112 px par carte (images 3D de `stylePicture` ou aperçus 2D de `renderThemePreview` selon le rendu).
- **Autres cartes** : `openHowto`, `openHardIntro`, `openHexIntro`, `openHintShop`, `openZoneInfo`, `openSkip`, `openSettings`, `openStreak`, `openDailyResult` (avec compte à rebours rafraîchi).

Les cartes de ligue, d'amis, de profil et de fin de semaine sont dans [ui/league.ts](../src/ui/league.ts) (`LeagueScreen`) ; les 12 avatars SVG dans [ui/avatars.ts](../src/ui/avatars.ts). Voir [online.md](online.md).

## Gestes ([ui/input.ts](../src/ui/input.ts))

`attachInput(canvas, handlers, longPressMs = 420)` écoute les **Pointer Events** du canevas (souris, doigt, stylet) et appelle les fonctions fournies par `Game` (`InputHandlers`) :

| Fonction | Fournie par `Game` |
| --- | --- |
| `cellAt(x, y)` | `renderer.cellAt`, mais -1 à l'accueil et après la victoire (un toucher ne fait alors que tourner le jardin). |
| `lockMode()` | État du mode Verrou. |
| `tap(cell)` | `onTap`. |
| `paintStart/paintMove/paintEnd` | Peinture des verrous. |
| `holdStart(cell, ms)`, `holdEnd()` | Anneau d'appui long (`renderer.hold`) et parcelle enfoncée (`renderer.setPressed`). |
| `canDrag()` | `mode === 'play' && renderer.canDrag(lockMode)`. |
| `drag`, `dragEnd`, `pan`, `zoom` | Vue 3D (sans effet en 2D). |

Constantes : `MOVE_TOLERANCE = 14` px (au-delà, le doigt « a bougé »), `SAMPLE_STEP = 8` px (points échantillonnés le long d'un glissé rapide, pour ne sauter aucune parcelle), `LOCK_MODE_DELAY = 90` ms.

Machine à états, pour un doigt (`Stroke`) :

1. **Appui** sur une parcelle :
   - clic droit (souris) → peinture immédiate ;
   - mode Verrou → peinture après 90 ms (laisse le temps à un second doigt de se poser pour zoomer sans basculer de verrou) ;
   - sinon → minuterie d'appui long (420 ms) et `holdStart`.
   - Appui hors du jardin : ignoré, sauf si `canDrag()` (le doigt servira à déplacer ou tourner la vue).
2. **Déplacement** au-delà de 14 px avant l'appui long : annule l'appui long, puis
   - mode Verrou → commence à peindre depuis la première parcelle ;
   - `canDrag()` → le doigt déplace la vue (zoomé) ou tourne le jardin (victoire) : `drag(dx, dy)` ;
   - sinon → le toucher est abandonné (pas de rotation).
3. **Appui long** atteint : `paintStart(cell)`. Le glissé qui suit appelle `paintMove` pour chaque nouvelle parcelle traversée. Après un appui long, le doigt n'a pas bougé, donc on peint toujours, même zoomé.
4. **Relâché** sans avoir bougé : en mode Verrou, la parcelle bascule (`paintStart` + `paintEnd`) ; sinon `tap(cell)`.

Deux doigts : le second doigt **annule le geste en cours** (`finish()`, sans basculer de verrou) et démarre un pincement : `zoom(milieu, distance / distance précédente)` et `pan(déplacement du milieu)`. Le doigt restant après un pincement ne fait rien jusqu'à ce qu'il soit levé (`spent`). Molette : `zoom(x, y, exp(-deltaY × 0.0015))`. Le menu contextuel est désactivé sur le canevas.

Côté `Game` :

- `paintStart(cell)` : la première parcelle bascule (`lock = !locked[cell]`), le son et une vibration de 12 ms suivent ; `paintMove` applique le même état aux suivantes (`board.setLock`), avec une note qui monte (`sound.lockStep`) et 6 ms de vibration ; `paintEnd` sauvegarde. Si l'indice de zone est armé, un appui long le pose.
- `onTap(cell)` : voir [architecture.md](architecture.md#le-contrôleur-game-gamets).

## Indices et indices de zone

Le comportement côté joueur est dans le README ([Indices](../README.md#indices)). Dans [game.ts](../src/game.ts) :

- `hint()` : sans indice, ouvre la boutique (vidéo factice, +3). Sinon choisit au hasard (`Math.random`, non déterministe) parmi, dans l'ordre de priorité : les parcelles **verrouillées dans le mauvais sens** ; sinon les parcelles fausses voisines d'une parcelle juste et arrosée ; sinon n'importe quelle parcelle fausse. `board.applySolution(cell)` la tourne et la verrouille.
- `toggleZoneMode()` / `applyZone(center)` : carré 3×3 autour de la parcelle (par-dessus les bords reliés), ou la parcelle et ses 6 voisines sur les hexagones. Une zone déjà juste et verrouillée ne consomme rien. Sans indice de zone, une carte dit dans combien de jours la série en donnera un (`daysToZoneHint`).
- Les deux comptent dans le rang (`hints + 3 × zones`) et cassent les défis « sans indice » (`stats.noHint*`, `noHelpBest`).
- Vidéos récompensées : [ui/ads.ts](../src/ui/ads.ts) est **factice** (barre de 3 s, récompense toujours accordée). `showRewardedAd()` est le seul point à remplacer par une vraie régie (par exemple AdMob via un plugin Capacitor), en ne résolvant `true` que quand la régie confirme la récompense. Elle sert à +3 indices et à passer un niveau (`skipLevel`).

## Tutoriels ([tutorial.ts](../src/tutorial.ts))

Deux tutoriels (`TutorialId = 'basics' | 'wrap'`), chacun sur un mini-jardin 3×3 construit à la main (`build()` renvoie un `Board` dont certaines parcelles sont tournées d'un quart de tour) et une suite d'étapes `TutorialStep` :

| `kind` | L'étape avance quand… |
| --- | --- |
| `read` | le joueur touche le bouton de la bulle (`button`). |
| `turn` | la parcelle `cell` est tournée dans le bon sens (seule elle peut tourner ; `ghost: true` met le projecteur sur sa copie sous le jardin). |
| `hold` | la parcelle `cell` est verrouillée par appui long. |
| `free` | le jardin est fini ; après `LAST_HINT_DELAY = 10` s bloqué, le projecteur montre la parcelle restante. |

- `basics` (5 positions affichées) : lancé au premier démarrage (`!seenTutorial && maxLevel <= 1 && !snapshot`) ou depuis l'aide.
- `wrap` (4 positions) : lancé par `loadLevel` au premier niveau difficile si `!seenHardIntro`, ou depuis l'aide.
- `Game` pilote : `startTutorial`, `setTutorialStep` (bulle via `hud.showCoach`, projecteur via `renderer.spotlight`), `tutorialTap`, `advanceTutorial`, `finishTutorial` (marque vu et lance le niveau prévu).
- Textes : clés `tutorial.*` (les `text` et `button` des étapes sont des clés de traduction).
- Test : [hex.test.ts](../tests/hex.test.ts) vérifie qu'un toucher sur chaque parcelle à tourner résout chaque tutoriel, et le trajet de l'eau du tutoriel `wrap`.

Changer un mini-jardin : modifier `solution`, les cellules (`TURN_CELL`, `LAST_CELL`, `LOCK_CELL`, `EDGE_CELL`, `GHOST_CELL`) et les rotations de départ ensemble, puis relancer les tests.

## Titre de l'accueil ([ui/titleArt.ts](../src/ui/titleArt.ts))

- Le `<h1 class="logo">` de [index.html](../index.html) est vide : le constructeur de `Hud` y ajoute `canalTitle('Gardendoku')`, un SVG (`.logo-canal`) construit une fois. Le mot suit un arc (`ARC`, courbe quadratique) et est « creusé » dans une bande de jardin (largeur `STRIP`) ; des taches d'herbe (masque `t-meadow`) et 16 fleurs apparaissent derrière l'eau, avec des délais CSS (`--d`) calculés par `reach(x)` (l'eau traverse le mot en `FLOW = 2.2` s après `FLOW_DELAY = 0.35` s). Le placement aléatoire vient de `new Rng('titre')` (toujours le même). Taille et espacement : `FONT`, `SPACING`.
- `playTitle(svg)` relance l'animation (classe `play`) à chaque retour à l'accueil (`hud.showHome`). Les couleurs viennent des variables CSS `--logo-*` posées par `Game.applyStyleColors` ; les animations sont dans [style.css](../src/style.css) (classes `.logo-canal .t-*`).
- Sous le titre, le jardin d'exemple de l'accueil est un vrai jardin du moteur (`Game.showHome`, 7×7 en trèfle, seed `accueil`, résolu d'office).

## Série d'arrosage ([streak.ts](../src/streak.ts))

- `Streak = { last, count, best }` dans la sauvegarde. `advanceStreak(streak, today)` : +1 si `last` était hier, sinon 1. `liveStreak` : la série vaut 0 si le dernier jour arrosé n'est ni aujourd'hui ni hier.
- Appelée une fois par jour par `Game.waterStreak()` à la première victoire (niveau ou défi du jour). Passer un niveau par vidéo ne compte pas.
- Récompenses : `WEEK_REWARDS` par jour de la semaine de série (`weekDay(count)` = 1 à 7) : jour 3 → 1 indice, jour 7 → 3 indices et 1 indice de zone. `nextReward`, `daysToZoneHint`, `rewardText` servent aux cartes.
- Affichage : badge de l'accueil (`setHomeStreak`), carte de la série (`openStreak`, piste de 7 cases et cadeaux, `fillTrack`), bloc de la carte de victoire.
- Les défis Montagne et Verger lisent `streak.best`.

## Déblocage des styles ([progress.ts](../src/progress.ts))

`STYLE_CHALLENGES` associe à chaque style (sauf `printemps`) un `Challenge` : `text()` (traduit) et `state(save)` → `{ done, progress }`. `refreshUnlocks(save)` ajoute à `save.unlocked` les styles dont le défi est rempli et renvoie les nouveaux (annoncés sur la carte de victoire ou en toast). Un déblocage est définitif : changer un objectif ne reprend jamais un style. `isUnlocked` considère toujours `printemps` et `aleatoire` comme débloqués.

## Paramètres

Carte `#settings` (`openSettings`) : sons (`Sound.enabled`), vibrations (`settings.haptics`, testé dans `Game.vibrate`), langue (boutons `#set-lang [data-lang]`). Changer de langue sauvegarde puis **recharge la page** (`location.reload()`) : tous les textes sont reconstruits, la partie en cours est reprise depuis la sauvegarde.

## Sons ([audio/sound.ts](../src/audio/sound.ts))

Tout est synthétisé en WebAudio, sans fichier. `unlock()` doit être appelé depuis un geste (les navigateurs bloquent le son avant) : `Game` le fait sur chaque clic de bouton et chaque appui. Méthodes : `rotate`, `lock(on)`, `lockStep(on, step)`, `denied`, `water(dist)` (note pentatonique selon la distance à la source, au plus 3 notes par 0,12 s ; au-delà de 3 octaves, les notes tournent sur l'octave la plus haute), `loop`, `win`.
