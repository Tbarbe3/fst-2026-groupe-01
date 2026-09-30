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

### 1. Écran d'authentification (/login, /register)
* Connexion par identifiant unique / mot de passe ou via OAuth GitHub.
* Création et persistance sécurisée de la session utilisateur.

### 2. Écran Hub & Sélection du challenge (/dashboard)
* Grille des challenges filtrables par :
  * **Langage :** TypeScript, Python, Go, Rust, Java, C#, PHP, etc.
  * **Difficulté :** Junior, Intermédiaire, Senior.
  * **Type d'erreur :** Sécurité (OWASP), Performance, Robustesse/Architecture, Accessibilité, Logique métier.
* **Bouton « Mode Mystère » (Aléatoire) :** Déclenche la génération d'un scénario sans dévoiler le niveau ni le type d'erreur au préalable pour forcer un audit à l'aveugle.
* Tableau de bord personnel avec courbe de progression temporelle et taux de réussite par catégorie.

### 3. Écran Revue de Code façon GitHub PR (/review/:challengeId)
* **Contexte métier :** Faux ticket Jira / GitHub Issue explicitant l'intention initiale de la PR.
* **Diff viewer :** Affichage des fichiers modifiés avec coloration syntaxique, ajouts en vert et suppressions en rouge.
* **Interaction inline :** Clic direct sur une ligne précise du diff pour ouvrir une zone de commentaire, formuler l'anomalie détectée et valider la soumission via un bouton *Submit Review*.

