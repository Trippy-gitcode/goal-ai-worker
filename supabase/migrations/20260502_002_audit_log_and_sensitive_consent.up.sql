-- 20260502_002_audit_log_and_sensitive_consent.up.sql
-- Round 31 honest audit fix (2026-05-02):
--   P3#25: audit_log table 不在 → GDPR Art.5(2) accountability 違反 fix
--   P3#23: 要配慮個人情報 (MBTI 等) opt-in flag 不在 → 個情法 §20-2 verifiable consent fix

BEGIN;

-- ────────────────────────────────────────────────────────────────
-- audit_log table (P3#25 fix)
--   30 日保管、 GDPR Art.5(2) accountability + 個情法 §16-3 audit trail。
--   ip / ua は SHA-256 hash で privacy 保護 (raw 保持なし)。
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL,             -- 'consent_grant' | 'consent_revoke' | 'data_export' | 'data_delete' | 'sensitive_opt_in' | 'sensitive_opt_out' 等
  event_data  JSONB,                      -- structured detail
  ip_hash     TEXT,                       -- SHA-256 hashed IP (privacy)
  ua_hash     TEXT,                       -- SHA-256 hashed UA
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id_created_at
  ON audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type_created_at
  ON audit_log (event_type, created_at DESC);

-- 30 日 retention (Cloud Scheduler / cron で実行する DELETE は別 PR)
COMMENT ON TABLE audit_log IS '30-day retention for compliance audit trail (GDPR Art.5(2), 個情法 §16-3)';

-- ────────────────────────────────────────────────────────────────
-- 要配慮個人情報 opt-in flags (P3#23 fix)
--   個情法 §20-2 verifiable consent。 default FALSE で明示同意なき限り収集禁止。
--   sensitive_consent_at + sensitive_consent_version で 同意取得時点 / privacy version を保全。
-- ────────────────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS sensitive_consent_mbti BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sensitive_consent_mental_health BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sensitive_consent_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sensitive_consent_version TEXT;  -- privacy.html version

INSERT INTO schema_migrations (version, description)
  VALUES ('20260502_002', 'audit_log table + 要配慮個人情報 opt-in flags (P3#25 + P3#23 fix)')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
