# Récap soutenance — Code How?

Mercredi 4 novembre. **20 min** de présentation et de démo, puis **10 min** de questions. Tout le monde parle, et chacun doit pouvoir expliquer n'importe quelle partie, y compris celle écrite par son binôme.

- Diapos : https://codehow.thomasbarbe.com/soutenance.html (flèches ou espace pour avancer, `F` pour le plein écran, 🌗 pour le thème). En local : `frontend/public/soutenance.html`.
- Application : https://codehow.thomasbarbe.com
- Santé de l'API : https://codehow.thomasbarbe.com/api/health

---

## 1. Checklist du jour J

- [ ] Tout est fusionné dans `main`, et la prod a été reconstruite depuis `main` (`git pull && docker compose --profile prod up -d --build`).
- [ ] 10 min avant : ouvrir `/api/health`, puis créer un challenge pour vérifier que Gemini répond.
- [ ] Si Gemini est lent ou saturé : mettre `AI_MODE=mock` dans le `.env` du VPS, puis `docker compose --profile prod up -d`. La démo devient instantanée (catalogue et juge simulé), et c'est un argument à présenter : « une démo ne dépend jamais d'une clé API ».
- [ ] Un compte de démo déjà créé, avec quelques revues terminées pour que le tableau de bord, la courbe et le rang aient du contenu.
- [ ] Une revue préparée : savoir **à l'avance** où sont les anomalies du scénario qu'on va jouer (voir § 3).
- [ ] Onglets ouverts : diapos, application, GitHub (pour montrer du code si on le demande).
- [ ] Répéter une fois en chronométrant : la démo doit tenir en **8 min** environ.

## 2. Découpage du temps (20 min)

| Temps | Diapo | Qui | Contenu |
|---|---|---|---|
| 0–1 min | 1 | Tous | Présentation, URL |
| 1–3 min | 2–3 | Baptiste | Le problème, la solution, le principe du diff piégé |
| 3–11 min | 4 | Les deux | **Démo** (voir § 3) |
| 11–13 min | 5–6 | Thomas puis Baptiste | Architecture, données |
| 13–16 min | 7–9 | Thomas puis Baptiste | Brique IA (générateur, juge), notation |
| 16–18 min | 10–11 | Thomas puis Baptiste | Sécurité, qualité, accessibilité |
| 18–20 min | 12–14 | Les deux | Pièges, suites, merci |

Les noms sont indicatifs : changez-les dans les `data-speaker` du fichier HTML si vous vous répartissez autrement.

## 3. Script de démo

1. **Accueil** : la démo interactive de la page d'accueil, en une phrase.
2. **Inscription** : taper un mot de passe faible pour montrer la politique, puis un bon mot de passe.
3. **Tableau de bord** : choisir TypeScript, niveau 3, Sécurité. Mentionner le mode Mystère.
4. **Revue** : lire le ticket et le persona. Commenter la bonne ligne avec une explication claire, puis ajouter un commentaire volontairement faux, pour montrer le faux positif au débriefing.
5. **Débriefing** : la note sur 100 décomposée (détection, clarté, précision), l'anomalie trouvée, le correctif attendu sous forme de diff.
6. **Bonus** : passer en anglais (le scénario et le juge suivent la langue), basculer le thème clair.

En mode simulé, TypeScript niveau 3 Sécurité donne le scénario **« PR #142 : webhooks Stripe »** (`src/routes/stripe-webhook.ts`) : la signature du webhook n'est pas vérifiée (`const event = req.body`). Il contient d'autres anomalies : lisez-le dans `backend/src/ai/mock-catalog.ts` avant la démo.

## 4. Carte du code (qui doit savoir quoi : tout le monde)

### Backend (`backend/src`)

