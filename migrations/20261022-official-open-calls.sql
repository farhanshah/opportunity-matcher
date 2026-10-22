CREATE TABLE IF NOT EXISTS official_open_calls (
 slug text PRIMARY KEY,
 title text NOT NULL,
 provider text NOT NULL,
 source_url text NOT NULL UNIQUE,
 status text NOT NULL CHECK(status IN ('open','needs_recheck','closed')),
 closing_at timestamptz NOT NULL,
 eligible_countries jsonb NOT NULL,
 requirements_note text NOT NULL,
 last_checked_at timestamptz NOT NULL,
 evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS official_open_calls_public_idx
 ON official_open_calls(status,closing_at,last_checked_at)
 WHERE status='open';
