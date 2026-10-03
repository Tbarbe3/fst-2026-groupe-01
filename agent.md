# Code How? - Agent Context & Guidelines

Ce fichier sert de contexte de référence pour les assistants IA travaillant sur le projet **Code How?**. Il résume l'architecture, la stack technique et les conventions de développement.

## Résumé du Projet
**Code How?** est une plateforme d'entraînement destinée aux développeurs (juniors/intermédiaires) pour progresser en relecture critique de code (code review), sécurité logicielle et bonnes pratiques.
- **Principe :** L'utilisateur audite un faux ticket de Pull Request généré par l'IA (Gemini) et doit trouver des failles ou bugs spécifiques.
- **Brique IA :** Gemini 2.5 Flash est utilisé à deux niveaux :
  1. Générer le scénario et le diff de code contenant l'erreur (*Ground Truth*).
  2. Évaluer et noter les commentaires de l'utilisateur par rapport à la *Ground Truth*.

## Stack Technique
- **Frontend :** React 19, Vite, TypeScript, Tailwind CSS, Monaco Editor (pour le diff viewer). Port : `5173`.
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

## Conventions de Développement et Règles

### 1. Environnement et Base de Données
- L'équipe utilise une base de données **distante partagée** via un tunnel SSH (`dbtunnel`) sur `localhost:5432`. Toute action destructrice sur cette base affecte tous les développeurs.
- Les fichiers SQL dans `backend/sql/` sont exécutés alphabétiquement au démarrage de l'API. Tout changement SQL doit être idempotent (`CREATE TABLE IF NOT EXISTS`, etc.). Il n'y a pas (encore) d'ORM.
- **Variables d'environnement :**
  - `.env` racine (pour Docker Compose)
  - `backend/.env` (pour l'API en développement local `npm run dev`)

### 2. Frontend
- Pas de Next.js, on utilise Vite car il n'y a pas besoin de SSR et l'API est découplée.
- En développement local, Vite proxifie les appels de `/api` vers `http://localhost:3000`. Ne pas utiliser d'URL absolue côté client pour l'API.

### 3. Backend
- Ne pas utiliser de paquets trop lourds, la stack privilégie la légèreté avec Fastify.
- Les interactions avec Gemini doivent utiliser le *Structured Output* (JSON) strict.
- En cas d'échec de l'IA, des fallbacks locaux doivent être prévus (seed de scénarios d'urgence, heuristiques sans IA pour le scoring).

### 4. Docker
- Le `docker-compose.yml` utilise des profils.
- Mode `dev` : Ne conteneurise pas le code source Node.js pour profiter du hot reload.
- Mode `prod` : Construit les images avec le flag `--build` et `--profile prod`.

### 5. Tests
- Aucun framework de test n'est configuré par défaut dans le dépôt initial.
- Si des tests doivent être ajoutés, privilégier **Vitest** (standard avec Vite) pour le frontend comme pour le backend afin de mutualiser l'outillage.
- Les tests (unitaires ou d'intégration) doivent être cloisonnés dans les dossiers `/frontend` et `/backend` respectifs.

## Hors Périmètre (À ne pas implémenter)
- Chat multi-tours pour discuter avec l'IA.
- Exécution de code (sandbox / compilateur en ligne).
- Intégration GitHub / GitLab webhooks réels pour les PR.
- Multijoueur en temps réel.
