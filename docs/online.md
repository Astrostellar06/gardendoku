# En ligne : ligues, amis, serveur Supabase

Le jeu fonctionne entièrement hors ligne. Le serveur ne sert qu'aux **ligues de la semaine**, aux **amis** et au **profil** (pseudo, avatar). Côté joueur, voir [Ligues et amis](../README.md#ligues-et-amis-en-ligne) et [Mettre en route le serveur](../README.md#mettre-en-route-le-serveur-supabase) dans le README.

Il recueille aussi les **temps de résolution** de chaque jardin, pour remplacer peu à peu l'estimation « plus rapide que X % des joueurs » par les vrais temps (voir [Temps de résolution](#temps-de-résolution)).

## Vue d'ensemble

```
game.ts ── Social (online/social.ts) ── SocialBackend (online/backend.ts)
              │  file hors ligne            ├─ supabaseBackend (online/supabase.ts) ── RPC ── fonctions SQL
              │  (localStorage)             └─ demoBackend (online/demo.ts)          (supabase/migrations)
ui/league.ts (LeagueScreen) : cartes ligue, amis, profil, fin de semaine
online/points.ts : barème partagé (app, script des points, tests)
```

## Côté app

### Choix du backend ([social.ts](../src/online/social.ts))

À la construction de `Social` :

