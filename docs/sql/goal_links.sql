-- UX-01-A5: ゴール間参照（リンク機能）
CREATE TABLE IF NOT EXISTS goal_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id_from UUID NOT NULL,
  goal_id_to UUID NOT NULL,
  link_type TEXT NOT NULL DEFAULT 'related',
  created_by TEXT NOT NULL DEFAULT 'ai',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE goal_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON goal_links FOR ALL USING (true) WITH CHECK (true);