### 4. Écran Débriefing & Évaluation (/review/:challengeId/result)
* Note globale sur 100 décomposée en métriques claires (failles identifiées, faux positifs, précision de l'explication).
* Comparatif structuré :
  * Le commentaire formulé par l'utilisateur.
  * L'analyse critique du juge IA.
  * La solution attendue (*Ground Truth*) accompagnée du diff corrigé.
* Sauvegarde automatique des résultats dans l'historique du profil.

---

## Données

User (1) ───────────< ReviewAttempt (N) >─────────── (1) Scenario
                             │                               ^
                             v (1:N)                         │ (créé par)
                       UserComment (N)                   User (0..1)

* **User**
  * `id` (UUID, Clé primaire)
  * `username` (string, unique)
  * `password_hash` (string)
  * `created_at` (timestamp)

* **Scenario** (généré dynamiquement par l'IA au premier appel, puis stocké définitivement en base) :
  * `id` (UUID, Clé primaire)
  * `created_by_user_id` (UUID, FK nullable vers User)
  * `title` (string : ex. "Fix: Refactorisation du module de paiement et session")
  * `ticket_context` (text : description du ticket précisant l'objectif fonctionnel)
  * `language` (enum/string : typescript, python, go, rust, etc.)
  * `difficulty` (enum : junior, intermediate, senior)
  * `error_category` (enum : security_owasp, performance, architecture, race_condition, business_logic)
  * `persona` (JSON : {"name": "Kevin", "archetype": "junior_pressé", "bio": "Fait confiance aveuglément à Copilot"})
  * `diff_content` (text : patch Git unifié ou structure JSON des fichiers modifiés)
  * `ground_truth` (JSON : liste de contrôle des anomalies attendues avec localisation, criticité et correctif idéal)
  * `created_at` (timestamp)

* **ReviewAttempt** (historique d'une tentative sur un scénario) :
  * `id` (UUID, Clé primaire)
  * `user_id` (UUID, FK vers User)
  * `scenario_id` (UUID, FK vers Scenario)
  * `score` (integer : 0 à 100)
  * `score_breakdown` (JSONB : {"found_criticals": 1, "total_criticals": 1, "false_positives": 0, "reasoning_quality": 85})
  * `ai_summary` (text : synthèse pédagogique globale rédigée par l'évaluateur)
  * `created_at` (timestamp : horodatage garantissant le tracé de la courbe de progression)

* **UserComment** (détail des annotations soumises lors d'une tentative) :
  * `id` (UUID, Clé primaire)
  * `attempt_id` (UUID, FK vers ReviewAttempt)
  * `file_path` (string)
  * `line_number` (integer)
  * `user_text` (text : explication rédigée par l'utilisateur)
  * `matched_ground_truth` (boolean : validation de la ligne par le juge)
  * `eval_feedback` (text : appréciation spécifique sur la pertinence de l'argumentaire)

---

## Brique IA

### Brique 1 : Le Générateur de Scénario (Création du challenge)

* **Rôle / Usage :** Rédige le contexte du ticket, produit un diff réaliste contenant 1 à 3 anomalies ciblées et formalise la Ground Truth de référence.
* **Modèle :** Gemini 2.5 Flash.
* **Entrées :**
  * Langage choisi (ex. TypeScript)
  * Niveau de difficulté (ex. Junior)
  * Thématique / Catégorie d'erreur (ex. Sécurité OWASP) ou flag `random=true` (Mode Mystère)
  * Archétype de Persona (ex. Junior pressé qui néglige les cas d'erreur)
* **Sortie attendue (JSON strict) :**
  {
    "title": "PR #142: Implémentation du webhook Stripe",
    "ticket_context": "Nous devons écouter les événements Stripe checkout.session.completed...",
    "persona": {
      "name": "Jordan",
      "style": "Code rapidement, oublie la validation de signature"
    },
    "diff_content": "diff --git a/src/stripe.ts...",
    "ground_truth": [
      {
        "file": "src/stripe.ts",
        "line_number": 28,
        "type": "security_owasp",
        "severity": "critical",
        "expected_issue": "Signature Stripe non vérifiée",
        "why": "L'endpoint traite le payload JSON brut sans vérifier le header stripe-signature avec le secret de signature.",
        "ideal_fix": "stripe.webhooks.constructEvent(rawBody, sig, endpointSecret)"
      }
    ]
  }
* **Repli si échec (Fallback) :**
  1. Relance unique immédiate avec une température abaissée.
  2. Si l'API reste injoignable, bascule transparente sur un scénario d'urgence préexistant en base de données (seed statique).

### Brique 2 : Le Juge Évaluateur (Correction & Scoring)

* **Rôle / Usage :** Confrontation sémantique entre les signalements de l'utilisateur et la Ground Truth préenregistrée.
* **Modèle :** Gemini 2.5 Flash (température 0, mode Structured Output).
* **Économie de tokens :** Le modèle n'ingère pas la totalité du diff ; il reçoit exclusivement la Ground Truth et les commentaires de l'utilisateur (ligne ciblée + justification textuelle).
* **Entrées :**
  * `ground_truth` (extrait du champ JSON du Scenario)
  * `user_comments` (tableau d'objets `[{"line_number": 28, "text": "Tu as oublié de vérifier la signature du webhook !"}]`)
* **Sortie attendue (JSON strict) :**
  {
    "score": 95,
    "summary": "Excellente détection. Vous avez repéré la faille d'authentification critique immédiatement.",
    "detections": [
      {
        "line_number": 28,
        "matched": true,
        "clarity_score": 90,
        "feedback": "C'est exactement ça : sans validation du secret, n'importe qui peut forger de faux paiements."
      }
    ],
    "false_positives": [],
    "missed_issues": []
  }
* **Repli si échec (Fallback) :**
  * Algorithme heuristique sans LLM basé sur la stricte intersection numérique des lignes (`user_comment.line_number === ground_truth.line_number`).
  * Attribution d'un score de secours assorti du message : "Analyse sémantique temporairement indisponible, résultat calculé d'après les lignes pointées."

---

## Stack technique

* **Frontend :** React 19 + Vite + TypeScript + Tailwind CSS. Monaco Editor pour le diff viewer de l'écran de revue. Vite plutôt que Next.js : l'API vivant dans un service Fastify distinct, le SSR n'apporterait qu'un second runtime Node à déployer et la tentation de disperser la logique métier dans des route handlers.
* **API Backend :** Node.js avec Fastify en TypeScript, pour une empreinte mémoire réduite et une conteneurisation directe.
* **Base de données :** PostgreSQL (gestion relationnelle native des comptes et tentatives, colonnes JSONB pour la ground truth et les résultats).
* **Hébergement :** Stack conteneurisée via Docker Compose (API Node.js, PostgreSQL, et Nginx pour servir le bundle statique) déployée sur VPS dédié, derrière un Traefik mutualisé qui assure le reverse proxy et les certificats Let's Encrypt.

### Organisation du dépôt

    fst-2026-groupe-01/
    ├── frontend/                 # React + Vite + TS — port 5173
    │   ├── Dockerfile            # build Vite → Nginx (image de prod)
    │   └── nginx.conf            # fallback SPA + cache des assets
    ├── backend/                  # Fastify + TS — port 3000, routes préfixées /api
    │   ├── sql/                  # schéma, appliqué au démarrage de l'API
    │   └── Dockerfile            # build multi-étapes, exécution non-root
    ├── scripts/
    │   └── create-db-tunnel-user.sh   # compte SSH restreint pour accéder à la base
    ├── docker-compose.yml        # stack unique, profils `dev` et `prod`
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

    # 0. Une seule fois après le clone
    cp .env.example .env
    docker network create web    # réseau de Traefik ; sur le VPS il existe déjà
    cd backend && cp .env.example .env && npm install && cd ..
    cd frontend && npm install && cd ..

    # 1. Tunnel vers la base du VPS (terminal 1, ne rend pas la main)
    ssh -N -L 5432:127.0.0.1:5432 dbtunnel@codehow.thomasbarbe.com

    # 2. API (terminal 2)
    cd backend && npm run dev

    # 3. Front (terminal 3)
    cd frontend && npm run dev

L'équipe partage la base du serveur, il n'y a donc pas de conteneur Postgres à démarrer au quotidien — voir la section suivante. Pour travailler hors ligne ou tester une migration destructrice, `docker compose --profile dev up -d` fournit une base locale jetable ; il faut alors adapter `DATABASE_URL` dans `backend/.env`.

### Schéma et migrations

En attendant l'ORM, `backend/sql/*.sql` est appliqué dans l'ordre alphabétique **au démarrage de l'API**, dans une transaction par fichier. Aucune commande à lancer : un `docker compose --profile prod up -d --build` suffit à créer le schéma.

Contrainte qui en découle : chaque fichier est rejoué à chaque boot, donc tout doit rester idempotent — `CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING`. C'est suffisant pour poser un schéma, pas pour le faire évoluer : renommer une colonne demandera un vrai outil de migration.

`001_init.sql` crée la table `users` et y insère trois comptes de démonstration, affichés par la page d'accueil pour vérifier la chaîne front → API → base. Leurs `password_hash` sont des chaînes factices qui ne correspondent à aucun mot de passe. À supprimer quand l'inscription réelle sera en place.

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

`GEMINI_API_KEY` peut rester vide des deux côtés tant que la brique IA n'est pas écrite : l'API démarre et log un avertissement, sans quoi un déploiement échouerait pour une fonctionnalité inexistante.

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
| `GEMINI_API_KEY` | Peut rester vide pour l'instant |

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
