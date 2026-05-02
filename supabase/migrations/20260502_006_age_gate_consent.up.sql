-- 20260502_006_age_gate_consent.up.sql
-- Round 31 honest audit PO-E (interim mitigation、 2026-05-02、 batch 14):
-- age_gate record の DB 列追加 (COPPA / Apple §5.1.4 監督証跡)。

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS age_gate_passed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS age_gate_min_age SMALLINT,
  ADD COLUMN IF NOT EXISTS age_gate_declared_age SMALLINT;  -- nullable、 self-attestation

CREATE INDEX IF NOT EXISTS idx_users_age_gate_passed_at
  ON users (age_gate_passed_at)
  WHERE age_gate_passed_at IS NOT NULL;

INSERT INTO schema_migrations (version, description)
  VALUES ('20260502_006', 'age_gate consent (PO-E batch 14、 COPPA 13 歳閾値 self-attestation)')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
