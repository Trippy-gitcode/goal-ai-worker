// GOAL AI — Step 3 DB Migration
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:***REDACTED_OLD_SUPABASE_KEY***@db.wrvwcfilokfcjudspizp.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Connected to database');
    
    const sqls = [
      // === usage_tracking 拡張 ===
      `ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS turns_used INT DEFAULT 0`,
      `ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS current_amount INT DEFAULT 0`,
      `ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS cap_reached BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS cap_reached_at TIMESTAMPTZ`,
      `ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS degraded_model TEXT`,
      `ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS addon_remaining INT DEFAULT 0`,
      `ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS et_used_this_week INT DEFAULT 0`,
      `ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS et_week_start DATE`,

      // === users 拡張 ===
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS priority_queue BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS context_multiplier FLOAT DEFAULT 1.0`,

      // === fair_use_windows テーブル ===
      `CREATE TABLE IF NOT EXISTS fair_use_windows (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL,
        window_type TEXT NOT NULL CHECK (window_type IN ('5h', 'weekly')),
        window_start TIMESTAMPTZ NOT NULL,
        window_end TIMESTAMPTZ NOT NULL,
        request_count INT DEFAULT 0,
        warning_count INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_fair_use_user_type ON fair_use_windows(user_id, window_type)`,
      `CREATE INDEX IF NOT EXISTS idx_fair_use_window_end ON fair_use_windows(window_end)`,

      // === addon_purchases テーブル ===
      `CREATE TABLE IF NOT EXISTS addon_purchases (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL,
        pack_type TEXT NOT NULL CHECK (pack_type IN ('50', '120')),
        turns_total INT NOT NULL,
        turns_remaining INT NOT NULL,
        stripe_payment_id TEXT,
        purchased_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_addon_user ON addon_purchases(user_id)`,

      // === chat_messages インデックス ===
      `CREATE INDEX IF NOT EXISTS idx_chat_msg_user_created ON chat_messages(token_id, created_at DESC)`,

      // === RLS ===
      `ALTER TABLE fair_use_windows ENABLE ROW LEVEL SECURITY`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fair_use_windows' AND policyname='service_role_all_fuw') THEN
          CREATE POLICY service_role_all_fuw ON fair_use_windows FOR ALL USING (true) WITH CHECK (true);
        END IF;
      END $$`,
      `ALTER TABLE addon_purchases ENABLE ROW LEVEL SECURITY`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='addon_purchases' AND policyname='service_role_all_ap') THEN
          CREATE POLICY service_role_all_ap ON addon_purchases FOR ALL USING (true) WITH CHECK (true);
        END IF;
      END $$`,

      // === RPC: increment_turn_usage ===
      `CREATE OR REPLACE FUNCTION increment_turn_usage(
        p_user_id UUID,
        p_month TEXT,
        p_per_turn INT DEFAULT 0
      ) RETURNS JSON AS $$
      DECLARE
        result JSON;
      BEGIN
        INSERT INTO usage_tracking (user_id, month, turns_used, current_amount, chat_count, updated_at)
        VALUES (p_user_id, p_month, 1, p_per_turn, 1, NOW())
        ON CONFLICT (user_id, month)
        DO UPDATE SET
          turns_used = usage_tracking.turns_used + 1,
          current_amount = usage_tracking.current_amount + p_per_turn,
          chat_count = usage_tracking.chat_count + 1,
          updated_at = NOW();
        SELECT json_build_object(
          'turns_used', turns_used,
          'current_amount', current_amount,
          'cap_reached', cap_reached,
          'addon_remaining', addon_remaining
        ) INTO result
        FROM usage_tracking WHERE user_id = p_user_id AND month = p_month;
        RETURN result;
      END;
      $$ LANGUAGE plpgsql`,

      // === RPC: increment_fair_use_warnings ===
      `CREATE OR REPLACE FUNCTION increment_fair_use_warnings(
        p_user_id UUID,
        p_window_type TEXT
      ) RETURNS INT AS $$
      DECLARE
        current_warnings INT;
      BEGIN
        UPDATE fair_use_windows
        SET warning_count = warning_count + 1
        WHERE user_id = p_user_id AND window_type = p_window_type
          AND window_end > NOW()
        RETURNING warning_count INTO current_warnings;
        RETURN COALESCE(current_warnings, 0);
      END;
      $$ LANGUAGE plpgsql`,

      // === RPC: increment_et_usage ===
      `CREATE OR REPLACE FUNCTION increment_et_usage(
        p_user_id UUID
      ) RETURNS JSON AS $$
      DECLARE
        result JSON;
        current_month TEXT;
        current_week_start DATE;
      BEGIN
        current_month := to_char(NOW(), 'YYYY-MM');
        current_week_start := date_trunc('week', NOW())::DATE;
        
        UPDATE usage_tracking
        SET et_used_this_week = CASE
              WHEN et_week_start = current_week_start THEN et_used_this_week + 1
              ELSE 1
            END,
            et_week_start = current_week_start,
            updated_at = NOW()
        WHERE user_id = p_user_id AND month = current_month;
        
        SELECT json_build_object(
          'et_used_this_week', et_used_this_week,
          'et_week_start', et_week_start
        ) INTO result
        FROM usage_tracking WHERE user_id = p_user_id AND month = current_month;
        RETURN result;
      END;
      $$ LANGUAGE plpgsql`,
    ];

    let pass = 0, fail = 0;
    for (let i = 0; i < sqls.length; i++) {
      const sql = sqls[i];
      const label = sql.trim().substring(0, 60).replace(/\n/g, ' ');
      try {
        await client.query(sql);
        console.log(`✅ [${i+1}/${sqls.length}] ${label}...`);
        pass++;
      } catch (err) {
        console.log(`❌ [${i+1}/${sqls.length}] ${label}...`);
        console.log(`   Error: ${err.message}`);
        fail++;
      }
    }
    console.log(`\n=== Migration complete: ✅ ${pass} / ❌ ${fail} ===`);
    if (fail > 0) process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
