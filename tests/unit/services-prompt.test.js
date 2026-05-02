import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  IDENTITY_SESSION_PROMPT,
  QOL_PROPOSAL_PROMPT,
  buildServerSystemPrompt,
} from '../../src/services/prompt.js';

function makeKV(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    async get(key, type) {
      const raw = store.get(key);
      if (raw === undefined) return null;
      if (type === 'json') return JSON.parse(raw);
      return raw;
    },
    async put(key, value) {
      store.set(key, value);
    },
  };
}

// ════════════════════════════════════════════════════════════════
// Constant prompts — should be non-empty + contain key markers
// ════════════════════════════════════════════════════════════════

describe('IDENTITY_SESSION_PROMPT', () => {
  it('should contain the marker [IDENTITY_UPDATE]', () => {
    expect(IDENTITY_SESSION_PROMPT).toContain('[IDENTITY_UPDATE]');
  });

  it('should describe 5-year ideal day field', () => {
    expect(IDENTITY_SESSION_PROMPT).toContain('5年後の理想の平日');
  });

  it('should describe unwanted_life field', () => {
    expect(IDENTITY_SESSION_PROMPT).toContain('やりたくない生活');
  });

  it('should be non-trivial in length', () => {
    expect(IDENTITY_SESSION_PROMPT.length).toBeGreaterThan(500);
  });
});

describe('QOL_PROPOSAL_PROMPT', () => {
  it('should require JSON array output', () => {
    expect(QOL_PROPOSAL_PROMPT).toContain('JSON');
  });

  it('should mention urgency field', () => {
    expect(QOL_PROPOSAL_PROMPT).toContain('urgency');
  });

  it('should mention category enum', () => {
    expect(QOL_PROPOSAL_PROMPT).toContain('lifestyle');
  });
});

// ════════════════════════════════════════════════════════════════
// buildServerSystemPrompt() — composer
// ════════════════════════════════════════════════════════════════

describe('buildServerSystemPrompt', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function makeEnvWithUser(userRow, identityRow) {
    let stage = 0;
    globalThis.fetch = vi.fn(async (url) => {
      // First call from getUserIdFromToken (user lookup)
      // Second / third: Promise.all both DB calls
      if (stage === 0) {
        stage++;
        return new Response(JSON.stringify([{ id: 'uid' }]), { status: 200 });
      }
      // Promise.all: distinguish users vs user_identity by URL
      if (String(url).includes('user_identity')) {
        return new Response(JSON.stringify(identityRow ? [identityRow] : []), { status: 200 });
      }
      return new Response(JSON.stringify(userRow ? [userRow] : []), { status: 200 });
    });
    return {
      TOKEN_KV: makeKV(),
      SUPABASE_URL: 'https://s.test',
      SUPABASE_SERVICE_KEY: 'k',
    };
  }

  it('should return both fixedPart and variablePart in result', async () => {
    const env = makeEnvWithUser({ nickname: 'X' }, null);
    const r = await buildServerSystemPrompt({}, 'goal_test_token', env);
    expect(r).toHaveProperty('fixedPart');
    expect(r).toHaveProperty('variablePart');
  });

  it('should include role in fixedPart when body.role given', async () => {
    const env = makeEnvWithUser(null, null);
    const r = await buildServerSystemPrompt(
      { role: 'コーチ' },
      'goal_test_token',
      env,
    );
    expect(r.fixedPart).toContain('コーチ');
    expect(r.fixedPart).toContain('【あなたの役割】');
  });

  it('should include profile block when user has nickname (default fields)', async () => {
    const env = makeEnvWithUser({ nickname: 'Tester' }, null);
    const r = await buildServerSystemPrompt({}, 'goal_test_token', env);
    expect(r.fixedPart).toContain('Tester');
  });

  it('should include AI memo when MEMO_ENABLED=true and aiMemo provided', async () => {
    const env = makeEnvWithUser(null, null);
    env.MEMO_ENABLED = 'true';
    const r = await buildServerSystemPrompt(
      {},
      'goal_test_token',
      env,
      { aiMemo: 'previous memo content' },
    );
    expect(r.fixedPart).toContain('previous memo content');
    expect(r.fixedPart).toContain('AIの理解メモ');
  });

  it('should NOT include AI memo when MEMO_ENABLED is unset', async () => {
    const env = makeEnvWithUser(null, null);
    const r = await buildServerSystemPrompt(
      {},
      'goal_test_token',
      env,
      { aiMemo: 'previous memo content' },
    );
    expect(r.fixedPart).not.toContain('previous memo content');
  });

  it('should always include INTENT classification block', async () => {
    const env = makeEnvWithUser(null, null);
    const r = await buildServerSystemPrompt({}, 'tok', env);
    expect(r.fixedPart).toContain('GOAL_CREATE');
    expect(r.fixedPart).toContain('TASK_CREATE');
    expect(r.fixedPart).toContain('STATUS_UPDATE');
  });

  it('should append body.system after intent block when provided', async () => {
    const env = makeEnvWithUser(null, null);
    const r = await buildServerSystemPrompt(
      { system: 'CUSTOM_SYS_TAIL' },
      'tok',
      env,
    );
    expect(r.fixedPart).toContain('CUSTOM_SYS_TAIL');
  });

  it('should include RAG block in variablePart when RAG_ENABLED=true', async () => {
    const env = makeEnvWithUser(null, null);
    env.RAG_ENABLED = 'true';
    const r = await buildServerSystemPrompt(
      {},
      'tok',
      env,
      { ragResults: [{ date: '2026-04-01', content: 'past chat' }] },
    );
    expect(r.variablePart).toContain('past chat');
    expect(r.variablePart).toContain('関連する過去の会話');
  });

  it('should NOT include RAG block when RAG_ENABLED unset', async () => {
    const env = makeEnvWithUser(null, null);
    const r = await buildServerSystemPrompt(
      {},
      'tok',
      env,
      { ragResults: [{ date: '2026-04-01', content: 'past chat' }] },
    );
    expect(r.variablePart).not.toContain('past chat');
  });

  it('should pick coaching_mode field set when body.coaching_mode is true', async () => {
    const env = makeEnvWithUser({ nickname: 'X', occupation: 'Eng', age: 30, mbti: 'INTJ' }, null);
    const r = await buildServerSystemPrompt({ coaching_mode: true }, 'tok', env);
    // coaching_mode should expand fields list — at minimum nickname+occupation should appear
    expect(r.fixedPart).toContain('X');
    expect(r.fixedPart).toContain('Eng');
  });

  it('should include futoshi mindset preset by default', async () => {
    const env = makeEnvWithUser(null, null);
    const r = await buildServerSystemPrompt({}, 'tok', env);
    expect(r.fixedPart).toContain('MINDSET_PRESET: futoshi');
  });

  it('should swallow DB errors and still return prompt structure', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('db down'); });
    const env = { TOKEN_KV: makeKV(), SUPABASE_URL: 'https://s.test', SUPABASE_SERVICE_KEY: 'k' };
    const r = await buildServerSystemPrompt({}, 'tok', env);
    expect(r).toHaveProperty('fixedPart');
    expect(r).toHaveProperty('variablePart');
  });
});
