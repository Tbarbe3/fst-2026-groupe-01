-- Schéma complet de l'application, rejoué à chaque démarrage de l'API :
-- tout est idempotent, sans effet sur une base déjà à jour.

-- Better Auth : noms de tables et de colonnes imposés par la bibliothèque.
CREATE TABLE IF NOT EXISTS "user" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL,
  "image" TEXT,
  "createdAt" TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMP NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP,
  "refreshTokenExpiresAt" TIMESTAMP,
  "scope" TEXT,
  "password" TEXT,
  "createdAt" TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id" TEXT PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP,
  "updatedAt" TIMESTAMP
);

-- Doit rester aligné sur CATEGORIES (backend/src/ai/types.ts).
DO $$ BEGIN
  CREATE TYPE error_category_type AS ENUM
    ('security_owasp', 'performance', 'architecture', 'race_condition', 'business_logic');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS scenarios (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  title              VARCHAR(255) NOT NULL,
  ticket_context     TEXT NOT NULL,
  language           VARCHAR(50) NOT NULL,
  difficulty         SMALLINT NOT NULL CONSTRAINT scenarios_difficulty_range CHECK (difficulty BETWEEN 1 AND 5),
  error_category     error_category_type NOT NULL,
  locale             VARCHAR(2) NOT NULL DEFAULT 'fr' CONSTRAINT scenarios_locale_check CHECK (locale IN ('fr', 'en')),
  persona            JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- JSON sérialisé des fichiers du diff (DiffFile[]), pas un patch git.
  diff_content       TEXT NOT NULL,
  ground_truth       JSONB NOT NULL DEFAULT '[]'::jsonb,
  source             TEXT NOT NULL DEFAULT 'ai',
  model              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS scenarios_filters_locale_idx
  ON scenarios (language, difficulty, error_category, locale);

-- Une tentative existe dès l'ouverture du challenge : la note n'arrive qu'à la soumission.
CREATE TABLE IF NOT EXISTS review_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  scenario_id     UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'in_progress',
  is_mystery      BOOLEAN NOT NULL DEFAULT false,
  score           INTEGER CHECK (score >= 0 AND score <= 100),
  score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_summary      TEXT,
  judged_by       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS review_attempts_user_idx
  ON review_attempts (user_id, submitted_at);

CREATE TABLE IF NOT EXISTS user_comments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id           UUID NOT NULL REFERENCES review_attempts(id) ON DELETE CASCADE,
  file_path            VARCHAR(255),
  line_number          INTEGER,
  user_text            TEXT NOT NULL,
  matched_ground_truth BOOLEAN DEFAULT false,
  matched_issue_id     TEXT,
  clarity_score        INTEGER,
  eval_feedback        TEXT
);
