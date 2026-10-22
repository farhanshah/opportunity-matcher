-- Auditable, per-provider results for daily external opportunity feeds.
ALTER TABLE opportunity_official_feed_runs
ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;
