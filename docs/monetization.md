# Monétisation, statistiques et consentement

Pubs (AdMob), achats intégrés (RevenueCat, sur Google Play), statistiques et réglages à distance (Firebase), consentement RGPD (Google UMP, fourni par AdMob). Tout se trouve dans [src/monetize/](../src/monetize/) :

| Fichier | Rôle |
| --- | --- |
| [config.ts](../src/monetize/config.ts) | Réglages par défaut (`DEFAULT_CONFIG`), identifiants et contenu des produits (`PRODUCTS`, `PRODUCT_CONTENT`), droit RevenueCat `no_ads`. |
| [adPolicy.ts](../src/monetize/adPolicy.ts) | Règles des interstitiels et de l'offre « sans pub », en fonctions pures ([tests/adPolicy.test.ts](../tests/adPolicy.test.ts)). |
| [services.ts](../src/monetize/services.ts) | Les SDK, chargés à la demande : AdMob et consentement, RevenueCat, Firebase Analytics et Remote Config. Sur le web et en dev : vidéo factice ([ui/ads.ts](../src/ui/ads.ts)), pas de boutique, événements dans la console. |
| [index.ts](../src/monetize/index.ts) | Classe `Monetization` utilisée par le jeu, et `track()` pour les événements. |

Rien ne plante si un service manque : pas de clé RevenueCat, pas de boutique ; pas de `google-services.json`, pas de statistiques ni de réglages à distance (les valeurs par défaut s'appliquent) ; pas de réseau, pas de pub.

## Les règles

**Interstitiels** (`interstitialAllowed`) :
- seulement quand le joueur touche « Niveau suivant » (carte de victoire ou bouton du bas après « Admirer ») : jamais pendant la victoire, jamais pendant qu'il admire le jardin, jamais au défi du jour ;
- pas avant le niveau `ad_min_level` (9), ni pendant la première session (premier lancement, le jour de l'installation) ;
- un délai minimum depuis la dernière pub, interstitielle ou vidéo récompensée : `ad_interval_first` (180 s) au début, `ad_interval_mid` (120 s) dès le jour `ad_mid_after_days` (1), `ad_interval_late` (90 s) dès le jour `ad_late_after_days` (4). Un niveau fini vite tombe dans le délai : pas de pub ;
- jamais après l'achat « Sans publicité ».

**Offre « Tu aimes le calme ? »** (`offerDue`) : après le 3ᵉ interstitiel (`offer_after_ads`), puis tous les 6 (`offer_every_ads`). Elle propose « Sans publicité + 30 indices » (mis en avant) et « Sans publicité ».

**Vidéos récompensées** (`Monetization.rewarded`) :
| Où | Récompense | Réglage |
| --- | --- | --- |
| Plus d'indice (carte « Plus d'indices ») | +1 indice | `reward_hints` |
| Plus d'indice de zone (carte « Indice de zone ») | désactivé par défaut : les indices de zone viennent de la série, de la ligue et des achats | `reward_zones` (0 = pas de vidéo) |
| Passer un niveau | le niveau suivant s'ouvre | — |
| Style verrouillé (menu Styles) | le style est à toi 24 h (`save.trials`) | `style_trial_hours` (0 = pas d'essai) |
| Fin de semaine de ligue | le cadeau est donné une deuxième fois | `league_double` |

Une vidéo regardée relance aussi le délai des interstitiels. Les vidéos restent disponibles après l'achat « Sans publicité ».

## Réglages à distance (Firebase Remote Config)

Chaque clé de `MonetizeConfig` ([config.ts](../src/monetize/config.ts)) peut être créée dans la console Firebase › Remote Config, avec le même nom et le même type (nombre ou booléen). Une clé absente garde sa valeur par défaut. Les valeurs sont lues au lancement (au plus une fois par heure). Les tests A/B se font dans Firebase › A/B Testing, sur ces clés.

## Produits

| Identifiant (Play Console et RevenueCat) | Contenu | Prix conseillé |
| --- | --- | --- |
| `no_ads` | plus d'interstitiel, pour toujours (droit `no_ads`) | 3,99 € |
| `no_ads_hints` | sans pub + 30 indices (droit `no_ads`) | 6,49 € |
| `hints_10` | 10 indices (consommable) | 0,99 € |
| `hints_40` | 40 indices (consommable) | 2,99 € |
| `zones_5` | 5 indices de zone (consommable) | 1,99 € |

Les prix affichés viennent du store, dans la monnaie du joueur. Le contenu donné est dans `PRODUCT_CONTENT`. « Restaurer mes achats » (Paramètres) retrouve « Sans publicité » sur un nouvel appareil (même compte Google).

Accès : Paramètres › Boutique ; cartes « Plus d'indices » et « Indice de zone » (packs) ; offre après quelques pubs.

## Événements (Firebase Analytics)

| Événement | Paramètres |
| --- | --- |
| `tutorial_step` | `tutorial` (basics / wrap), `step` (numéro, ou `done`) |
| `level_start` | `level` (0 au défi du jour), `kind` (normal / hex / hard), `tiles`, `daily`, `resumed` |
| `level_complete` | `level`, `kind`, `tiles`, `seconds`, `moves`, `hints`, `zones`, `daily` |
| `level_quit` | `level`, `seconds`, `moves`, `daily` (le joueur quitte un jardin non fini) |
| `hint_used`, `zone_hint_used` | `level`, `left` |
| `level_skip` | `level`, `seconds` |
| `ad_shown` | `type` (rewarded / interstitial), `placement`, `level` |
| `ad_clicked` | `type` (vidéos récompensées seulement : AdMob ne signale pas le clic des interstitiels) |
| `rewarded_completed` | `placement` (hints, zones, skip, style_trial, league_double) |
| `iap_purchase` | `product`, `value`, `currency` |
| `daily_played` | `seconds`, `moves`, `hints` |
| `style_unlocked` | `style`, `via` (challenge / trial) |

La courbe d'abandon par niveau : dans Firebase › Explorations, `level_start` et `level_complete` par paramètre `level`.

## Consentement et vie privée

- **Consentement (RGPD)** : au lancement, `startAds()` demande à Google UMP si un consentement est nécessaire et montre le formulaire si besoin. Le formulaire se configure dans AdMob › Confidentialité et messages › RGPD. Sans accord, les pubs sont non personnalisées ou absentes, selon la réponse de Google. Où la loi l'exige, Paramètres › « Choix de confidentialité » rouvre le formulaire.
- **Statistiques** : Firebase Analytics est coupé tant que le jeu ne l'allume pas (`firebase_analytics_collection_enabled=false` dans l'AndroidManifest). Le jeu l'allume selon le réglage Paramètres › « Statistiques de jeu anonymes », allumé par défaut, et refuse toujours les usages publicitaires (`ad_storage`, `ad_user_data`, `ad_personalization`). À faire valider : pour une stricte conformité RGPD, on peut le mettre éteint par défaut dans l'UE, ou le lier au formulaire UMP.
- **Politique de confidentialité** : [public/privacy.html](../public/privacy.html), publiée avec la version web (https://astrostellar06.github.io/gardendoku/privacy.html), en lien dans les paramètres. Il faut y mettre une adresse de contact avant la publication.
- **iOS (plus tard)** : demande ATT (App Tracking Transparency) à ajouter avant de publier sur l'App Store.

## Mise en route (avant la publication sur Google Play)

1. **AdMob** (admob.google.com) :
   - créer l'app Android ;
   - recopier son identifiant d'app dans `android/app/src/main/res/values/strings.xml` (`admob_app_id`, aujourd'hui l'app de test de Google) ;
   - créer deux blocs d'annonces, « Avec récompense » et « Interstitiel », et mettre leurs identifiants dans `.env` : `VITE_ADMOB_REWARDED` et `VITE_ADMOB_INTERSTITIAL`. Sans eux, ce sont les annonces de test de Google ;
   - dans Confidentialité et messages, créer et publier le message RGPD.
2. **Firebase** (console.firebase.google.com) :
   - créer le projet et y ajouter l'app Android `io.github.astrostellar06.gardendoku` ;
   - télécharger `google-services.json` dans `android/app/` : le plugin Gradle s'applique alors tout seul ;
   - activer Analytics et Remote Config.
3. **Play Console** :
   - créer l'app ;
   - créer les produits intégrés du tableau ci-dessus (les packs d'indices sont consommables) ;
   - remplir « Sécurité des données » et la classification du contenu.
4. **RevenueCat** (revenuecat.com) :
   - créer le projet et l'app Play Store, avec la clé de compte de service Google ;
   - importer les produits ;
   - créer le droit `no_ads` et y attacher `no_ads` et `no_ads_hints` ;
   - mettre la clé publique de l'app Android dans `.env` : `VITE_REVENUECAT_ANDROID_KEY`.
5. **Build** : `npm run sync`, puis une version signée (AAB) pour Play.

**« Sécurité des données » sur Play** (selon ce que fait le jeu) :
- données collectées : identifiants (ID d'appareil ou de publicité, par AdMob et Firebase), activité dans l'app (interactions, achats), informations et performances de l'appareil ;
- usages : fonctionnement de l'app, statistiques, publicité (AdMob) ;
- chiffrées en transit ;
- suppression possible sur demande (voir la politique).

## Tester

- **Web et dev** : `npm run dev`.
  - Les vidéos sont factices et donnent leur récompense.
  - En dev, les interstitiels aussi sont factices, pour voir quand ils tombent : niveau 9 et plus, à partir du 2ᵉ lancement, et 3 min entre deux pubs.
  - La boutique dit « Les achats se font dans l'application Android ».
  - Les événements s'affichent dans la console (`[analytics]`).
- **Android sans clés** : annonces de test de Google ; pas de boutique ; pas de statistiques sans `google-services.json`.
- **Achats de test** : ajouter des testeurs de licence dans la Play Console, et utiliser une version installée depuis Play (piste de test interne).
