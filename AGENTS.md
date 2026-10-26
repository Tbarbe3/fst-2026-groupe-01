# Code How? - Agent Context & Guidelines

Ce fichier sert de contexte de référence pour les assistants IA travaillant sur le projet **Code How?**. Il résume l'architecture, la stack technique et les conventions de développement.

## Résumé du Projet
**Code How?** est une plateforme d'entraînement destinée aux développeurs (juniors/intermédiaires) pour progresser en relecture critique de code (code review), sécurité logicielle et bonnes pratiques.
- **Principe :** L'utilisateur audite un faux ticket de Pull Request généré par l'IA (Gemini) et doit trouver des failles ou bugs spécifiques.
- **Brique IA :** Gemini 2.5 Flash est utilisé à deux niveaux :
  1. Générer le scénario et le diff de code contenant l'erreur (*Ground Truth*).
  2. Évaluer et noter les commentaires de l'utilisateur par rapport à la *Ground Truth*.

## Stack Technique
- **Frontend :** React 19, Vite, TypeScript, CSS natif (`frontend/src/styles/`), diff viewer et graphique maison. Port : `5173`.
- **Backend :** Node.js avec Fastify, TypeScript. Port : `3000`. Préfixe des routes : `/api`.
- **Base de données :** PostgreSQL (relations et JSONB pour le scoring/ground truth).
- **Déploiement :** Docker Compose (multi-profils `dev` et `prod`), Nginx, VPS, Traefik.

## Architecture du Dépôt
Le projet **n'est pas un workspace npm classique**. Le dossier racine sert à orchestrer les deux applications indépendantes via Docker et npm scripts.
- `/frontend` : App Vite SPA.
- `/backend` : API Fastify.
- `/backend/sql` : Fichiers SQL d'initialisation de la DB appliqués automatiquement.
- `/scripts` : Scripts utilitaires (ex: tunnel SSH).

## Commandes Principales (depuis la racine)
- `npm run setup` : Installe les dépendances (racine, frontend, backend).
- `npm run dev` : Lance le tunnel SSH, l'API et le front simultanément.
- `npm run dev:local` : Lance l'API et le front sur une base locale de test (nécessite `npm run db:up`).
- `npm run check` : Vérifie la validité de l'environnement (`.env` existants et dépendances).
- `npm run build` : Compile le backend et le frontend.
- `npm test` : Suites Vitest du backend et du frontend (doivent passer avant tout commit).
- `npm run check:contrast` : Contrastes WCAG de la palette.
- Mise en prod, sur le VPS : `docker compose --profile prod up -d --build`.

## Production
- **URL publique :** https://codehow.thomasbarbe.com (santé de l'API : https://codehow.thomasbarbe.com/api/health).
- Traefik mutualisé (réseau Docker externe `web`) : `Host(DOMAIN) && PathPrefix(/api)` va à l'API (priorité 100), le reste au conteneur Nginx du front.
- Sans `GEMINI_API_KEY`, ou avec `AI_MODE=mock`, l'API tourne en mode simulé. Avec la clé, toute erreur de Gemini (quota 429, clé refusée, délai, JSON invalide) bascule sur le catalogue statique pour la génération et sur le juge simulé pour la notation : une démo ne dépend jamais de la clé.

## Pièges rencontrés

### Better Auth
- **`BETTER_AUTH_URL` doit être l'URL HTTPS publique** (`https://${DOMAIN}`), pas `http://localhost:3000`. Sinon les cookies perdent l'attribut `Secure` et les origines ne correspondent plus. `config/env.ts` refuse de démarrer en prod avec une URL en `http://`.
- **`BETTER_AUTH_SECRET` est obligatoire en prod** : un secret par défaut rend les cookies falsifiables. Le changer déconnecte tout le monde.
- **`trustProxy: true` en prod** : Traefik parle en HTTP clair à l'API. Sans lui, `request.protocol` vaut `http`, l'URL reconstruite pour Better Auth ne correspond plus à `baseURL` et les requêtes sont rejetées. La limitation de débit lit aussi la mauvaise IP (celle de Traefik).
- **Reconstruire l'URL avec `request.protocol` et `request.host`** dans le relais `/api/auth/*` de `app.ts`, jamais `http://` codé en dur.
- **`trustedOrigins`** : en dev, lister les ports Vite (5173, 5174) ; en prod, seulement l'URL publique.
- **Pas d'envoi de courrier** : `requireEmailVerification` et la vérification au changement d'e-mail sont désactivés, sinon les comptes restent bloqués.
- **Traduire les erreurs par leur `code`**, pas par `message` : le texte anglais change d'une version à l'autre.
- Les tables `user`, `session`, `account`, `verification` appartiennent à Better Auth : ne pas les renommer, ne pas y ajouter de colonnes à la main sans passer par sa configuration.

