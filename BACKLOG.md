# Backlog — Code How?

Ce qui reste à faire, par ordre de priorité décroissante dans chaque section.
Une entrée cochée est faite et vérifiée ; les entrées marquées **bloquant**
empêchent autre chose d'avancer.

---

## Base de données

### 1. Repointer les clés étrangères et supprimer `users` — **prêt à lancer**

Script écrit et à exécuter une fois à la main :
`scripts/sql/001-repointer-vers-user.sql`.

Il supprime les deux contraintes qui ciblent encore l'ancienne table,
convertit `scenarios.created_by_user_id` et `review_attempts.user_id` de
`UUID` vers `TEXT` — le type de `user.id` chez Better Auth —, recrée les
clés vers `"user"`, puis supprime `users`. Le tout dans une transaction,
avec un garde qui refuse de continuer si les tables contiennent des lignes.

`backend/sql/001_init.sql` est déjà retiré du dépôt ; la table, elle, ne
disparaîtra qu'avec ce script.

**La base étant partagée avec la production, prévenir l'équipe et
sauvegarder avant :**

    docker exec codehow-db pg_dump -U codehow -d codehow > sauvegarde.sql
    docker exec -i codehow-db psql -U codehow -d codehow       < scripts/sql/001-repointer-vers-user.sql

### 2. Trois tables ne sont déclarées nulle part — **bloquant**

`scenarios`, `review_attempts` et `user_comments` existent en base mais
**aucun fichier de `backend/sql/` ne les crée**. Elles ont été ajoutées à la
main. Conséquence : le schéma n'est pas reproductible, et un volume
`postgres-data` recréé les ferait disparaître sans moyen de les reconstruire.

À faire : les exporter depuis Adminer (structure seule) vers un
`backend/sql/003_domain.sql`, avec les `IF NOT EXISTS`, après correction des
clés étrangères du point 1.

### 3. Aucune sauvegarde

La base est unique pour le développement et la production, et rien ne la
sauvegarde. Une erreur de manipulation dans Adminer est définitive. Un
`pg_dump` quotidien par `cron` sur le VPS suffirait.

---

## Sécurité

- [x] Aucune vulnérabilité dans les dépendances des trois projets
      (`npm audit`), deux `overrides` en place — voir `agent.md` §6.
- [x] Aucun secret dans le dépôt ni dans l'historique git.
- [x] Requêtes SQL paramétrées, limitation de débit sur `/api/auth`,
      messages d'authentification non divulgants.
- [x] Gestionnaire d'erreurs qui ne divulgue rien en production, et
      `bodyLimit` ramené à 64 Kio.
- [x] En-têtes de sécurité du frontend servis par Nginx : CSP sans
      `script-src 'unsafe-inline'`, `nosniff`, `X-Frame-Options`,
      `Referrer-Policy`, `Permissions-Policy`.

### 4. `BETTER_AUTH_SECRET` à régénérer

Un secret a été collé dans une conversation : il doit être considéré comme
compromis. À remplacer sur le VPS par `openssl rand -hex 32`. Invalide
toutes les sessions en cours.

### 5. Validation des entrées absente sur les routes

Aucune route ne déclare de schéma Fastify. `request.body as T` ne valide
rien, c'est une affirmation faite au compilateur. À ajouter sur chaque route
qui lit un corps de requête.

### 6. Longueur minimale du mot de passe à 8 caractères

`backend/src/auth.ts`. 12 serait plus raisonnable. **À vérifier avant de
changer** : si Better Auth applique ce minimum aussi à la connexion et non
seulement à l'inscription, les comptes existants seraient verrouillés. À
tester sur une base locale jetable (`npm run db:up`).

### 7. Vérification d'e-mail inactive

`requireEmailVerification: false`, car aucun service d'envoi n'est
configuré. La colonne `emailVerified` reste donc toujours à `false`, et la
réinitialisation de mot de passe est impossible. Nécessite un SMTP ou un
service tiers.

---

## Interface

- [x] Formulaire d'inscription sur deux colonnes, repli sur une en dessous
      de 480 px.
- [x] Emplacement du message d'erreur sans vide réservé : transition de
      `grid-template-rows` de `0fr` vers `1fr`.

### 10. Photo de profil

La colonne `image` de la table `user` n'est pas exploitée. Afficher un
emplacement par défaut — l'initiale du pseudonyme sur fond coloré est déjà
en place dans le tableau de bord — puis permettre l'envoi d'une image.
Suppose de décider où stocker les fichiers : volume Docker, ou service
externe.

### 11. Afficher l'état de vérification de l'e-mail

La colonne `emailVerified` existe. L'afficher dans le profil n'a de sens
qu'une fois le point 7 traité.

---

## Fonctionnalités

### 12. Divulgation assumée à l'inscription — à revoir

`translateSignUpError` dans `AuthPage.tsx` répond « Un compte existe déjà
avec cette adresse e-mail. » Ce message **révèle l'existence d'un compte**,
soit l'énumération qu'on avait fermée en supprimant `/api/check-user`.

Compromis assumé pour l'instant : sans ce retour, et sans réinitialisation
de mot de passe, un utilisateur qui a oublié son inscription n'a aucun moyen
de comprendre l'échec. À remplacer par un message neutre côté client plus
une notification à l'adresse concernée, dès que l'envoi d'e-mails existera
(point 7).

Le pseudonyme n'a pas de contrainte d'unicité dans le schéma de Better Auth :
deux comptes peuvent porter le même. À décider si c'est acceptable.

### 13. Écrans de revue de code

`/review/:challengeId` et `/review/:challengeId/result` sont des pages
d'attente. Le diff viewer (Monaco est installé), les commentaires en ligne
et le débriefing restent à écrire.

### 14. Brique IA sans fournisseur

La plomberie Gemini a été retirée. Le choix du fournisseur et
l'implémentation des deux briques décrites dans le README — générateur de
scénario, juge évaluateur — restent à faire.

### 15. Données du tableau de bord simulées

`MOCK_HISTORY` dans `Dashboard.tsx`. À remplacer par les vraies tentatives
une fois `review_attempts` alimentée.

---

## Dette technique

### 16. Test de limitation de débit instable

`backend/src/rate-limit.test.ts` a échoué une fois sous charge, puis repassé
sur deux séries consécutives. Il dépend du temps (`timeWindow: '1 minute'`)
et du délai d'exécution par défaut de Vitest. À rendre déterministe avec
`vi.useFakeTimers()`, ou à doter d'un délai explicite.

### 17. Pas de migrations versionnées

Les fichiers de `backend/sql/` sont rejoués intégralement à chaque
démarrage, donc tout doit rester idempotent. Suffisant pour créer un schéma,
impossible pour le faire évoluer : renommer une colonne ou corriger une clé
étrangère — le point 1 — ne peut pas s'écrire ainsi. Un vrai outil devient
nécessaire, ce qui rejoint le choix d'ORM encore ouvert.

### 18. Aucune intégration continue

`npm test`, `npm run typecheck` et `npm run check:contrast` ne tournent que
manuellement. Une action GitHub les exécuterait sur chaque poussée.