1. `?ligue=demo` dans l'adresse écrit `localStorage['gardendoku:social-demo'] = '1'` ; `?ligue=off` l'efface.
2. Si le drapeau démo est là → `demoBackend()` (import dynamique de [demo.ts](../src/online/demo.ts)), **même si un serveur est configuré**.
3. Sinon, si `VITE_SUPABASE_URL` et `VITE_SUPABASE_KEY` sont définies au build → `supabaseBackend(url, key)` (import dynamique : supabase-js n'est chargé que dans ce cas).
4. Sinon aucun backend : `social.enabled = false`, le badge de la ligue reste caché et rien n'est envoyé.

### Interface `SocialBackend` ([backend.ts](../src/online/backend.ts))

`connect()` (connexion anonyme la première fois, puis profil), `setProfile(name, avatar)`, `syncLevel(level)`, `submitSolve(kind, ref)` (`kind` : `'level'` avec le numéro du niveau, ou `'daily'` avec la date `YYYYMMDD`), `league()`, `friends()`, `addFriend(code)`, `removeFriend(id)`, `claimRewards()`. Les échecs sont des `Error` dont le message est un code court du serveur (`name_banned`, `friend_unknown`…).

[supabase.ts](../src/online/supabase.ts) traduit chaque méthode en appel RPC (`client.rpc('submit_solve', { p_kind, p_ref })`…) et convertit les JSON (`friend_code` → `friendCode`, `week_points` → `weekPoints`). La session anonyme est gardée par supabase-js dans `localStorage['gardendoku:auth']` (`persistSession`, `autoRefreshToken`).

### File hors ligne et envoi

- `recordSolve(kind, ref, level, ...)` ajoute le jardin résolu à la file `queue`, l'écrit dans `localStorage['gardendoku:social-queue']`, puis appelle `flush()`.
- `flush()` est **sérialisé** (chaîne de promesses `chain`) : connexion si besoin (`ready()`, réessayée à l'appel suivant après un échec), envoi du plus haut niveau atteint (`syncLevel`) s'il dépasse celui du profil, puis envoi des jardins **dans l'ordre**. Une erreur réseau arrête l'envoi ; le reste part au prochain `flush`. Un refus définitif (`PERMANENT` : `level_locked`, `daily_closed`, `bad_kind`, …) retire l'entrée de la file.
- `league()` et `friends()` font un `flush()` avant de lire, pour que le classement compte les derniers jardins.
- Le serveur ne compte un niveau qu'une fois : renvoyer un jardin déjà compté est sans danger (0 point).

### Ce que fait `Game` ([game.ts](../src/game.ts))

- `startOnline()` au démarrage (si `social.enabled`) : affiche le badge, retire `?ami` et `?ligue` de l'adresse, `syncLevel(maxLevel)`, `connect()` (qui vide la file), `claimRewards()` → `league.showResults(...)` (une carte par semaine terminée, et `hooks.reward` ajoute les indices et zones gagnés à la sauvegarde), suit une invitation `?ami=CODE`, met à jour le badge (rang de la semaine).
- `scoreWin()` après chaque victoire : envoie le jardin (`'daily'` avec `Number(key sans tirets)`, ou `'level'` avec l'index) et affiche « +N points » sur la carte de victoire quand le serveur a répondu.
- `skipLevel()` (niveau passé par vidéo) : ne fait que `syncLevel` + `flush` ; aucun point.
- `friendLink(code)` : lien `gardendoku://ami/CODE` reçu par l'app native ([native.ts](../src/native.ts)).

### Écrans ([ui/league.ts](../src/ui/league.ts))

`LeagueScreen` : onglets « Ligue » et « Amis », carte du profil (12 avatars de [avatars.ts](../src/ui/avatars.ts), pseudo), ajout d'un ami par code (saisie forcée en majuscules et alphanumérique), suppression, « Inviter un ami » (texte `league.inviteText` + lien `${VITE_PUBLIC_URL}/?ami=CODE` si la variable est définie, via `shareOrCopy`), cartes de fin de semaine enchaînées (`showResults` / `nextResult`). À la première ouverture, un joueur sans pseudo passe d'abord par le profil. Les erreurs sont affichées par `socialErrorText(e)` : table `MESSAGES` (code → clé `error.*`), `error.anonymous` si le message parle d'« anonymous » (connexions anonymes désactivées sur le projet), `error.offline` sinon.

### Barème ([points.ts](../src/online/points.ts))

```ts
levelPoints(info) = (info.wrap ? 4 : info.hex ? 2 : 1) + (info.cells >= BIG_GARDEN ? 1 : 0); // BIG_GARDEN = 100
DAILY_POINTS = 3; LEAGUE_SIZE = 20; LEAGUE_PRIZES = [{3 zones, 5 indices}, {1, 3}, {1, 0}, {0, 2}, {0, 1}];
```

Ces valeurs sont **dupliquées en SQL** : `LEAGUE_SIZE` dans `join_league` (`size < 20`), `DAILY_POINTS` dans `submit_solve` (`v_points := 3`), `LEAGUE_PRIZES` dans `claim_rewards` (deux `case`), `levelPoints` dans la table `level_points`. Les tests de [online.test.ts](../tests/online.test.ts) comparent le serveur aux constantes TypeScript ; changer l'un sans l'autre les fait échouer.

### Mode démo ([demo.ts](../src/online/demo.ts))

`?ligue=demo` : une ligue de 19 joueurs inventés (noms de plantes, avatars et niveaux tirés de seeds stables pour la semaine, points qui montent au fil de la semaine), trois amis (Margot, Théo, Inès), code ami `DEMO42`, carte de fin de semaine montrée une fois (2e place). L'état du joueur (pseudo, points, jardins comptés, amis ajoutés) est dans `localStorage['gardendoku:demo-social']`. Chaque réponse arrive après 250 ms pour imiter le réseau. `?ligue=off` pour revenir au comportement normal.

## Côté serveur ([supabase/migrations/](../supabase/migrations/))

Les migrations sont appliquées **dans l'ordre des noms** (horodatage en tête). Une migration déjà appliquée sur le serveur **ne doit jamais être modifiée** : tout changement passe par un nouveau fichier.

| Fichier | Contenu |
| --- | --- |
| `20261027000000_social.sql` | Schéma complet : tables, mots interdits, fonctions, droits. |
| `20261027000100_level_points.sql` | Table des points (générée). |
| `20261028000000_no_daily_cap.sql` | `submit_solve` sans plafond de points par jour (la 1re version s'arrêtait à 60). |
| `20261028000100_level_points.sql`, `20261031000000_level_points.sql`, `20261031000100_level_points.sql` | Tables des points régénérées après des changements de génération. Chacune vide la table (`truncate`) puis la remplit : seule la dernière compte. |
| `20261031000200_solve_times.sql` | Temps de résolution : table `solve_times`, fonction `record_time` (voir [Temps de résolution](#temps-de-résolution)). |

### Tables (toutes dans `public`, RLS activée, aucune politique)

| Table | Contenu |
| --- | --- |
| `profiles` | `id` (= `auth.users.id`), `name` (vide tant que non choisi), `avatar` (0..11), `level` (plus haut niveau débloqué), `friend_code` (unique), `points_day` / `points_today` (inutilisés depuis la suppression du plafond, gardés pour un éventuel retour), `created_at`. |
| `level_points` | `level` → `points`, rempli par les migrations générées. |
| `solves` | Un jardin compté : `(player, kind, ref)` clé primaire, `points`, `week`, `solved_at`. C'est ce qui empêche de compter deux fois. |
| `leagues` | `id`, `week` (lundi), `size`. |
| `league_members` | `(week, player)` clé primaire, `league`, `points`, `reached_at` (départage des égalités : le premier arrivé au score passe devant). |
| `friendships` | Une ligne par paire, `a < b`. |
| `rewards_claimed` | `(player, week)` : cadeaux déjà distribués. |
| `banned_words` | `word`, `whole` (mot entier seulement, ou sous-chaîne). |

### Fonctions

Aides internes (non appelables par l'app) : `week_of(t)` (lundi de la semaine, heure de Paris), `name_key(p)` (minuscules ASCII, accents repliés, chiffres sosies `0→o 1→i 3→e 4→a 5→s 7→t`, `@→a`, `$→s`, `€→e`), `name_is_banned(p)`, `profile_json`, `me()` (l'appelant, ou `not_signed_in` / `no_profile`), `join_league(player, week)`, `league_rows(league, me)`.

Fonctions de l'app (`security definer`, `set search_path = public`, exécutables par `authenticated` seulement) :

| Fonction | Rôle et erreurs |
| --- | --- |
| `ensure_profile()` | Crée le profil au premier appel avec un code ami de 6 caractères tirés de `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (sans 0/O ni 1/I), réessaie en cas de collision ; renvoie le profil. |
| `set_profile(p_name, p_avatar)` | Pseudo nettoyé (espaces) de 3 à 16 caractères (`name_length`), lettres (accents compris), chiffres, espace, `_ ' . -` (`name_chars`), filtre de mots (`name_banned`), avatar 0..11 (`bad_avatar`). |
| `sync_level(p_level)` | `level = greatest(level, least(p_level, 100000))`. |
| `submit_solve(p_kind, p_ref)` | Niveau : refusé au-delà de `level + 1` (`level_locked`), points lus dans `level_points` (au-delà de la table : 4 si `p_ref % 5 = 0`, sinon 1). Défi du jour : la date doit être hier, aujourd'hui ou demain à Paris (`daily_closed`), 3 points. Autre : `bad_kind`. Déjà compté : 0 point. Sinon entre dans la ligue de la semaine (`join_league`), ajoute les points, met `reached_at` à maintenant, monte `level`. Renvoie `{ points, week_points }`. |
| `get_league()` | `{ week_end, members }` : membres de la ligue de l'appelant (vide avant son premier jardin de la semaine), classés par points, puis `reached_at`. |
| `get_friends()` | L'appelant et ses amis, avec leurs points de la semaine. |
| `add_friend(p_code)` | Code nettoyé et mis en majuscules ; `friend_unknown`, `friend_self`, `friend_limit` (100 amis). |
| `remove_friend(p_id)` | Supprime la paire. |
| `claim_rewards()` | Pour chaque semaine terminée de l'appelant pas encore réclamée : rang, taille de la ligue, points, cadeau (rien sous la 5e place ni avec 0 point), enregistré dans `rewards_claimed`. Renvoie la liste. |

### Semaines et ligues

- Une semaine va du lundi 0 h au dimanche minuit, **heure de Paris** (`week_of`). Le client, lui, date le défi du jour en heure locale ; le serveur accepte donc un jour d'écart de chaque côté.
- On entre dans une ligue avec son premier jardin compté de la semaine : la plus ancienne ligue de la semaine qui a moins de 20 membres (`for update skip locked` pour les appels simultanés), sinon une nouvelle.
- Les cadeaux sont distribués à la demande (`claim_rewards` au lancement suivant de l'app), pas par une tâche planifiée.

### Modèle de sécurité

- **Les tables sont fermées** : RLS activée sans aucune politique, et `revoke all on all tables in schema public from anon, authenticated`. La clé publique (`VITE_SUPABASE_KEY`) ne donne donc accès à aucune ligne.
- **Seules 9 fonctions sont ouvertes**, et seulement au rôle `authenticated` (un joueur connecté, anonyme compris) : `revoke execute on all functions ... from public, anon, authenticated` puis `grant execute` ciblé.
- Ces fonctions sont `security definer` : elles s'exécutent avec les droits de leur propriétaire (donc lisent et écrivent les tables) et identifient l'appelant par `auth.uid()` (via `me()`). `set search_path = public` empêche qu'un schéma tiers détourne les noms.
- **Le serveur ne croit pas l'app** : les points viennent de `level_points`, un niveau non atteint est refusé, un jardin ne compte qu'une fois. Il ne vérifie pas en revanche que le jardin a vraiment été résolu (piste notée dans le README).

> **Piège pour toute nouvelle migration** : le `revoke ... on all functions` / `on all tables` du premier fichier ne s'applique qu'aux objets **existants à ce moment-là**. PostgreSQL donne par défaut `EXECUTE` à `PUBLIC` sur toute nouvelle fonction, et Supabase donne par défaut des droits à `anon` et `authenticated` sur les nouvelles tables de `public`. Chaque migration qui crée une table doit donc activer la RLS (et révoquer les droits), et chaque fonction créée ou recréée doit être suivie de `revoke execute on function ... from public, anon;` et `grant execute on function ... to authenticated;` (comme le fait [20261028000000_no_daily_cap.sql](../supabase/migrations/20261028000000_no_daily_cap.sql)). Une aide interne ne doit recevoir aucun `grant`.

## Table des points des niveaux

Le serveur lit les points d'un niveau dans `level_points`, générée depuis le jeu lui-même par [scripts/level-points.ts](../scripts/level-points.ts) :

```bash
npm run level-points   # vite-node scripts/level-points.ts
```

Le script calcule `levelPoints(levelInfo(n))` pour `n = 1..LEVEL_POINTS_COUNT` (5 000) et écrit une nouvelle migration nommée avec la date et l'heure (`OUT`) (`truncate public.level_points;` puis un `insert` de 20 valeurs par ligne).

**Quand le régénérer** : chaque fois que la génération change ce que vaut un niveau, c'est-à-dire qu'un niveau change de type (difficile, hexagonal) ou passe le seuil de 100 parcelles : tableaux de [levels.ts](../src/core/levels.ts) (`SET_HEX`, `HEX_CHANCE`, `BANDS`, `FIXED_SHAPES`, échelles…), formes, ordre des tirages, ou barème de [points.ts](../src/online/points.ts). Dans le doute, régénérer et comparer avec le fichier précédent.

**Comment** :

1. Dans [level-points.ts](../scripts/level-points.ts), changer `OUT` pour un **nouveau** nom horodaté, postérieur à toutes les migrations existantes (`supabase/migrations/AAAAMMJJHHMMSS_level_points.sql`). Ne jamais réécrire un fichier déjà appliqué : le serveur ne le rejouerait pas.
2. `npm run level-points`.
3. `npm test` : [online.test.ts](../tests/online.test.ts) applique toutes les migrations dans l'ordre et vérifie que la table correspond au jeu pour les 300 premiers niveaux.
4. Appliquer la migration sur le serveur (`npx supabase db push`, ou coller le fichier dans le *SQL Editor*).

## Variables d'environnement

Lues par Vite **au moment du build** (`import.meta.env`) et incluses dans le bundle : elles sont publiques par nature. Le fichier `.env` (et `.env.local`) est ignoré par git ; ne pas le versionner.

| Variable | Lue dans | Rôle |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | [social.ts](../src/online/social.ts) | Adresse du projet Supabase (`https://<projet>.supabase.co`). |
| `VITE_SUPABASE_KEY` | [social.ts](../src/online/social.ts) | Clé publique (publishable ou anon). |
| `VITE_PUBLIC_URL` | [league.ts](../src/ui/league.ts) | Facultative : adresse de la version web, pour le lien des invitations. |

Sans les deux premières, la ligue est cachée. Après un changement de `.env`, relancer `npm run dev` ou refaire le build (`npm run sync` pour les apps).

## Mettre en route un nouveau projet Supabase

1. Créer le projet sur supabase.com.
2. *Authentication › Sign In / Providers* : activer **Allow anonymous sign-ins** (sinon l'app affiche `error.anonymous`).
3. Appliquer **toutes** les migrations dans l'ordre : `npx supabase link` puis `npx supabase db push`, ou coller chaque fichier dans le *SQL Editor* (dans l'ordre des noms).
4. Créer `.env` à la racine avec les variables ci-dessus.
5. `npm run dev` pour essayer (le badge à la coupe apparaît sur l'accueil), puis `npm run build` / `npm run sync`.

## Tests du serveur ([online.test.ts](../tests/online.test.ts))

Les migrations tournent sur un vrai PostgreSQL embarqué, **PGlite** (`@electric-sql/pglite`), sans Docker ni réseau :

- `AUTH_STUB` imite Supabase Auth : rôles `anon` et `authenticated`, schéma `auth`, table `auth.users`, et `auth.uid()` qui lit le réglage `request.jwt.claim.sub` (comme sur Supabase).
- `beforeAll` applique **tous** les fichiers de `supabase/migrations` dans l'ordre alphabétique.
- `newPlayer()` crée un utilisateur et son profil ; `call(player, fn, ...args)` règle `request.jwt.claim.sub` puis appelle `public.fn(...)` ; `failure(...)` renvoie le message d'erreur ; `endWeek()` recule toutes les semaines de 7 jours pour simuler la fin de semaine.
- Cas couverts : profils et codes amis ; filtre de pseudos (longueur, caractères, mots grossiers avec accents et chiffres, faux positifs comme « Constance ») ; barème (niveau compté une fois, `level_locked`, points tirés de la table, table conforme au jeu, défi du jour, pas de plafond) ; ligues de 20 et classement ; cadeaux des 5 premiers distribués une seule fois ; amis dans les deux sens ; accès fermé aux tables et aux aides avec `set role authenticated` ; refus d'un appel non connecté.

Quelques tests supposent des niveaux précis : le niveau 4 hexagonal (2 points), le niveau 10 à bords reliés (4), et les niveaux 1, 2, 3, 5, 6, 7 à 1 point. Si la progression des premiers niveaux change, il faut les adapter.

Les migrations doivent rester compatibles avec PGlite (PostgreSQL standard, plpgsql, sans extension particulière).

## Temps de résolution

But : connaître peu à peu les vrais temps des joueurs, pour afficher un vrai rang et pour recaler l'estimation de [core/timing.ts](../src/core/timing.ts) (voir [levels.md](levels.md), « Modèle de temps »).

### Côté serveur ([20261031000200_solve_times.sql](../supabase/migrations/20261031000200_solve_times.sql))

- **Table `solve_times`** : un temps par joueur et par jardin, clé `(player, kind, ref, generator)`.
  - `kind` vaut `'level'` ou `'daily'`, `ref` est le numéro du niveau ou le jour du défi (`YYYYMMDD`).
  - `generator` est `GENERATOR_VERSION` : après un changement de génération, le même numéro est un autre jardin, et ses temps repartent de zéro.
  - Colonnes : `seconds` (1 à 86 400), `moves`, `hints`, `zones`, `at`.
  - `score` est une colonne calculée, `seconds + 25 × (hints + 3 × zones)`, la même pénalité que dans l'app.
  - Index `(kind, ref, generator, score)`. RLS activée, aucune politique, aucun droit pour `anon` ni `authenticated` : on n'y accède que par la fonction.
- **Fonction `record_time(p_kind, p_ref, p_generator, p_seconds, p_moves, p_hints, p_zones)`** (`security definer`, exécutable par `authenticated` seulement) :
  - insère le temps avec `on conflict do nothing` : seul le **premier** passage compte, car un jardin rejoué va bien plus vite ;
  - renvoie `{ players, faster_than }` : le nombre d'**autres** joueurs qui ont un temps sur ce jardin, et la part d'entre eux dont le `score` est plus grand (1 à 99) ;
  - `faster_than` vaut `null` tant qu'il y a moins de `time_rank_min()` autres joueurs (20).
- Erreurs : `bad_kind` (genre inconnu) et `bad_time` (temps hors limites, nombre négatif). Toutes deux sont définitives : l'app retire l'entrée de la file.

### Côté app

- [backend.ts](../src/online/backend.ts) : types `SolveTime` (`seconds`, `moves`, `hints`, `zones`, `generator`) et `TimeRank` (`players`, `fasterThan`), méthode `recordTime(kind, ref, time)`. Dans [supabase.ts](../src/online/supabase.ts), elle appelle la RPC ; la démo ([demo.ts](../src/online/demo.ts)) renvoie toujours `{ players: 0, fasterThan: null }`.
- [social.ts](../src/online/social.ts) : chaque entrée de la file hors ligne peut porter un champ `time` (les files enregistrées avant cette version n'en ont pas). `flush()` envoie `submitSolve` puis, s'il y a un temps, `recordTime`, et rend une `Map` de `SolveResult` (`scored`, `rank`). Si l'envoi du temps échoue faute de réseau, l'entrée reste en file : au prochain essai, `submit_solve` renvoie 0 point (un jardin ne compte qu'une fois) et le temps part.
- [game.ts](../src/game.ts), `scoreWin()` : envoie `{ seconds: elapsed, moves, hints, zones, generator: GENERATOR_VERSION }`. Si le serveur renvoie un `fasterThan`, il remplace le rang estimé (`lastWin.rank`, `stats.bestFasterThan`) et la ligne de la carte de victoire (`Hud.setWinRank`), même si la carte est déjà ouverte.

### Exploiter les données

Quelques requêtes à lancer dans le *SQL Editor* :

```sql
-- Jardins les plus joués, avec médiane et quartiles des temps (en secondes, pénalités comprises).
select kind, ref, generator, count(*) as joueurs,
       percentile_cont(0.25) within group (order by score) as q1,
       percentile_cont(0.5)  within group (order by score) as mediane,
       percentile_cont(0.75) within group (order by score) as q3
from solve_times
group by kind, ref, generator
having count(*) >= 20
order by joueurs desc;

-- Écart-type du logarithme des temps (à comparer avec TIME_SPREAD = 0.95).
select kind, ref, stddev(ln(score)) as sigma
from solve_times where generator = 9
group by kind, ref having count(*) >= 20;
```

Pour recaler l'estimation, comparer ces médianes avec `timeModel(buildLevel(n)).median` (même formule que dans [levels.md](levels.md)), puis ajuster les constantes de `timing.ts`. Le seuil de 20 joueurs se change dans `time_rank_min()`, par une nouvelle migration.
