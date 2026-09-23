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

* **Frontend :** React (avec Vite pour un bundle épuré ou Next.js en mode SSR/client) + Tailwind CSS.
* **API Backend :** Node.js avec Fastify (ou Express) en TypeScript pour une empreinte mémoire réduite et une conteneurisation directe.
* **Base de données :** PostgreSQL (gestion relationnelle native des comptes et tentatives, colonnes JSONB pour la ground truth et les résultats).
* **Hébergement :** Stack conteneurisée via Docker Compose (service API Node.js, conteneur PostgreSQL et reverse proxy Nginx) déployée sur VPS dédié (Hetzner, OVH) pour maîtriser l'infrastructure et les coûts.

---

## Hors périmètre (Ce qu'on ne fait PAS en V1)

* **Pas de chat interactif multi-tours :** Aucun dialogue argumentatif en direct avec le persona pour défendre ou négocier son code (évite l'explosion des appels LLM).
* **Pas d'environnement d'exécution dynamique :** Pas de sandbox de test (Docker éphémère / WebAssembly) pour exécuter ou compiler le code revu.
* **Pas d'intégration directe aux plateformes externes :** Aucun branchement de webhooks GitHub, GitLab ou Bitbucket ; tout se déroule dans l'interface dédiée.
* **Pas de mode multijoueur synchrone ni de ligues compétitives en temps réel.**
