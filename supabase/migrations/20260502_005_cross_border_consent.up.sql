-- 20260502_005_cross_border_consent.up.sql
-- Round 31 honest audit PO-F fix (2026-05-02、 batch 14):
-- 個情法 §28 越境移転同意 record の DB 列追加。 frontend/js/cross_border_consent_modal.js
-- が POST /api/account/consent/cross-border 経由で book、 7 年保管 (個情法 §16-2 監督義務)。

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS cross_border_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cross_border_consent_version TEXT,
  ADD COLUMN IF NOT EXISTS cross_border_consent_granted BOOLEAN;

CREATE INDEX IF NOT EXISTS idx_users_cross_border_consent_at
  ON users (cross_border_consent_at)
  WHERE cross_border_consent_at IS NOT NULL;

INSERT INTO schema_migrations (version, description)
  VALUES ('20260502_005', 'cross_border_consent record (PO-F batch 14、 個情法 §28)')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
