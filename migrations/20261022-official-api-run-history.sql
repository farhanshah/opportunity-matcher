CREATE TABLE IF NOT EXISTS opportunity_official_feed_runs (
 id bigserial PRIMARY KEY,
 source_name text NOT NULL,
 started_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz,
 status text NOT NULL DEFAULT 'running',
 query_text text,
 search_count integer NOT NULL DEFAULT 0,
 details_checked integer NOT NULL DEFAULT 0,
 confirmed_records integer NOT NULL DEFAULT 0,
 withheld_count integer NOT NULL DEFAULT 0,
 error_message text
);
CREATE INDEX IF NOT EXISTS opportunity_official_feed_runs_source_idx
 ON opportunity_official_feed_runs(source_name,started_at DESC);