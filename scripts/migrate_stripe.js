// GOAL AI — Step 3 DB Migration Script
// STRIPE-001 + AMEND-001 + AMEND-002 の全SQL統合

const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.wrvwcfilokfcjudspizp:***REDACTED_OLD_SUPABASE_KEY***@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const migrations = [
  // === usage_tracking: token_id追加 ===
  `ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS token_id TEXT`,

  // === usage_tracking: STRIPE-001 columns ===
  `ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS turns_used INT DEFAULT 0`,
  `ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS current_amount INT DEFAULT 0`,
  `ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS cap_reached BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS cap_reached_at TIMESTAMPTZ`,
  `ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS stripe_usage_synced INT DEFAULT 0`,
  `ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS fair_use_warnings INT DEFAULT 0`,
  `ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS last_turn_at TIMESTAMPTZ`,

  // === usage_tracking: AMEND-001 addon column ===
  `ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS addon_remaining INT DEFAULT 0`,

  // === usage_tracking: AMEND-002 ET columns ===
  `ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS et_used_this_week INT DEFAULT 0`,
  `ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS et_week_start DATE`,

  // === usage_tracking: UNIQUE constraint ===
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_usage_token_month') THEN
      ALTER TABLE usage_tracking ADD CONSTRAINT uq_usage_token_month UNIQUE (token_id, month);
    END IF;
  END $$`,

  // === fair_use_windows: new table ===
  `CREATE TABLE IF NOT EXISTS fair_use_windows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_id TEXT NOT NULL,
    window_type TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    turns_used INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_fair_use_token_type ON fair_use_windows(token_id, window_type, window_start)`,
  `ALTER TABLE fair_use_windows ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fair_use_windows' AND policyname = 'service_role_all') THEN
      CREATE POLICY "service_role_all" ON fair_use_windows FOR ALL USING (true) WITH CHECK (true);
    END IF;
  END $$`,

  // === addon_purchases: AMEND-001 new table ===
  `CREATE TABLE IF NOT EXISTS addon_purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_id TEXT NOT NULL,
    price_id TEXT NOT NULL,
    turns_granted INT NOT NULL,
    turns_remaining INT NOT NULL,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    stripe_payment_intent_id TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_addon_token ON addon_purchases(token_id, expires_at)`,
  `ALTER TABLE addon_purchases ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'addon_purchases' AND policyname = 'service_role_all') THEN
      CREATE POLICY "service_role_all" ON addon_purchases FOR ALL USING (true) WITH CHECK (true);
    END IF;
  END $$`,

  // === chat_messages: fair use index ===
  `CREATE INDEX IF NOT EXISTS idx_chat_messages_fair_use ON chat_messages(token_id, role, created_at DESC)`,

  // === users: STRIPE-001 columns ===
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_metered_subscription_item_id TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_period_start TIMESTAMPTZ`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_period_end TIMESTAMPTZ`,

  // === users: AMEND-001 columns ===
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_interval TEXT DEFAULT 'month'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ`,

  // === users: AMEND-002 columns ===
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS priority_queue BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS context_multiplier NUMERIC(3,1) DEFAULT 1.0`,

  // === RPC: increment_turn_usage ===
  `CREATE OR REPLACE FUNCTION increment_turn_usage(
    p_token_id TEXT, p_month TEXT, p_per_turn INT, p_cap INT DEFAULT 0
  ) RETURNS TABLE (turns_used INT, current_amount INT, cap_reached BOOLEAN, is_capped BOOLEAN)
  LANGUAGE plpgsql AS $$
  DECLARE v_current_amount INT;
  BEGIN
    INSERT INTO usage_tracking (token_id, month, turns_used, current_amount, cap_reached, last_turn_at)
    VALUES (p_token_id, p_month, 0, 0, false, NOW())
    ON CONFLICT (token_id, month) DO UPDATE SET last_turn_at = NOW();

    SELECT ut.current_amount INTO v_current_amount
    FROM usage_tracking ut WHERE ut.token_id = p_token_id AND ut.month = p_month FOR UPDATE;

    IF p_cap > 0 AND v_current_amount >= p_cap THEN
      UPDATE usage_tracking SET turns_used = usage_tracking.turns_used + 1, cap_reached = true
      WHERE usage_tracking.token_id = p_token_id AND usage_tracking.month = p_month;
      RETURN QUERY SELECT ut.turns_used, ut.current_amount, ut.cap_reached, true AS is_capped
      FROM usage_tracking ut WHERE ut.token_id = p_token_id AND ut.month = p_month;
      RETURN;
    END IF;

    UPDATE usage_tracking SET turns_used = usage_tracking.turns_used + 1,
      current_amount = usage_tracking.current_amount + p_per_turn
    WHERE usage_tracking.token_id = p_token_id AND usage_tracking.month = p_month;

    IF p_cap > 0 AND v_current_amount + p_per_turn >= p_cap THEN
      UPDATE usage_tracking SET cap_reached = true, cap_reached_at = NOW()
      WHERE usage_tracking.token_id = p_token_id AND usage_tracking.month = p_month AND NOT cap_reached;
    END IF;

    RETURN QUERY SELECT ut.turns_used, ut.current_amount, ut.cap_reached, false AS is_capped
    FROM usage_tracking ut WHERE ut.token_id = p_token_id AND ut.month = p_month;
  END; $$`,

  // === RPC: increment_fair_use_warnings ===
  `CREATE OR REPLACE FUNCTION increment_fair_use_warnings(p_token_id TEXT, p_month TEXT)
  RETURNS VOID LANGUAGE plpgsql AS $$
  BEGIN
    UPDATE usage_tracking SET fair_use_warnings = fair_use_warnings + 1
    WHERE token_id = p_token_id AND month = p_month;
  END; $$`,

  // === RPC: increment_et_usage (AMEND-002) ===
  `CREATE OR REPLACE FUNCTION increment_et_usage(p_token_id TEXT, p_month TEXT)
  RETURNS TABLE (et_used INT, et_week_start_val DATE)
  LANGUAGE plpgsql AS $$
  DECLARE
    v_monday DATE;
    v_current_start DATE;
  BEGIN
    v_monday := date_trunc('week', CURRENT_DATE)::DATE;

    SELECT ut.et_week_start INTO v_current_start
    FROM usage_tracking ut WHERE ut.token_id = p_token_id AND ut.month = p_month;

    IF v_current_start IS NULL OR v_current_start < v_monday THEN
      UPDATE usage_tracking SET et_used_this_week = 1, et_week_start = v_monday
      WHERE usage_tracking.token_id = p_token_id AND usage_tracking.month = p_month;
    ELSE
      UPDATE usage_tracking SET et_used_this_week = et_used_this_week + 1
      WHERE usage_tracking.token_id = p_token_id AND usage_tracking.month = p_month;
    END IF;

    RETURN QUERY SELECT ut.et_used_this_week AS et_used, ut.et_week_start AS et_week_start_val
    FROM usage_tracking ut WHERE ut.token_id = p_token_id AND ut.month = p_month;
  END; $$`,
];

async function run() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL');

    for (let i = 0; i < migrations.length; i++) {
      const sql = migrations[i];
      const label = sql.trim().substring(0, 60).replace(/\n/g, ' ');
      try {
        await client.query(sql);
        console.log(`✅ [${i+1}/${migrations.length}] ${label}...`);
      } catch (err) {
        console.error(`❌ [${i+1}/${migrations.length}] ${label}...`);
        console.error(`   Error: ${err.message}`);
      }
    }

    // === Smoke test ===
    console.log('\n=== Smoke Tests ===');

    // Test increment_turn_usage
    const r1 = await client.query("SELECT * FROM increment_turn_usage('test-migrate', '2026-03', 20, 2980)");
    console.log('increment_turn_usage:', JSON.stringify(r1.rows[0]));

    // Test increment_et_usage
    const r2 = await client.query("SELECT * FROM increment_et_usage('test-migrate', '2026-03')");
    console.log('increment_et_usage:', JSON.stringify(r2.rows[0]));

    // Verify tables
    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('fair_use_windows','addon_purchases') ORDER BY 1"
    );
    console.log('New tables:', tables.rows.map(r => r.table_name).join(', '));

    // Cleanup test data
    await client.query("DELETE FROM usage_tracking WHERE token_id = 'test-migrate'");
    console.log('\n✅ Test data cleaned up');

  } catch (err) {
    console.error('Connection error:', err.message);
  } finally {
    await client.end();
  }
}

run();