### Mise en prod
- **Une seule origine** : le front appelle `/api` en relatif. Traefik route `/api` vers l'API ; le `nginx.conf` du front ne fait que le fallback SPA. Une ancienne version relayait aussi `/api` vers `http://api:3000`, un hôte inexistant dans le Compose : erreurs 502.
- **Copier `sql/` dans l'image** (`COPY --chown=node:node sql ./sql` dans `backend/Dockerfile`) : les migrations sont rejouées au démarrage, sans ce dossier l'API démarre sur une base vide.
- **Limite de corps de 64 Ko** (`bodyLimit`) : la photo de profil est stockée en data URL, elle doit être redimensionnée côté client avant envoi, sinon 413.
- **Doubler les `$`** du hash bcrypt de `ADMINER_BASIC_AUTH` dans `.env` : Compose les interpole sinon.
- **DNS** : `DOMAIN` et `ADMINER_DOMAIN` ont chacun besoin d'un enregistrement A vers le VPS, sinon Let's Encrypt échoue.
- **Même port 5432 pour le tunnel SSH et la base locale** : vérifier dans les logs de démarrage la cible annoncée par `describeDatabaseTarget` avant de chercher plus loin.

## Règles impératives

Ces deux règles s'appliquent sans exception, y compris aux modifications les plus mineures.

### A. Tout en français

L'intégralité de ce qui est lu par un humain est rédigé en français :

- Textes de l'interface, libellés, boutons, titres, états de chargement.
- **Messages d'erreur, sans exception** : exceptions levées, logs (`log.warn`, `log.error`), erreurs de validation, retours d'API, messages des scripts shell et Node, commentaires d'aide dans les `.env.example`.
- Commentaires, docstrings, documentation, messages de commit.

Les identifiants du code restent en anglais (`users`, `createdAt`, `pool`), conformément à la convention en place dans le dépôt et aux noms imposés par les bibliothèques. Seul ce qui s'affiche est traduit. *Si cette distinction ne correspond pas à l'intention, le préciser et cette règle sera corrigée.*

### B. Accessibilité et style

Toute interface ajoutée ou modifiée respecte ces points. `npm run check:contrast` les vérifie pour la palette et doit passer.

**Contraste.** Minimum WCAG AA : **4.5:1** pour le texte, **3:1** pour la bordure des champs de saisie et les indicateurs de focus. Aucune couleur n'est choisie à l'œil : on la valide avec le script. Plusieurs paires actuelles passent de justesse, un ajustement de teinte apparemment anodin peut faire basculer sous le seuil.

**Deux thèmes.** Sombre **par défaut**, clair disponible via le sélecteur. Aucune couleur n'est écrite en dur dans un composant ni dans une règle CSS : on passe par les variables de `:root` / `[data-theme='light']`, sinon le thème clair se dégrade silencieusement.

**Responsive.** Mobile d'abord, utilisable dès 320 px de large. Préférer `clamp()` et les unités relatives aux tailles fixes.

**Daltonisme.** La couleur ne porte **jamais** seule une information : elle est toujours doublée d'une icône et d'un libellé — d'où le préfixe « Erreur : » / « Succès : » de `FeedbackMessage`. C'est le choix retenu plutôt qu'un mode daltonien séparé : un tel mode ne protège que ceux qui pensent à l'activer, alors qu'une interface qui ne dépend pas de la teinte fonctionne pour tout le monde sans réglage. Éviter en particulier d'opposer rouge et vert sans autre indice.

**Pas de décalage de mise en page.** Un message conditionnel ne doit pas redimensionner son conteneur : on réserve sa place (`.form-feedback` et sa `min-height`). Sinon un bouton se déplace sous le curseur au moment du clic.

**Focus visible.** Jamais d'`outline: none` sans remplacement : c'est la seule façon de naviguer au clavier.

**Mouvement.** Respecter `prefers-reduced-motion` pour toute animation.

### C. États transverses : centralisés, jamais répétés

**L'attente de la session est déjà traitée, une seule fois, dans `Layout`.** Tant qu'elle n'est pas résolue, aucune route n'est montée. Une page ou une garde ne doit donc **jamais** lire `isPending` ni écrire « Chargement… » : la session y est toujours connue.

Le rendu d'attente lui-même vit dans un seul composant, `LoadingScreen`. Pour un chargement local — une liste de challenges, un diff à récupérer — réutiliser ce composant plutôt que d'écrire un nouveau texte : `<LoadingScreen label="Chargement des challenges…" />`.

Le principe vaut au-delà du chargement. Avant de dupliquer la gestion d'un état transverse, chercher s'il existe déjà un point unique et l'y placer :

