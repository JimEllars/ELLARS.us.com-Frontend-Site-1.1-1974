-- 0002_telemetry_hardening.sql
--
-- The telemetry table created in 0001 had no indexes, which made the only
-- useful queries (by day, by event type, by session) full scans, and it
-- retained a raw client IP and a raw User-Agent for every event on a platform
-- that publicly advertises a strict privacy protocol.
--
-- Column semantics change here (no schema change, no data loss):
--   client_ip  -> stores a salted 32-hex-character SHA-256 prefix, never the
--                 address. Hashing happens at the edge in
--                 functions/api/telemetry.js; a salt is bound via the
--                 TELEMETRY_SALT secret.
--   user_agent -> written as NULL. Retained for backwards compatibility only.
--
-- Apply with:
--   wrangler d1 execute <database> --file=migrations/0002_telemetry_hardening.sql

CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp
  ON telemetry (timestamp);

CREATE INDEX IF NOT EXISTS idx_telemetry_event_type_timestamp
  ON telemetry (event_type, timestamp);

CREATE INDEX IF NOT EXISTS idx_telemetry_session_id
  ON telemetry (session_id);

CREATE INDEX IF NOT EXISTS idx_telemetry_received_at
  ON telemetry (received_at);

-- Retention: keep 90 days of queryable rows. Batches are still held in KV for
-- 30 days; if longer history is required, it belongs in Analytics Engine rather
-- than in D1. received_at is written as an ISO-8601 UTC string, so the cutoff is
-- formatted to match it rather than relying on SQLite's space-separated form.
DELETE FROM telemetry
  WHERE received_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-90 days');

-- Rows written before this migration still carry raw addresses. Scrub them so
-- the retention claim is true for the whole table, not just new writes.
UPDATE telemetry
  SET client_ip = NULL
  WHERE client_ip IS NOT NULL
    AND NOT (length(client_ip) = 32 AND client_ip NOT GLOB '*[^0-9a-f]*');

UPDATE telemetry
  SET user_agent = NULL
  WHERE user_agent IS NOT NULL;
