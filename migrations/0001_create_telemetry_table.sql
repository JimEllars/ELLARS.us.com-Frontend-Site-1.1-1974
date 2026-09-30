CREATE TABLE IF NOT EXISTS telemetry (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  session_id TEXT,
  payload TEXT,
  client_ip TEXT,
  country TEXT,
  user_agent TEXT,
  received_at TEXT NOT NULL
);