| État | Traité par |
|---|---|
| Attente de session | `Layout` |
| Rendu d'attente | `LoadingScreen` |
| Accès refusé / redirection | `ProtectedRoute`, `GuestRoute` |
| Session incomplète | `ProtectedRoute` |
| Messages d'erreur et de succès | `FeedbackMessage` |

Un même texte d'interface présent dans deux fichiers est le signe qu'il manque un composant. Ces états touchent toutes les pages : dupliqués, ils divergent, et une correction d'accessibilité ou de libellé n'est appliquée qu'à moitié.

### D. Commentaires : uniquement ce qui sert

Le commentaire par défaut est l'absence de commentaire. On n'en écrit un que si un développeur qui découvre le fichier perdrait du temps sans lui.

À écrire :
- Le **pourquoi** d'un choix non évident, surtout s'il a l'air arbitraire ou inutilement compliqué.
- Les contournements et leurs causes (comportement d'une bibliothèque, contrainte de plateforme, piège de configuration).
- Les invariants qu'on ne peut pas déduire de la signature (« ce fichier est rejoué à chaque démarrage, donc tout doit être idempotent »).

À ne pas écrire :
- La paraphrase du code (`// incrémente le compteur` au-dessus de `count++`).
- Les bannières décoratives et les séparateurs ASCII.
- Un JSDoc dont la signature TypeScript dit déjà tout.
- Les commentaires qui décrivent l'état du projet à un instant donné et deviendront faux (« pour l'instant », « en attendant »), sauf s'ils portent une consigne actionnable.

En cas de doute : si le commentaire répète ce que le code dit, le supprimer ; s'il explique pourquoi le code est ainsi, le garder.

**Longueur : 3 lignes maximum par bloc de commentaire** (`//` consécutives ou un seul `/** */`), en-tête de fichier compris. Un sujet qui déborde se scinde en plusieurs petits commentaires posés au plus près de ce qu'ils expliquent, plutôt qu'un seul pavé en tête de fichier — ou se déplace dans `README.md` / `BACKLOG.md` s'il documente une décision plutôt qu'un bout de code précis.

### E. Vérification après chaque `git pull`

Avant de continuer un travail après avoir récupéré des changements (`git pull`, changement de branche, reprise de session), vérifier que les fichiers touchés respectent les règles A à D : commentaires ≤ 3 lignes, pas d'anglais visible, contrastes (`npm run check:contrast` si une couleur a changé), pas d'état transverse duplié. Un diff qui a été écrit sans cette relecture — par un autre outil, un autre modèle, ou en dehors de cette discipline — est le moment le plus probable où une règle régresse silencieusement.

## Conventions de Développement et Règles

