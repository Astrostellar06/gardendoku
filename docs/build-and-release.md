# Construire, tester, publier

Résumé côté README : [Lancer le jeu](../README.md#lancer-le-jeu), [Applications iOS et Android](../README.md#applications-ios-et-android).

## Prérequis

- Node.js et npm (le projet est un module ES : `"type": "module"`).
- Pour Android : Android Studio (il fournit le JDK dans `Android Studio/jbr` et le SDK Android).
- Pour iOS : un Mac avec Xcode.
- Facultatif : un projet Supabase et un `.env` (voir [online.md](online.md#variables-denvironnement)).

```bash
npm install
```

## Scripts npm ([package.json](../package.json))

| Commande | Fait |
| --- | --- |
| `npm run dev` | `vite --host` : serveur de dev sur le port 5173 ([vite.config.ts](../vite.config.ts)), accessible sur le réseau local (adresse « Network » à ouvrir depuis un téléphone sur le même Wi-Fi). Active aussi le point d'enregistrement `/__save` (voir plus bas). |
| `npm run build` | `tsc --noEmit && vite build` : vérification de types puis build de production dans `dist/` (cible `es2020`, chemins relatifs `base: './'` pour la vue web de Capacitor). |
| `npm run preview` | Sert `dist/` (`vite preview --host`). |
| `npm test` | `vitest run` : tous les tests de [tests/](../tests/). |
| `npm run typecheck` | `tsc --noEmit` (inclut `src` et `tests`). |
| `npm run sync` | `npm run build && cap sync` : build web puis copie dans `android/` et `ios/` et mise à jour des plugins natifs. **À refaire après chaque changement** avant de lancer l'app. |
| `npm run android` | `sync` puis `cap open android` (Android Studio). |
| `npm run ios` | `sync` puis `cap open ios` (Xcode, Mac uniquement). |
| `npm run icons` | `capacitor-assets generate --android --ios` : icônes et écrans de lancement natifs à partir de `assets/*.png`. |
| `npm run level-points` | `vite-node scripts/level-points.ts` : régénère la table des points du serveur (voir [online.md](online.md#table-des-points-des-niveaux)). |

[.claude/launch.json](../.claude/launch.json) déclare la même commande de dev (`npm run dev`, port 5173) pour les outils d'aperçu.

### Le serveur de dev

[vite.config.ts](../vite.config.ts) :

- plugin `saveFiles` (**dev uniquement**, `apply: 'serve'`) : un `POST /__save?path=...` écrit le corps de la requête dans le projet. Seuls `public/previews/<fichier>` et `assets/<fichier>` sont acceptés (pas de `..`, un seul niveau). Il sert à `__game.savePreviews()`. Il n'existe pas dans le build.
- `server.allowedHosts` contient un nom d'hôte ngrok : il permet d'ouvrir le serveur de dev à travers un tunnel ngrok. À adapter (ou retirer) selon le tunnel utilisé.

### Outils de dev dans le navigateur

Paramètres d'adresse : `?niveau=N`, `?reset`, `?debloquer`, `?rendu=2d`, `?ligue=demo` / `?ligue=off`, `?ami=CODE` (détails dans [architecture.md](architecture.md#le-contrôleur-game-gamets) et le [README](../README.md#tester-un-niveau-précis)).

En dev, la console expose `__game` :

| Appel | Effet |
| --- | --- |
| `__game.debugSolve(5)` | Résout tout sauf 5 parcelles (voir la victoire rapidement). |
| `__game.renderer.gallery(from)` | (3D) Un détail du style courant sur chaque parcelle, arrosé et fleuri. |
| `await __game.savePreviews()` | (3D) Rend et enregistre les 18 aperçus dans `public/previews/`. |

## Tests

Vitest, sans configuration particulière (environnement Node, pas de DOM). Les tests importent directement le code de `src/` ; ceux qui touchent au dessin utilisent un faux contexte Canvas, ceux du 3D construisent des géométries three.js sans WebGL.

| Fichier | Couvre |
| --- | --- |
| [core.test.ts](../tests/core.test.ts) | Rotation des masques ; générateur déterministe, arbre sans boucle, jamais résolu au départ ; **unicité des 150 premiers niveaux** (et solution trouvée = solution générée, ~4 s) ; tailles des premiers niveaux ; analyse (boucle, parcelles sèches, entrée de l'eau) ; part d'hypothèses à partir du niveau 21 ; niveaux difficiles (fréquence, tailles, unicité, eau à travers un bord). |
| [brute.test.ts](../tests/brute.test.ts) | Le solveur ne ment pas : quand il annonce une solution unique, un comptage par force brute en trouve exactement une (jardins carrés, à bords reliés, avancés, hexagonaux). |
| [hex.test.ts](../tests/hex.test.ts) | Grille hexagonale (rotations, voisins réciproques, jamais de bords reliés, formes, eau, rotation d'un sixième) ; fréquence des niveaux hexagonaux (environ 1 sur 4, jamais deux de suite), progression des formes, unicité, temps estimé plus long ; tutoriels (un toucher par parcelle à tourner les résout, trajet de l'eau du tutoriel des bords reliés). |
| [daily.test.ts](../tests/daily.test.ts) | Clés de date, même jardin pour tous un jour donné, semaine (bords reliés le samedi, plus grand le dimanche), unicité sur un mois, séries de jours, texte à partager. |
| [progress.test.ts](../tests/progress.test.ts) | Modèle de temps (loi normale, médiane à 50 %, effets de la taille, de la difficulté et des indices) ; déblocage des styles (départ, défis, une seule fois, défi pour chaque style payant). |
| [streak.test.ts](../tests/streak.test.ts) | Semaines de 7 jours, récompenses des jours 3 et 7, texte des indices de zone. |
| [themes.test.ts](../tests/themes.test.ts) | Pour chaque style : chaque détail et des parcelles entières (carrées et hexagonales) gardent `save()`/`restore()` équilibrés (faux contexte qui compte la profondeur). |
| [props3d.test.ts](../tests/props3d.test.ts) | Chaque modèle 3D se construit, < 2 500 triangles, taille raisonnable ; affiche le nombre de détails sans modèle. |
| [render3d.test.ts](../tests/render3d.test.ts) | Canal creusé de chaque parcelle et socle des 120 premiers niveaux (polygon-clipping ne lève pas d'erreur). |
| [i18n.test.ts](../tests/i18n.test.ts) | Traductions (voir [i18n.md](i18n.md#ce-que-vérifie-i18ntestts)). |
| [online.test.ts](../tests/online.test.ts) | Serveur Supabase sur PGlite (voir [online.md](online.md#tests-du-serveur-onlinetestts)). |

Lancer un seul fichier : `npx vitest run tests/hex.test.ts`. Les tests du moteur sont les plus longs (génération de centaines de niveaux) : certains ont un délai relevé à 30 s ([core.test.ts](../tests/core.test.ts), [render3d.test.ts](../tests/render3d.test.ts)), et le chargement des migrations dans PGlite à 60 s.

## Apps natives (Capacitor)

[capacitor.config.ts](../capacitor.config.ts) : `appId: 'io.github.astrostellar06.gardendoku'`, `appName: 'Gardendoku'`, `webDir: 'dist'`, fond `#FFD6E5`, barres système (`SystemBars`) à icônes foncées avec `viewport-fit=cover`. Plugins utilisés : `@capacitor/app`, `@capacitor/haptics`, `@capacitor/share` (voir [native.ts](../src/native.ts)).

Les dossiers `android/` et `ios/` sont des projets natifs versionnés. Ce qui n'est pas versionné : les builds (`android/app/build`), la copie du web et de la configuration faite par `cap sync` (`android/app/src/main/assets/public`, `ios/App/App/public`, les `capacitor.config.json`), les plugins Cordova générés, `android/local.properties`.

Réglages natifs à connaître :

- Portrait seulement : `android:screenOrientation="portrait"` dans [AndroidManifest.xml](../android/app/src/main/AndroidManifest.xml), `UISupportedInterfaceOrientations` dans [Info.plist](../ios/App/App/Info.plist).
- Liens d'invitation `gardendoku://ami/CODE` : filtre d'intention `android:scheme="gardendoku"` (Android), `CFBundleURLSchemes` (iOS).
- Android : `minSdkVersion 24`, `compileSdkVersion`/`targetSdkVersion 36` ([variables.gradle](../android/variables.gradle)). iOS : cible 15.0, Swift Package Manager (`ios/App/CapApp-SPM`).

### APK Android sans Android Studio (Windows)

```bash
npm run sync
cd android && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew assembleDebug
```

- Gradle doit trouver le SDK Android : soit la variable `ANDROID_HOME` (sur cette machine, le SDK installé par Android Studio est dans `%LOCALAPPDATA%\Android\Sdk`, soit `/c/Users/<vous>/AppData/Local/Android/Sdk` en bash), soit un fichier `android/local.properties` avec `sdk.dir=...` (ignoré par git, Android Studio le crée à l'ouverture du projet). Sans l'un ou l'autre, Gradle s'arrête sur « SDK location not found ».
- L'APK sort dans `android/app/build/outputs/apk/debug/app-debug.apk` ; l'installer avec `adb install -r <apk>` (adb est dans `platform-tools` du SDK) ou en le copiant sur le téléphone.
- Version de release : `./gradlew assembleRelease` ou `bundleRelease` (AAB pour le Play Store) demandent une clé de signature, **pas encore configurée** dans [build.gradle](../android/app/build.gradle) (`buildTypes.release` n'a que `minifyEnabled false`).

### iOS

`npm run ios` ouvre Xcode ; choisir une équipe de signature dans le projet, puis *Run* sur un appareil ou un simulateur. Le build web doit avoir été copié (`npm run sync`).

### Icônes et écran de lancement

1. [scripts/make-icon.mjs](../scripts/make-icon.mjs) dessine l'icône (arrosoir sur une pelouse) en SVG et écrit avec **sharp** : `assets/icon-only.png` (icône pleine, iOS), `assets/icon-foreground.png` et `assets/icon-background.png` (icône adaptative Android), ainsi que [public/icon.svg](../public/icon.svg) (web et manifeste). `sharp` n'est pas une dépendance directe du projet : il arrive par `@capacitor/assets` (sharp 0.32) ; si cette dépendance disparaît, ajouter `npm install -D sharp`.
2. `npm run icons` génère les icônes et écrans de lancement natifs à partir de `assets/*.png` (dont `splash.png` et `splash-dark.png`).
3. `npm run sync`.

```bash
node scripts/make-icon.mjs && npm run icons && npm run sync
```

## Identifiant et versions

- **Identifiant de l'app** : `io.github.astrostellar06.gardendoku`, présent dans [capacitor.config.ts](../capacitor.config.ts), [android/app/build.gradle](../android/app/build.gradle) (`namespace` et `applicationId`), le paquet Java de `MainActivity` (`android/app/src/main/java/io/github/astrostellar06/gardendoku/`) et `PRODUCT_BUNDLE_IDENTIFIER` dans `ios/App/App.xcodeproj/project.pbxproj`. Capacitor ne réécrit pas les projets natifs existants : le changer veut dire le changer partout. À figer avant la première publication sur les stores.
- **Versions** : rien ne les relie aujourd'hui. `package.json` est en `0.1.0` ; Android `versionCode 1` / `versionName "1.0"` ([build.gradle](../android/app/build.gradle)) ; iOS `CURRENT_PROJECT_VERSION = 1` / `MARKETING_VERSION = 1.0` (project.pbxproj). Chaque envoi sur un store demande d'incrémenter `versionCode` (Android) et `CURRENT_PROJECT_VERSION` (iOS).
- **Version du générateur** : `GENERATOR_VERSION` dans [levels.ts](../src/core/levels.ts), indépendante des précédentes (voir [architecture.md](architecture.md#generator_version)).

## Liste de contrôle avant une sortie

1. **Génération** : si la génération a changé depuis la dernière sortie, `GENERATOR_VERSION` a été incrémenté, et une **nouvelle** migration de points a été générée (`npm run level-points`, qui nomme lui-même le fichier avec la date et l'heure) et appliquée au serveur. Voir [maintenance.md](maintenance.md#je-change-la-génération-des-niveaux).
2. **Serveur** : toutes les nouvelles migrations de `supabase/migrations/` sont appliquées (`npx supabase db push`), avec les bons `revoke`/`grant`.
3. **Aperçus** : si les modèles 3D, palettes ou styles ont changé, `await __game.savePreviews()` en dev, et les `.webp` de `public/previews/` sont à jour.
4. **Icônes** : si l'icône a changé, `node scripts/make-icon.mjs && npm run icons`.
5. **Traductions** : chaque nouvelle clé existe dans les 9 langues.
6. `npm test` et `npm run typecheck` passent.
7. `npm run build` (ou `npm run sync` pour les apps), vérifier le jeu sur un téléphone (rendu 3D, et `?rendu=2d` si le rendu 2D a été touché).
8. `.env` du build pointe vers le bon projet Supabase (sinon la ligue est cachée).
9. Apps : incrémenter `versionCode`/`versionName` et les versions iOS ; build signé.
10. Rappels du README : la vidéo récompensée ([ads.ts](../src/ui/ads.ts)) est factice, et la sauvegarde est dans le `localStorage` de la vue web (iOS peut le vider en manque de place).
