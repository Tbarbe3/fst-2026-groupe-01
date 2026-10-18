-- Tables du jeu. Elles ont d'abord été créées à la main sur la base
-- partagée : les CREATE reproduisent cet état, les ALTER le complètent.
-- Rejoué à chaque démarrage, donc entièrement idempotent.

DO $$ BEGIN
  CREATE TYPE scenario_difficulty AS ENUM ('junior', 'intermediate', 'senior');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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
  difficulty         scenario_difficulty NOT NULL,
  error_category     error_category_type NOT NULL,
  persona            JSONB NOT NULL DEFAULT '{}'::jsonb,
  diff_content       TEXT NOT NULL,
  ground_truth       JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS review_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  scenario_id     UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  score           INTEGER CHECK (score >= 0 AND score <= 100),
  score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_summary      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_comments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id           UUID NOT NULL REFERENCES review_attempts(id) ON DELETE CASCADE,
  file_path            VARCHAR(255),
  line_number          INTEGER,
  user_text            TEXT NOT NULL,
  matched_ground_truth BOOLEAN DEFAULT false,
  eval_feedback        TEXT
);

-- diff_content contient du JSON sérialisé (DiffFile[]), pas un patch git.
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ai';
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS model TEXT;
CREATE INDEX IF NOT EXISTS scenarios_filters_idx
  ON scenarios (language, difficulty, error_category);

-- Une tentative existe dès l'ouverture du challenge : la note n'arrive
-- qu'à la soumission.
ALTER TABLE review_attempts ALTER COLUMN score DROP NOT NULL;
ALTER TABLE review_attempts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'in_progress';
ALTER TABLE review_attempts ADD COLUMN IF NOT EXISTS is_mystery BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE review_attempts ADD COLUMN IF NOT EXISTS judged_by TEXT;
ALTER TABLE review_attempts ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS review_attempts_user_idx
  ON review_attempts (user_id, submitted_at);

ALTER TABLE user_comments ADD COLUMN IF NOT EXISTS matched_issue_id TEXT;
ALTER TABLE user_comments ADD COLUMN IF NOT EXISTS clarity_score INTEGER;