### 1. Environnement et Base de Données
- L'équipe utilise une base de données **distante partagée** via un tunnel SSH (`dbtunnel`) sur `127.0.0.1:5432`. Toute action destructrice sur cette base affecte tous les développeurs.
- Ce même `127.0.0.1:5432` est aussi celui de la base locale jetable (`npm run db:up`) : les deux sont indistinguables dans `DATABASE_URL`. Un compte créé sous l'une est invisible depuis l'autre. L'API log la cible (`describeDatabaseTarget`, sans identifiants) au démarrage — à vérifier en premier devant un échec de connexion inexpliqué.
- Les fichiers SQL dans `backend/sql/` sont exécutés alphabétiquement au démarrage de l'API. Tout changement SQL doit être idempotent (`CREATE TABLE IF NOT EXISTS`, etc.). Il n'y a pas (encore) d'ORM.
- **Variables d'environnement :**
  - `.env` racine (pour Docker Compose)
  - `backend/.env` (pour l'API en développement local `npm run dev`)

### 2. Frontend
- Pas de Next.js, on utilise Vite car il n'y a pas besoin de SSR et l'API est découplée.
- En développement local, Vite proxifie les appels de `/api` vers `http://localhost:3000`. Ne pas utiliser d'URL absolue côté client pour l'API.

### 3. Sécurité

Priorité du projet, dont le sujet même est la relecture critique de code. Les règles suivantes ne se négocient pas.

- **Requêtes SQL toujours paramétrées** : `pool.query('... WHERE name = $1', [value])`. Jamais de concaténation ni d'interpolation d'une valeur dans une chaîne SQL, même « sûre » en apparence.
- **Aucune énumération de comptes.** Les messages d'authentification ne distinguent pas « compte inconnu » de « mot de passe incorrect » : un message unique, « Adresse e-mail ou mot de passe incorrect ». Ne jamais rouvrir d'endpoint public qui révèle l'existence d'un compte.
- **Validation des entrées.** Un `request.body as T` est un mensonge au compilateur, pas une validation : déclarer un schéma Fastify sur toute route qui lit un corps de requête.
- **Limitation de débit** sur les routes d'authentification (`@fastify/rate-limit`, 20 requêtes/minute/IP). Elle repose sur l'IP cliente, d'où l'importance de `trustProxy` en production pour lire `X-Forwarded-For` plutôt que l'adresse de Traefik.
- **Jamais de secret ni de hachage de mot de passe dans une réponse d'API.** Sélectionner les colonnes explicitement, ne pas faire `SELECT *`.
- Les secrets ne vivent que dans les `.env`, jamais dans le dépôt ni dans un message.
- **Politique de mot de passe** (longueur, majuscule, minuscule, chiffre, symbole) dupliquée dans `frontend/src/password-policy.ts` et `backend/src/password-policy.ts` : pas de workspace partagé entre les deux projets. Le serveur fait foi (hook `auth.ts`) ; le frontend n'offre qu'un retour immédiat. Garder les deux synchronisées. Appliquée à l'inscription et au changement de mot de passe, jamais à la connexion.
- **Traduire les erreurs d'authentification par leur `code`**, jamais par le texte anglais du `message` (`translateSignUpError` dans `AuthPage.tsx`, `translateAccountError` dans `Dashboard.tsx`) : le texte change d'une version de Better Auth à l'autre, le code non.

### 4. Backend
- Ne pas utiliser de paquets trop lourds, la stack privilégie la légèreté avec Fastify.
- Les interactions avec Gemini doivent utiliser le *Structured Output* (JSON) strict.
- En cas d'échec de l'IA, des fallbacks locaux doivent être prévus (seed de scénarios d'urgence, heuristiques sans IA pour le scoring).

### 5. Docker
- Le `docker-compose.yml` utilise des profils.
- Mode `dev` : Ne conteneurise pas le code source Node.js pour profiter du hot reload.
- Mode `prod` : Construit les images avec le flag `--build` et `--profile prod`.

### 6. Dépendances et vulnérabilités

Un `override` npm est en place et **ne doit pas être supprimé** sans vérifier l'amont au préalable :

| Projet | Override | Raison |
|---|---|---|
| racine | `shell-quote: ^1.11.0` | `concurrently` épingle `shell-quote@1.9.0`, vulnérable à une injection de commande (critique) |

`npm audit fix` y est impuissant : la dépendance est figée à une version exacte par le paquet parent, et aucune version plus récente de ce parent ne corrige le problème. L'`override` force la résolution vers la version corrigée, le saut étant mineur et compatible.

À chaque mise à jour de `concurrently`, vérifier si l'épinglage a été relevé en amont ; si oui, retirer l'`override`.

### 7. Tests

**Vitest des deux côtés.** `npm test` à la racine exécute les deux suites. Elles doivent passer avant tout commit.

**Toute fonctionnalité ajoutée vient avec son fichier de test.** Un fichier `X.test.ts(x)` à côté de `X.ts(x)`, pas dans un dossier `__tests__` séparé : le test se voit, se met à jour avec le code et sa disparition se remarque.

Ce qu'un test doit couvrir, par ordre de priorité :

1. **Le comportement attendu** dans le cas nominal.
2. **Les garde-fous de sécurité**, en vérifiant ce qui ne doit *pas* arriver : qu'un message d'erreur ne révèle pas si un compte existe, qu'une requête au-delà du plafond reçoive un 429, qu'un démarrage en production sans secret échoue. Un garde-fou sans test est un garde-fou qu'on supprimera par accident.
3. **Les exigences d'accessibilité** qui seraient autrement invisibles : rôle `alert` ou `status`, préfixe textuel doublant la couleur, `aria-hidden` sur les icônes décoratives.
4. **Les bogues corrigés**, pour qu'ils ne reviennent pas — chaque test de ce type porte en commentaire le symptôme d'origine.

**Pas de base de données ni de réseau dans les tests.** Un module testable ne doit pas exiger un PostgreSQL joignable : si un test ne peut pas importer une fonction sans ouvrir un pool, extraire cette fonction dans son propre module. C'est la raison d'être de `src/db/errors.ts` et `src/config/rate-limit.ts`. Côté frontend, `src/test/session.ts` fournit le double de `authClient`.

**Les tests sortent du build.** `backend/tsconfig.json` les exclut, sans quoi ils finiraient dans l'image de production.

**Pool `threads` et non `forks`** dans les deux `vitest.config.ts` : le pool par défaut expire sous Windows quand le chemin du projet contient une espace, ce qui est le cas ici (« Prog Web »).

## Hors Périmètre (À ne pas implémenter)
- Chat multi-tours pour discuter avec l'IA.
- Exécution de code (sandbox / compilateur en ligne).
- Intégration GitHub / GitLab webhooks réels pour les PR.
- Multijoueur en temps réel.
