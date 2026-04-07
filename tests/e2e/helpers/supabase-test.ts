/**
 * GOAL AI — Supabase Test Helper
 * Set test user plan via Supabase REST API
 */

import * as fs from 'fs';
import * as path from 'path';

let _supabaseUrl = process.env.SUPABASE_URL || '';
let _supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

// Load from tests/.env.test if env vars not set
function loadEnv() {
  if (_supabaseUrl && _supabaseKey) return;
  try {
    const envPath = path.resolve(__dirname, '../../.env.test');
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx);
      const val = trimmed.slice(eqIdx + 1);
      if (key === 'SUPABASE_URL' && !_supabaseUrl) _supabaseUrl = val;
      if (key === 'SUPABASE_SERVICE_KEY' && !_supabaseKey) _supabaseKey = val;
    }
  } catch { /* ignore */ }
}

const TEST_TOKEN = 'goal_test_7BDSzrA2f3pzQN0z2yNGYSKS';

/**
 * Set the test user's plan via Supabase REST API
 */
export async function setTestUserPlan(plan: 'free' | 'light' | 'pro' | 'max' | 'ultra'): Promise<void> {
  loadEnv();
  if (!_supabaseUrl || !_supabaseKey) {
    console.warn('Supabase credentials not configured, skipping plan change');
    return;
  }
  const url = `${_supabaseUrl}/rest/v1/users?token_id=eq.${encodeURIComponent(TEST_TOKEN)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': _supabaseKey,
      'Authorization': `Bearer ${_supabaseKey}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) {
    throw new Error(`Failed to set plan to ${plan}: ${res.status} ${await res.text()}`);
  }
}
