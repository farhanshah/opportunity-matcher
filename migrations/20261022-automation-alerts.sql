CREATE TABLE IF NOT EXISTS opportunity_automation_alerts (
  report_date date PRIMARY KEY,
  status text NOT NULL DEFAULT 'sending',
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  provider_message_id text,
  error_message text,
  alert_json jsonb NOT NULL DEFAULT '[]'::jsonb
);
