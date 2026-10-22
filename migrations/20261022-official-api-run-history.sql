-- Reuse the existing official-feed run history schema in Neon.
-- In a fresh installation this creates the same columns and defaults.
CREATE TABLE IF NOT EXISTS opportunity_official_feed_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 provider text NOT NULL,
 started_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 status text NOT NULL DEFAULT 'running',
 queries_attempted integer NOT NULL DEFAULT 0,
 fetched integer NOT NULL DEFAULT 0,
 recorded integer NOT NULL DEFAULT 0,
 errors integer NOT NULL DEFAULT 0,
 error_message text
);
CREATE INDEX IF NOT EXISTS official_feed_runs_provider_recent
 ON opportunity_official_feed_runs(provider,started_at DESC);
