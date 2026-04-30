-- UX-01-A8: ME identity DB
-- user_identity: ユーザーの自己定義データ（vision/identity/mindset_preset）
CREATE TABLE IF NOT EXISTS user_identity (
  user_id UUID PRIMARY KEY,
  vision TEXT,
  identity JSONB NOT NULL DEFAULT '{}',
  mindset_preset TEXT NOT NULL DEFAULT 'futoshi',
  qol_proposals JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_identity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON user_identity FOR ALL USING (true) WITH CHECK (true);