| Fichier | Rôle |
|---|---|
| `server.ts` / `app.ts` | Démarrage, plugins (Helmet, CORS, rate-limit), migrations, relais `/api/auth/*` vers Better Auth |
| `auth.ts` | Configuration de Better Auth, hook de politique de mot de passe |
| `config/env.ts` | Variables d'environnement, refus de démarrer en prod sans secret ou en `http://` |
| `config/rate-limit.ts` | 20 req/min/IP sur l'auth, 15 générations par heure |
| `routes/challenges.ts` | `POST /api/challenges` (créer), `GET /api/me/attempts` (historique), `GET /api/attempts/:id` (détail), `POST /api/attempts/:id/submit` (noter) |
| `db/challenges-repo.ts` | Toutes les requêtes SQL, paramétrées, réutilisation des scénarios |
| `db/migrate.ts` + `sql/` | Scripts SQL idempotents rejoués au démarrage |
| `ai/service.ts` | Orchestration : essais du générateur, repli catalogue, juge, repli juge simulé |
| `ai/provider.ts` | Fournisseur Gemini (liste de modèles essayés dans l'ordre) et fournisseur simulé |
| `ai/gemini.ts` | Appel REST direct (pas de SDK), clé en en-tête, délai, niveau de réflexion |
| `ai/prompts.ts` | Prompts et schémas JSON du générateur et du juge |
| `ai/scenario-builder.ts` | Valide la sortie du modèle, numérote les lignes, construit la ground truth |
| `ai/scoring.ts` | Détection (±2 lignes), nettoyage de la sortie du juge, calcul de la note |
| `ai/mock-catalog.ts` | Scénarios écrits à la main (FR/EN), au moins un par langage |

### Frontend (`frontend/src`)

| Fichier | Rôle |
|---|---|
| `router.tsx` | Routes, chargement à la demande des pages lourdes |
| `components/Layout`, `ProtectedRoute`, `GuestRoute` | Attente de session traitée une seule fois, gardes d'accès |
| `pages/Dashboard.tsx` + `components/ChallengeLauncher.tsx` | Lanceur, historique, courbe, rang |
| `pages/Review.tsx` | Diff viewer, commentaires inline, brouillons dans `localStorage` |
| `pages/ReviewResult.tsx` | Débriefing |
| `i18n/` | i18n maison FR/EN, test de parité des clés |
| `api/` | Appels à l'API en relatif (`/api`) |
| `styles/base.css` | Variables de couleur des deux thèmes |

## 5. Les deux parcours à savoir raconter

**Créer un challenge** : le lanceur fait `POST /api/challenges`. La route valide le corps (schéma Fastify) et vérifie la limite de 15 générations par heure. Le dépôt cherche d'abord un scénario existant (même langage, niveau, catégorie et langue) que le joueur n'a pas encore fait. Sinon, `generateScenario` appelle Gemini : sortie JSON contrainte, puis `buildScenario` valide et numérote les lignes. En cas d'échec, un second essai plus froid, puis le catalogue. Le scénario est enregistré, une `review_attempt` est créée, et le front est redirigé vers `/review/:id`.

**Soumettre une revue** : `POST /api/attempts/:id/submit` avec les commentaires. `candidateIssues` rattache chaque commentaire aux anomalies du même fichier à ±2 lignes. Le juge Gemini reçoit uniquement la ground truth et les lignes commentées. `sanitizeJudgeOutput` refuse toute anomalie que le serveur n'a pas proposée. `computeScore` calcule la note. Tout est enregistré, et le front affiche le débriefing.

## 6. Chiffres à connaître

- **Note sur 100** : détection 60 (criticité : critique 3, majeure 2, mineure 1), clarté 30, précision 10 (−5 par faux positif, 0 si aucun commentaire).
- **Tolérance de détection** : ±2 lignes, dans le même fichier.
- **Générateur** : températures 0,9 puis 0,4, délai de 60 s par appel. **Juge** : température 0, délai de 30 s.
- **Limites de débit** : 20 req/min/IP sur l'auth, 15 générations par heure.
- **Corps de requête** : 64 Ko au maximum (la photo de profil est redimensionnée côté client).
- **Tests** : environ 160 côté backend et 100 côté frontend, avec Vitest.
- **7 langages, 5 niveaux, 5 catégories, 2 langues, 2 thèmes.**
- **Rangs** : Novice (0), Apprenti (5), Confirmé (10), Senior (20) revues terminées.

## 7. Questions probables et réponses

**Pourquoi Vite plutôt que Next.js ?** L'API est un service Fastify séparé. Le SSR ajouterait un second runtime Node à déployer et pousserait à disperser la logique métier dans des route handlers. Une SPA suffit, et il n'y a pas d'enjeu SEO derrière la connexion.

**Pourquoi Fastify ?** Léger, rapide, validation par schéma JSON intégrée, bonne intégration TypeScript. Image Docker réduite.

**Pourquoi pas d'ORM ?** Peu de tables, des requêtes simples, et du JSONB. Du SQL paramétré est lisible et sans magie. Les scripts sont idempotents (`CREATE TABLE IF NOT EXISTS`) et rejoués à chaque démarrage.

**Comment empêcher le modèle de tricher ou d'être manipulé ?** Le serveur décide de la détection (fichier et ±2 lignes). Le juge ne peut que confirmer ou refuser une anomalie candidate. La note est calculée par le serveur, jamais par le modèle. Une injection de prompt dans un commentaire ne crée donc aucun point.

**Pourquoi le serveur numérote-t-il les lignes ?** Un LLM compte mal. Le modèle produit des blocs de lignes typées (`add`, `delete`, `context`), et le serveur calcule les numéros.

**Que se passe-t-il si Gemini tombe ?** Génération : second essai, puis catalogue. Juge : modèle suivant de la liste (`GEMINI_MODEL_JUDGE=a,b`), puis juge simulé par mots-clés. Le débriefing signale le repli. Sans clé, l'API tourne entièrement en mode simulé.

**Pourquoi un appel REST direct plutôt que le SDK Gemini ?** Un seul endpoint suffit, et c'est une dépendance de moins dans l'image. La clé passe dans un en-tête, jamais dans l'URL, qui finirait dans les logs.

**Combien coûte une partie ?** Un scénario est généré une fois puis réutilisé par les autres joueurs. Le juge ne reçoit pas le diff, seulement la ground truth et les lignes commentées, ce qui limite les jetons. Une revue sans commentaire n'appelle pas le juge.

**Comment gérez-vous l'authentification ?** Better Auth avec e-mail et mot de passe, session en cookie. En prod : `BETTER_AUTH_URL` en HTTPS (cookies `Secure`), secret obligatoire, `trustProxy` derrière Traefik. Politique de mot de passe vérifiée côté serveur (hook) et doublée côté client pour le retour immédiat. Message unique « e-mail ou mot de passe incorrect », pour ne pas révéler si un compte existe.

**Pourquoi `trustProxy` ?** Traefik parle en HTTP à l'API. Sans `trustProxy`, Fastify croit la requête en `http`, l'URL reconstruite pour Better Auth ne correspond plus et les sessions sont rejetées. La limitation de débit verrait aussi l'IP de Traefik au lieu de celle du client.

**Accessibilité ?** Contrastes WCAG AA vérifiés par `npm run check:contrast`. Couleur jamais seule (icône et libellé « Erreur : » / « Succès : »). Focus visible. Diff navigable au clavier. Courbe doublée d'un tableau pour les lecteurs d'écran. `prefers-reduced-motion` respecté. Pas de décalage de mise en page.

**Comment est fait le déploiement ?** Docker Compose avec profils. En prod : API (image multi-étapes, non-root), Nginx pour le bundle statique, PostgreSQL. Un Traefik mutualisé sur le VPS route `/api` vers l'API et le reste vers Nginx, et gère les certificats Let's Encrypt.

**Comment travaillez-vous avec l'IA ?** `AGENTS.md` (lu via `CLAUDE.md`) donne la stack, les commandes, les règles (tout en français, accessibilité, sécurité, tests) et les pièges rencontrés. Chaque assistant repart de ce contexte, et une règle impose de relire tout diff après un `git pull`.

**Comment testez-vous sans base ni réseau ?** Les modules sont découpés pour être importables sans pool (`db/errors.ts`, `config/rate-limit.ts`). Gemini est remplacé par un faux fournisseur ou un faux `fetch`. Les tests d'intégration SQL ne tournent que si `TEST_DATABASE_URL` pointe vers une base jetable.

**Qu'est-ce qui a été le plus difficile ?** La mise en prod de Better Auth derrière Traefik (protocole, origines, cookies) et la fiabilité de Gemini : modèles retirés (404), saturés (503) ou lents. D'où la liste de modèles, le niveau de réflexion réglable et le juge simulé.

## 8. Limites à assumer

- Le catalogue de repli compte 11 scénarios : en mode simulé, on peut recevoir un niveau voisin de celui demandé, mais toujours dans le bon langage.
- Pas d'envoi d'e-mail, donc pas de vérification d'adresse ni de mot de passe oublié.
- La qualité de la génération dépend du modèle : la validation serveur refuse les sorties incohérentes, mais ne garantit pas qu'une anomalie soit pédagogiquement parfaite.
