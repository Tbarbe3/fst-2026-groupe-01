# Code How?

## Pour qui ?

* **Cible principale :** Développeurs juniors et intermédiaires (1 à 4 ans d'expérience).
* **Objectif :** Progresser sur la relecture critique de code (*code review*), la sécurité logicielle et les bonnes pratiques d'architecture.

---

## Problème

* **Manque d'esprit critique face au code généré par IA :** Les développeurs prennent l'habitude d'approuver machinalement les suggestions des assistants de code sans détecter les failles logiques, de sécurité ou de performance discrètes.
* **Asymétrie d'apprentissage :** L'écosystème apprend activement à écrire du code, mais très peu à lire, auditer et critiquer le code d'autrui — compétence pourtant centrale en équipe.
* **Absence d'outils d'entraînement interactifs :** Les plateformes existantes (type LeetCode) testent l'écriture algorithmique brute, jamais la posture de relecteur ni la communication technique lors d'une Pull Request (PR).
* **Manque de feedback constructif :** En entreprise, les juniors reçoivent peu de retours sur la pertinence de leurs commentaires de revue par manque de disponibilité des profils seniors.

---

## Parcours utilisateur

L'interface est disponible en français et en anglais (drapeau dans la barre de navigation pour les visiteurs, paramètres du compte une fois connecté), en thème clair ou sombre. Les scénarios et les retours du juge sont rédigés dans la langue de l'interface.

### 1. Accueil (/)
* Présentation du concept, démo interactive d'une revue de code, langages couverts et méthode.

### 2. Authentification (/login, /register)
* Inscription et connexion par e-mail et mot de passe (Better Auth), session persistée par cookie.
* Politique de mot de passe : 8 caractères minimum, avec minuscule, majuscule, chiffre et symbole.

### 3. Tableau de bord (/dashboard)
* Lanceur de challenge filtrable par :
  * **Langage :** TypeScript, Python, Go, Java, PHP, Rust, C#.
  * **Difficulté :** niveaux 1 à 5 (1 : faute de syntaxe, 2 : bug évident, 3 : anomalie visible, 4 : anomalies cachées, 5 : expert).
  * **Type d'erreur :** Sécurité (OWASP), Performance, Robustesse/Architecture, Concurrence, Logique métier.
* **Mode Mystère :** tire au hasard le langage, la difficulté et le type d’erreur ; la difficulté et le type restent masqués jusqu’au débriefing.
* Historique des revues regroupé par catégorie, courbe de progression, statistiques (nombre, moyenne, meilleure et dernière note).
* **Rang d'auditeur**, selon le nombre de revues terminées : Novice (0), Apprenti (5), Confirmé (10), Senior (20).
* Paramètres du compte : photo, pseudo, mot de passe, langue, thème et suppression définitive du compte (confirmée par mot de passe).

### 4. Revue de code façon GitHub PR (/review/:challengeId)
* **Contexte métier :** faux ticket expliquant l'intention de la PR, et persona de l'auteur.
* **Diff viewer :** fichiers modifiés, ajouts et suppressions signalés par la couleur et par les symboles `+` / `−`.
* **Commentaires inline :** clic sur une ligne (ou sur son bouton `+`) pour rédiger une remarque, modifiable et supprimable. Les brouillons survivent à un rechargement.
* Guide en quatre étapes, panneau d'aide ouvert d'office à la première partie, et confirmation avant d'approuver une PR sans aucune remarque.

### 5. Débriefing (/review/:challengeId/result)
* Note sur 100 décomposée : anomalies trouvées, qualité des explications, précision (faux positifs).
* Pour chaque anomalie attendue : statut trouvée / manquée, remarque du joueur, avis du juge et correctif attendu sous forme de diff.
* Remarques hors cible listées à part ; résultat conservé dans l'historique.

---

## Données

User (1) ───────────< ReviewAttempt (N) >─────────── (1) Scenario
                             │                               ^
                             v (1:N)                         │ (créé par)
                       UserComment (N)                   User (0..1)

* **User** (table `user` de Better Auth, accompagnée de `session`, `account` et `verification`)
  * `id` (text, clé primaire)
  * `name` (pseudo), `email` (unique), `image` (photo de profil en data URL)
  * `created_at`, `updated_at`

* **Scenario** (généré par l'IA au premier besoin, puis réutilisé pour les autres joueurs) :
  * `id` (UUID, clé primaire)
  * `created_by_user_id` (FK nullable vers User)
  * `title`, `ticket_context`
  * `language` (typescript, python, go, java, php, rust, csharp)
  * `difficulty` (SMALLINT de 1 à 5)
  * `error_category` (enum : security_owasp, performance, architecture, race_condition, business_logic)
  * `locale` (fr | en : langue de rédaction des textes, celle de l'interface du joueur)
  * `persona` (JSONB : `{"name", "archetype", "bio"}`)
  * `diff_content` (JSON sérialisé des fichiers et lignes du diff, numéros de ligne calculés par le serveur)
  * `ground_truth` (JSONB : anomalies attendues avec fichier, lignes, criticité, explication et correctif)
  * `source` (`ai` ou `seed` pour le catalogue de repli), `model`
  * `created_at`

* **ReviewAttempt** (une partie d'un joueur sur un scénario) :
  * `id`, `user_id`, `scenario_id`
  * `status` (`in_progress` | `submitted`), `is_mystery`
  * `score` (0 à 100), `score_breakdown` (JSONB : trouvées, total, faux positifs, qualité des explications, détail des points)
  * `ai_summary` (synthèse du juge), `judged_by` (`ai` | `heuristic`)
  * `created_at`, `submitted_at`

* **UserComment** (remarques soumises lors d'une partie) :
  * `id`, `attempt_id`, `file_path`, `line_number`, `user_text`
  * `matched_ground_truth`, `matched_issue_id` (anomalie reconnue, ou null pour un faux positif)
  * `clarity_score` (0 à 100), `eval_feedback` (avis du juge)

Supprimer un compte supprime en cascade ses parties et ses remarques ; les scénarios qu'il a fait générer restent disponibles pour les autres joueurs.

---

## Brique IA

Code dans `backend/src/ai/`. Sans `GEMINI_API_KEY`, l'API tourne en **mode simulé** : scénarios tirés d'un catalogue écrit à la main en français et en anglais (`mock-catalog.ts`), juge sans IA, aucun jeton consommé.

### Brique 1 : le générateur de scénario

* **Rôle :** rédiger le ticket et le persona, produire un diff réaliste contenant les anomalies demandées et la ground truth de référence.
* **Modèle :** Gemini 2.5 Flash (`GEMINI_MODEL_GENERATOR`), sortie JSON contrainte par schéma.
* **Entrées :** langage, niveau de 1 à 5 (avec un guide par niveau : du point-virgule manquant au niveau 1 jusqu'aux anomalies visibles seulement à l'exécution au niveau 5), catégorie d'erreur, langue de rédaction.
* **Sortie :** fichiers découpés en blocs de lignes typées (`context`, `add`, `delete`), chaque ligne fautive portant un `issue_ref` vers une anomalie. Le modèle ne donne aucun numéro de ligne absolu : le serveur les calcule, un LLM comptant mal.

      {
        "title": "PR #142: Receiving Stripe webhooks",
        "ticket_context": "[PAY-218] When a customer completes a payment…",
        "persona": { "name": "Jordan", "archetype": "rushed_junior", "bio": "Ships fast…" },
        "files": [{ "path": "src/routes/stripe-webhook.ts", "hunks": [{ "start_line": 1, "lines": [
          { "kind": "add", "text": "  const event = req.body", "issue_ref": "I1" }
        ] }] }],
        "issues": [{ "id": "I1", "type": "security_owasp", "severity": "critical",
          "expected_issue": "…", "why": "…", "ideal_fix": "…", "fixed_lines": ["…"] }]
      }

* **Validation :** `scenario-builder.ts` refuse une sortie incohérente (anomalie sans ligne, ligne fautive hors des lignes ajoutées, commentaire de code qui trahit la réponse, diff trop long…).
* **Repli :** une seconde tentative plus froide (température 0,9 puis 0,4), puis le catalogue statique.

### Brique 2 : le juge évaluateur

* **Rôle :** juger la justesse et la clarté des explications du joueur.
* **Modèle :** Gemini 2.5 Flash (`GEMINI_MODEL_JUDGE`), température 0, sortie JSON contrainte.
* **Économie de jetons :** le juge ne reçoit pas le diff, seulement la ground truth et, pour chaque remarque, la ligne commentée et son texte.
* **Garde-fous :**
  * La détection est décidée par le serveur (même fichier, ±2 lignes) : le juge ne peut valider qu'une anomalie candidate, jamais en inventer une. Une injection de prompt dans un commentaire ne transforme donc pas un faux positif en trouvaille.
  * La note est calculée par le serveur, jamais par le modèle : détection pondérée par la criticité (60 points), clarté des explications (30), précision (10, −5 par faux positif).
* **Sortie :** une synthèse et, par remarque, `matched_issue_id`, `clarity_score` et `feedback`, dans la langue du joueur.
* **Repli :** heuristique par lignes seule (clarté forfaitaire), signalée sur le débriefing. Une revue vide n'appelle pas le juge.

---

## Stack technique

* **Frontend :** React 19 + Vite + TypeScript, React Router, CSS natif avec variables (thèmes clair et sombre), découpé par écran dans `frontend/src/styles/`, courbe de progression en SVG maison (lisible au clavier, valeurs reprises dans un tableau pour les lecteurs d’écran), i18n maison français / anglais (`frontend/src/i18n/`). Le diff viewer est un composant maison, accessible au clavier. Les pages lourdes (tableau de bord, revue, débriefing) sont chargées à la demande. Vite plutôt que Next.js : l'API vivant dans un service Fastify distinct, le SSR n'apporterait qu'un second runtime Node à déployer et la tentation de disperser la logique métier dans des route handlers.
* **API Backend :** Node.js avec Fastify en TypeScript, pour une empreinte mémoire réduite et une conteneurisation directe. Authentification par Better Auth, limitation de débit sur l'authentification et la génération de scénarios. Les erreurs métier renvoient un `code` stable que le front traduit.
* **Tests :** Vitest des deux côtés (Testing Library côté front). Un test vérifie que les dictionnaires français et anglais déclarent les mêmes clés et les mêmes paramètres.
* **Base de données :** PostgreSQL (gestion relationnelle native des comptes et tentatives, colonnes JSONB pour la ground truth et les résultats).
* **Hébergement :** Stack conteneurisée via Docker Compose (API Node.js, PostgreSQL, et Nginx pour servir le bundle statique) déployée sur VPS dédié, derrière un Traefik mutualisé qui assure le reverse proxy et les certificats Let's Encrypt.

### Organisation du dépôt

    fst-2026-groupe-01/
    ├── frontend/                 # React + Vite + TS — port 5173
    │   ├── Dockerfile            # build Vite → Nginx (image de prod)
    │   └── nginx.conf            # fallback SPA + cache des assets
    ├── backend/                  # Fastify + TS — port 3000, routes préfixées /api
    │   ├── src/ai/               # générateur, juge, scoring, catalogue simulé
    │   ├── sql/                  # scripts SQL rejoués au démarrage de l'API
    │   └── Dockerfile            # build multi-étapes, exécution non-root
    ├── scripts/
    │   ├── check-setup.mjs       # vérifie que le poste est prêt (npm run check)
    │   ├── check-contrast.mjs    # contrastes WCAG de la palette
    │   └── create-db-tunnel-user.sh   # compte SSH restreint pour accéder à la base
    ├── docker-compose.yml        # stack unique, profils `dev` et `prod`
    ├── package.json              # raccourcis de dev — pas un workspace
    ├── .env.example
    └── README.md

Les deux projets sont indépendants : chacun a son `package.json` et son `node_modules`, il n'y a pas de workspace racine. En développement, Vite relaie `/api` vers `http://localhost:3000`, ce qui évite au front de manipuler une URL absolue et supprime le CORS.

Un seul `docker-compose.yml` sert les deux environnements, via les profils Compose :

| Service | Profil | Rôle |
|---|---|---|
| `postgres` | *(toujours)* | La base, dans les deux modes |
| `adminer` | `dev`, `prod` | Interface web d'inspection de la base |
| `backend` | `prod` | API conteneurisée derrière Traefik |
| `frontend` | `prod` | Bundle Vite servi par Nginx |

En dev, on ne conteneurise volontairement pas le front et l'API : `npm run dev` garde le hot reload, qu'un rebuild d'image ferait perdre à chaque sauvegarde.

### Démarrage

Une seule fois après le clone :

    npm run setup                # installe les dépendances des trois niveaux
    cp .env.example .env
    cp backend/.env.example backend/.env    # puis y mettre le mot de passe du serveur
    docker network create web    # réseau de Traefik ; sur le VPS il existe déjà

Ensuite, au quotidien, **une seule commande** :

    npm run dev

Elle démarre le tunnel SSH, l'API et le front dans un terminal unique, avec des sorties préfixées et colorées. `Ctrl+C` arrête les trois d'un coup — le tunnel compris, qui sinon resterait ouvert en arrière-plan.

Un `npm run check` s'exécute au préalable et signale ce qui manque. C'est ce qui évite le symptôme trompeur du démarrage sur un poste non initialisé : l'API sort aussitôt faute de `backend/.env`, les autres services reçoivent un `SIGTERM`, et la sortie n'affiche que `tunnel exited with SIGTERM` — un message qui désigne la victime, pas la cause.

| Commande | Effet |
|---|---|
| `npm run dev` | Tunnel + API + front |
| `npm run dev:local` | API + front seuls, sur une base locale |
| `npm run dev:tunnel` | Le tunnel seul |
| `npm run dev:api` / `dev:web` | Un service isolé |
| `npm run db:up` / `db:down` | Base locale jetable (profil `dev`) |
| `npm run check` | Vérifie que le poste est prêt (`.env`, dépendances) |
| `npm run check:contrast` | Valide les contrastes WCAG de la palette |
| `npm test` | Exécute les suites Vitest du backend et du frontend |
| `TEST_DATABASE_URL=… npm --prefix backend test` | Ajoute les tests d’intégration SQL, sur une base **jetable** (ses tables sont vidées) |
| `npm run build` | Compile backend puis frontend |
| `npm run typecheck` | Vérifie les types des deux projets |

Le `package.json` de la racine n'existe que pour ces raccourcis : il ne déclare aucune dépendance applicative et **n'est pas un workspace**. `frontend/` et `backend/` gardent leur `package.json` et leur `node_modules` propres, et restent utilisables indépendamment.

Le choix de npm plutôt que d'un `Makefile` est délibéré : `make` n'est pas disponible par défaut sous Windows, alors que npm est déjà requis par les deux projets. Les raccourcis fonctionnent donc à l'identique sous Windows et sous Linux.

L'équipe partage la base du serveur, il n'y a donc pas de conteneur Postgres à démarrer au quotidien — voir la section suivante. Pour travailler hors ligne ou tester une migration destructrice, `npm run db:up` fournit une base locale jetable ; il faut alors adapter `DATABASE_URL` dans `backend/.env` et lancer `npm run dev:local`.

### Schéma et migrations

En attendant l'ORM, `backend/sql/*.sql` est appliqué dans l'ordre alphabétique **au démarrage de l'API**, dans une transaction par fichier. Chaque fichier est rejoué à chaque boot, donc tout doit rester idempotent — `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`.

`001_schema.sql` décrit l'état complet de la base (tables Better Auth et tables du jeu) : il crée tout sur une base neuve et ne fait rien sur une base déjà à jour. Pour faire évoluer le schéma, ajouter un fichier numéroté idempotent, puis répercuter le changement dans `001_schema.sql` une fois appliqué partout.

### Routage du frontend

React Router (`createBrowserRouter`), configuré dans `frontend/src/router.tsx` :

| Route | Page | Accès |
|---|---|---|
| `/` | `Home` (page d'accueil) | Tous |
| `/login`, `/register` | `AuthPage` | Visiteurs seulement |
| `/dashboard` | `Dashboard` | Authentifié |
| `/review/:challengeId` | `Review` | Authentifié |
| `/review/:challengeId/result` | `ReviewResult` | Authentifié |
| `*` | `NotFound` | — |

Toutes les pages partagent la même barre de navigation et le même pied de page (`SiteLayout`). Pour un visiteur, la barre propose les sections de l'accueil, la langue et le thème ; une fois connecté, l'accueil, le tableau de bord et le compte. Deux gardes encadrent ces routes. `ProtectedRoute` redirige un visiteur non connecté vers `/login` en conservant la destination voulue dans `location.state`, et traite le cas d'une session reconnue mais sans utilisateur. `GuestRoute` écarte de `/login` un visiteur déjà authentifié.

Les liens profonds fonctionnent en production grâce au `try_files $uri $uri/ /index.html` de `frontend/nginx.conf` : sans lui, un rechargement sur `/dashboard` renverrait un 404 de Nginx. Les appels `/api` ne passent jamais par là, Traefik les route vers l'API avec une priorité supérieure.

### Authentification (Better Auth)

Les routes `/api/auth/*` sont servies par Better Auth (tables `user`, `session`, `account`, `verification`). Connexion par e-mail et mot de passe, changement de pseudo, de photo et de mot de passe, suppression du compte (`deleteUser`, confirmée par le mot de passe). La politique de mot de passe est appliquée côté serveur à l'inscription et au changement de mot de passe, et dupliquée côté front pour le confort.

Deux variables conditionnent son fonctionnement en production, et l'API **refuse de démarrer** si elles sont mal réglées :

| Variable | Rôle |
|---|---|
| `BETTER_AUTH_SECRET` | Signature des sessions. Sans elle, Better Auth utilise une valeur par défaut et les cookies deviennent falsifiables. `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | Origine **telle que le navigateur la voit** : `https://<DOMAIN>` en prod |

`BETTER_AUTH_URL` ne peut pas être déduite de la requête reçue. Traefik termine le TLS et transmet du HTTP clair au conteneur : l'API croirait être en HTTP et n'émettrait pas de cookies `Secure`. Pour la même raison, Fastify active `trustProxy` en production, afin de lire `X-Forwarded-Proto` au lieu du protocole de la connexion locale.

Un point joué en votre faveur : le front et l'API partagent le même domaine, l'API étant sous `/api`. Les cookies de session sont donc same-site, sans `SameSite=None` ni configuration CORS particulière — c'est le cas simple. Un sous-domaine `api.` séparé aurait demandé bien plus de réglages.

Changer `BETTER_AUTH_SECRET` invalide toutes les sessions en cours.

### Base partagée entre dev et prod

L'équipe travaille sur **une seule base**, celle du VPS : un seul jeu de données de test à maintenir, et le nettoyage se fait depuis Adminer en ligne. Il n'y a donc pas de base locale dans le flux de travail habituel.

Postgres n'étant pas exposé sur Internet, on y accède par un tunnel SSH. Chaque développeur utilise un compte `dbtunnel` dédié, qui ne peut rien faire d'autre que forwarder ce port — ni shell, ni terminal, ni autre destination.

**Ajouter un développeur** (une fois, en root sur le VPS) :

    sudo ./scripts/create-db-tunnel-user.sh "ssh-ed25519 AAAA... marie@portable"

**Travailler** (le tunnel occupe un terminal, `-N` ne rend pas la main) :

    ssh -N -L 5432:127.0.0.1:5432 dbtunnel@codehow.thomasbarbe.com

La base distante est alors sur `localhost:5432`, donc `DATABASE_URL` garde la forme d'une URL locale — seul le mot de passe change, c'est celui du `.env` du serveur.

**Conséquence à garder en tête :** il n'y a plus de filet. Une migration ratée ou un `DROP TABLE` pendant le développement touche les vraies données. Avant toute opération destructrice, `docker compose --profile dev up -d` démarre une base locale jetable pour tester d'abord.

### Les deux fichiers `.env`

Ils ne servent pas au même consommateur, d'où leur coexistence :

| Fichier | Lu par | Quand |
|---|---|---|
| `.env` (racine) | Docker Compose | Toujours — c'est lui qui initialise Postgres et alimente les conteneurs en prod |
| `backend/.env` | L'API lancée en natif (`npm run dev`) | Développement seulement |

En production, `backend/.env` n'intervient pas : le conteneur reçoit ses variables du bloc `environment:` du compose, et le `.dockerignore` l'exclut de l'image.

En développement, `DATABASE_URL` pointe vers le tunnel SSH, donc son mot de passe est celui du `.env` **du serveur**. Si l'on bascule ponctuellement sur la base locale jetable (`--profile dev`), c'est le `POSTGRES_PASSWORD` du `.env` de la racine qu'il faut y mettre à la place.

**Brique IA.** Sans `GEMINI_API_KEY`, l'API démarre en **mode simulé** (`AI_MODE=mock`) : scénarios tirés d'un catalogue écrit à la main (`backend/src/ai/mock-catalog.ts`), juge sans IA, latence imitée (`MOCK_LATENCY_MS`). Aucun jeton n'est consommé, ce qui permet de tester l'interface en conditions réelles. Avec une clé, Gemini est appelé ; `AI_MODE=mock` force le mode simulé malgré elle.

L'IA n'intervient qu'à deux moments d'une partie :

1. **Lancement du challenge**, et seulement si aucun scénario correspondant aux filtres et non encore joué n'existe en base. Le générateur produit un diff structuré, dont le serveur valide la cohérence et calcule les numéros de ligne. S'il échoue deux fois, on se replie sur le catalogue.
2. **Soumission de la revue** : un appel au juge, ou aucun si la revue est vide. La détection est décidée par le serveur (même fichier, ±2 lignes), le juge ne note que la clarté des explications, et la note est calculée côté serveur. En cas d'échec, une heuristique par lignes prend le relais.

Pendant la lecture du diff et la rédaction des commentaires, l'IA n'est jamais appelée.

### Inspecter la base

Il s'agit de la base du VPS, celle que l'équipe partage. Trois accès, du plus simple au plus direct.

**Adminer en ligne** — `https://<ADMINER_DOMAIN>`, depuis n'importe quel navigateur, sans rien installer. C'est la voie pour nettoyer les données de test. Deux authentifications successives :

1. Une fenêtre BasicAuth du navigateur, gérée par Traefik avant que la requête n'atteigne le conteneur. Le login et le mot de passe **en clair** correspondent à `ADMINER_BASIC_AUTH` — le hash stocké ne se saisit jamais.
2. Le formulaire Adminer : système `PostgreSQL`, serveur `postgres`, puis les identifiants Postgres du `.env` du serveur.

**Client graphique** (DataGrip, DBeaver, outil Base de données de WebStorm) — via le tunnel `dbtunnel`, sur `localhost:5432`. Utile pour éditer confortablement, exporter, ou suivre un plan d'exécution.

**psql sur le VPS** — pour qui a un compte sur le serveur :

    docker exec -it codehow-db psql -U codehow -d codehow

PostgreSQL n'est **pas** joignable par une URL : il parle son propre protocole binaire, pas HTTP. Traefik ne peut router que des applications web, d'où le passage obligé par Adminer ou par un tunnel.

Si le profil `dev` tourne en parallèle, sa base locale occupe déjà le port 5432 et le tunnel échouera. Dans ce cas, forwarder sur un autre port : `ssh -N -L 5433:127.0.0.1:5432 dbtunnel@codehow.thomasbarbe.com`, et se connecter sur `localhost:5433`.

### Déploiement (VPS + Traefik)

Traefik tourne déjà sur le serveur et expose le réseau Docker externe `web`. La stack s'y greffe sans publier de port accessible depuis Internet : Traefik seul écoute sur 80/443 et termine le TLS via le resolver Let's Encrypt `le`. Le seul port publié par le projet est celui de Postgres, lié à `127.0.0.1` et donc réservé au VPS lui-même.

Deux enregistrements DNS A doivent pointer sur le VPS **avant** le premier démarrage, sinon Let's Encrypt échoue au challenge : `DOMAIN` et `ADMINER_DOMAIN`.

    # Sur le VPS, à la racine du dépôt cloné
    cp .env.example .env
    nano .env               # cf. tableau ci-dessous
    docker compose --profile prod up -d --build

    # Vérifications
    docker compose --profile prod ps
    docker compose logs -f backend
    curl -s https://<DOMAIN>/api/health

Le `--profile prod` n'est pas optionnel : sans lui, seul `postgres` démarrerait, puisque c'est le seul service sans profil. **Il vaut aussi pour `down`** — `docker compose down` seul ne retire que `postgres` et laisse les autres conteneurs accrochés au réseau `internal`, qui refuse alors d'être supprimé :

    docker compose --profile prod down --remove-orphans

Pour `logs` en revanche il est inutile, nommer un service active son profil automatiquement.

**Ce qu'il faut renseigner dans le `.env` du serveur :**

| Variable | Valeur |
|---|---|
| `POSTGRES_USER`, `POSTGRES_DB` | `codehow`, inchangés |
| `POSTGRES_PASSWORD` | `openssl rand -hex 32` — voir la remarque ci-dessous |
| `DOMAIN` | Le domaine du site, sans `https://` ni slash final |
| `ADMINER_DOMAIN` | Le sous-domaine d'Adminer |
| `ADMINER_BASIC_AUTH` | Sortie de `htpasswd -nbB <login> '<mot de passe>'`, **avec les `$` doublés** |
| `BETTER_AUTH_SECRET` | `openssl rand -hex 32`. Obligatoire : l'API refuse de démarrer sans elle |
| `GEMINI_API_KEY` | Clé créée sur https://aistudio.google.com/apikey. Vide : mode simulé, sans IA ni coût |
| `AI_MODE` | Vide par défaut ; `mock` force le mode simulé même avec une clé |

Deux pièges à ce niveau, tous deux silencieux :

* **`-hex` et non `-base64`** pour le mot de passe Postgres. Il est réinjecté dans `DATABASE_URL` ; un `/` ou un `+` produit par base64 couperait l'URL et l'API ne se connecterait pas.
* **Doubler les `$` du hash bcrypt** dans le `.env` (`$2y$05$...` devient `$$2y$$05$$...`). Compose interpole les valeurs qu'il y lit et prendrait la fin du hash pour une variable à remplacer par du vide, ce qui livrerait un hash tronqué à Traefik.

Le mot de passe Postgres se fige au premier démarrage : il n'est lu qu'à l'initialisation du volume `postgres-data`. Le modifier dans `.env` ensuite reste sans effet, il faut passer par `ALTER USER`.

Mises à jour ultérieures :

    git pull && docker compose --profile prod up -d --build

Le volume `postgres-data` n'est pas touché par un rebuild, les données sont conservées.

**Routage.** Trois routeurs Traefik :

| Route | Service | Conteneur | Protection |
|---|---|---|---|
| `Host(DOMAIN) && PathPrefix(/api)` | Fastify, port 3000 | `codehow-api` | — |
| `Host(DOMAIN)` | Nginx, port 80 | `codehow-front` | — |
| `Host(ADMINER_DOMAIN)` | Adminer, port 8080 | `codehow-adminer` | BasicAuth Traefik |

Le routeur `/api` porte une `priority=100` pour passer devant celui du front. Le frontend appelle donc l'API en relatif (`fetch('/api/...')`) aussi bien en dev qu'en prod : aucune URL absolue dans le bundle, aucun CORS entre navigateur et API.

**Cloisonnement réseau.** `postgres` n'est **pas** sur le réseau `web` : elle vit sur un réseau `internal` propre au projet, joignable uniquement par `backend` et `adminer`. Sans cela, tout conteneur d'un autre projet partageant `web` pourrait ouvrir une connexion sur le port 5432.

Corollaire : `backend` et `adminer` sont sur deux réseaux, et Traefik ne devine pas lequel utiliser pour les joindre. Ils portent donc `traefik.docker.network=web`. Sans ce label, Traefik retient parfois leur adresse côté `internal`, auquel il n'est pas connecté — l'authentification passe, puis la requête expire en **Gateway Timeout**. `frontend`, qui n'est que sur `web`, n'en a pas besoin.

---

## Hors périmètre (Ce qu'on ne fait PAS en V1)

* **Pas de chat interactif multi-tours :** Aucun dialogue argumentatif en direct avec le persona pour défendre ou négocier son code (évite l'explosion des appels LLM).
* **Pas d'environnement d'exécution dynamique :** Pas de sandbox de test (Docker éphémère / WebAssembly) pour exécuter ou compiler le code revu.
* **Pas d'intégration directe aux plateformes externes :** Aucun branchement de webhooks GitHub, GitLab ou Bitbucket ; tout se déroule dans l'interface dédiée.
* **Pas de mode multijoueur synchrone ni de ligues compétitives en temps réel.**
