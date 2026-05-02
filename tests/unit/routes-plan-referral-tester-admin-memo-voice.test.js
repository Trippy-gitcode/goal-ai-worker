import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handlePlanStatus, incrementETUsage, checkETLimit } from '../../src/routes/plan.js';
import {
  handleReferralCode,
  handleReferralApply,
  handleReferralCreate,
  handleReferralStatus,
} from '../../src/routes/referral.js';
import { handleTesterApply } from '../../src/routes/tester.js';
import { handleAdminTesters, handleFeedbackList } from '../../src/routes/admin.js';
import { handleAIMemoGenerate } from '../../src/routes/memo.js';
import { handleVoiceTranscribe } from '../../src/routes/voice.js';

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
    async delete(key) {
      store.delete(key);
    },
    _store: store,
  };
}

function makeAuthEnv(plan = 'pro', extra = {}) {
  const kv = makeKV();
  const tok = 'goal_test_x';
  kv._store.set(`token:${tok}`, JSON.stringify({ plan, userId: 'user-1' }));
  return {
    env: {
      TOKEN_KV: kv,
      SUPABASE_URL: 'https://s.test',
      SUPABASE_SERVICE_KEY: 'sk',
      OPENAI_API_KEY: 'k',
      TOKEN_SECRET: 'TOPSECRET',
      ...extra,
    },
    token: tok,
  };
}

function authReq(token, body, method = 'POST', urlPath = '/api/x') {
  return new Request(`https://x.test${urlPath}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ════════════════════════════════════════════════════════════════
// plan.js
// ════════════════════════════════════════════════════════════════

describe('handlePlanStatus', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should reject without auth', async () => {
    const { env } = makeAuthEnv();
    const req = new Request('https://x.test/');
    const res = await handlePlanStatus(req, env);
    expect(res.status).toBe(401);
  });

  it('should return plan status object', async () => {
    const { env, token } = makeAuthEnv('pro');
    globalThis.fetch = vi.fn(async () => new Response('[]', { status: 200 }));
    const res = await handlePlanStatus(authReq(token, null, 'GET'), env);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.plan).toBe('pro');
    expect(j.cap).toBe(2980);
    expect(j.display_name).toBe('Pro');
  });

  it('should expose et stats for ultra plan', async () => {
    const { env, token } = makeAuthEnv('ultra');
    globalThis.fetch = vi.fn(async () => new Response('[]', { status: 200 }));
    const res = await handlePlanStatus(authReq(token, null, 'GET'), env);
    const j = await res.json();
    expect(j.et).toBeDefined();
    expect(j.et.limit).toBe(140);
  });
});

describe('incrementETUsage', () => {
  it('should increment KV value and return new total', async () => {
    const env = { TOKEN_KV: makeKV() };
    const r1 = await incrementETUsage(env, 'user-x');
    const r2 = await incrementETUsage(env, 'user-x');
    expect(r1).toBe(1);
    expect(r2).toBe(2);
  });
});

describe('checkETLimit', () => {
  it('should return ok=true for non-ultra plans', async () => {
    const env = { TOKEN_KV: makeKV() };
    const r = await checkETLimit(env, 'user', 'pro');
    expect(r.ok).toBe(true);
  });

  it('should return ok=true for ultra under limit', async () => {
    const env = { TOKEN_KV: makeKV() };
    const r = await checkETLimit(env, 'user', 'ultra');
    expect(r.ok).toBe(true);
    expect(r.limit).toBe(140);
  });
});

// ════════════════════════════════════════════════════════════════
// referral.js
// ════════════════════════════════════════════════════════════════

describe('handleReferralCode', () => {
  it('should reject without auth', async () => {
    const { env } = makeAuthEnv();
    const req = new Request('https://x.test/');
    const res = await handleReferralCode(req, env);
    expect(res.status).toBe(401);
  });

  it('should return 403 for free users', async () => {
    const { env, token } = makeAuthEnv('free');
    const res = await handleReferralCode(authReq(token, null, 'GET'), env);
    expect(res.status).toBe(403);
  });

  it('should issue code for paid users (pro)', async () => {
    const { env, token } = makeAuthEnv('pro');
    const res = await handleReferralCode(authReq(token, null, 'GET'), env);
    const j = await res.json();
    expect(j.code).toMatch(/^[A-Z0-9]{8}$/);
    expect(j.eligible).toBe(true);
  });

  it('should return existing code on second call', async () => {
    const { env, token } = makeAuthEnv('pro');
    const r1 = await (await handleReferralCode(authReq(token, null, 'GET'), env)).json();
    const r2 = await (await handleReferralCode(authReq(token, null, 'GET'), env)).json();
    expect(r2.code).toBe(r1.code);
  });
});

describe('handleReferralApply', () => {
  it('should reject when code missing', async () => {
    const { env, token } = makeAuthEnv('free');
    const res = await handleReferralApply(authReq(token, {}), env);
    expect(res.status).toBe(400);
  });

  it('should reject unknown code', async () => {
    const { env, token } = makeAuthEnv('free');
    const res = await handleReferralApply(authReq(token, { code: 'ZZZZZZZZ' }), env);
    expect(res.status).toBe(404);
  });

  it('should reject self-referral', async () => {
    const { env, token } = makeAuthEnv('free');
    env.TOKEN_KV._store.set('referral:owner:OWNCODE', token);
    const res = await handleReferralApply(authReq(token, { code: 'OWNCODE' }), env);
    expect(res.status).toBe(400);
  });

  it('should accept referral and store usage marker', async () => {
    const { env, token } = makeAuthEnv('free');
    env.TOKEN_KV._store.set('referral:owner:GOODCODE', 'goal_test_owner');
    let originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => new Response('[]', { status: 200 }));
    try {
      const res = await handleReferralApply(authReq(token, { code: 'GOODCODE' }), env);
      expect(res.status).toBe(200);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should reject if already used this month (409)', async () => {
    const { env, token } = makeAuthEnv('free');
    env.TOKEN_KV._store.set('referral:owner:GOODCODE2', 'goal_test_owner');
    const monthKey = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })();
    env.TOKEN_KV._store.set(`referral:used:${token}:${monthKey}`, '1');
    const res = await handleReferralApply(authReq(token, { code: 'GOODCODE2' }), env);
    expect(res.status).toBe(409);
  });
});

describe('handleReferralCreate', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should reject for free users', async () => {
    const { env, token } = makeAuthEnv('free');
    const res = await handleReferralCreate(authReq(token, null, 'POST'), env);
    expect(res.status).toBe(403);
  });

  it('should return existing code when already in users.referral_code', async () => {
    const { env, token } = makeAuthEnv('pro');
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify([{ referral_code: 'EXISTS' }]), { status: 200 }),
    );
    const res = await handleReferralCreate(authReq(token, null, 'POST'), env);
    const j = await res.json();
    expect(j.referral_code).toBe('EXISTS');
  });
});

describe('handleReferralStatus', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should reject without auth', async () => {
    const { env } = makeAuthEnv();
    const req = new Request('https://x.test/');
    const res = await handleReferralStatus(req, env);
    expect(res.status).toBe(401);
  });

  it('should return 404 when user not found', async () => {
    const { env, token } = makeAuthEnv('pro');
    globalThis.fetch = vi.fn(async () => new Response('[]', { status: 200 }));
    const res = await handleReferralStatus(authReq(token, null, 'GET'), env);
    expect(res.status).toBe(404);
  });

  it('should return status with completed_count', async () => {
    const { env, token } = makeAuthEnv('pro');
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      if (stage++ === 0) {
        return new Response(JSON.stringify([{ referral_code: 'CODE', streak_count: 3, streak_best: 7 }]), { status: 200 });
      }
      return new Response(JSON.stringify([{ id: 1 }, { id: 2 }]), { status: 200 });
    });
    const res = await handleReferralStatus(authReq(token, null, 'GET'), env);
    const j = await res.json();
    expect(j.referral_code).toBe('CODE');
    expect(j.completed_count).toBe(2);
  });
});

// ════════════════════════════════════════════════════════════════
// tester.js
// ════════════════════════════════════════════════════════════════

describe('handleTesterApply', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should reject without auth', async () => {
    const { env } = makeAuthEnv();
    const req = new Request('https://x.test/');
    const res = await handleTesterApply(req, env);
    expect(res.status).toBe(401);
  });

  it('should reject invalid tester_code', async () => {
    const { env, token } = makeAuthEnv('free');
    const res = await handleTesterApply(authReq(token, { tester_code: 'NONEXISTENT' }), env);
    expect(res.status).toBe(400);
  });

  it('should accept valid TESTER01 (Max plan)', async () => {
    const { env, token } = makeAuthEnv('free');
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      // 1st call: all tester count (not at limit)
      // 2nd: code uses count (not at limit)
      // 3rd: getUserIdFromToken users select id
      // 4th: user already has tester_code? null
      // 5th: PATCH users
      stage++;
      if (stage === 1) return new Response('[]', { status: 200 });
      if (stage === 2) return new Response('[]', { status: 200 });
      if (stage === 3) return new Response(JSON.stringify([{ id: 'u' }]), { status: 200 });
      if (stage === 4) return new Response(JSON.stringify([{}]), { status: 200 });
      return new Response(null, { status: 204 });
    });
    const res = await handleTesterApply(authReq(token, { tester_code: 'TESTER01' }), env);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.plan).toBe('max');
    expect(j.tier).toBe('TESTER01');
  });

  it('should reject when user already has tester_code', async () => {
    const { env, token } = makeAuthEnv('free');
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      stage++;
      if (stage === 1) return new Response('[]', { status: 200 });
      if (stage === 2) return new Response('[]', { status: 200 });
      if (stage === 3) return new Response(JSON.stringify([{ id: 'u' }]), { status: 200 });
      // Pre-existing tester_code
      return new Response(JSON.stringify([{ tester_code: 'TESTER02' }]), { status: 200 });
    });
    const res = await handleTesterApply(authReq(token, { tester_code: 'TESTER01' }), env);
    expect(res.status).toBe(400);
  });
});

// ════════════════════════════════════════════════════════════════
// admin.js
// ════════════════════════════════════════════════════════════════

describe('handleAdminTesters', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should reject without admin auth', async () => {
    const { env } = makeAuthEnv();
    const req = new Request('https://x.test/');
    const res = await handleAdminTesters(req, env);
    expect(res.status).toBe(401);
  });

  it('should reject when admin secret mismatched', async () => {
    const { env } = makeAuthEnv();
    const req = new Request('https://x.test/', {
      headers: { Authorization: 'Bearer WRONG' },
    });
    const res = await handleAdminTesters(req, env);
    expect(res.status).toBe(401);
  });

  it('should return tester stats with correct admin secret', async () => {
    const { env } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify([
        { token_id: 't1', tester_code: 'TESTER01', tester_expires_at: '2030-01-01T00:00:00Z' },
      ]), { status: 200 }),
    );
    const req = new Request('https://x.test/', {
      headers: { Authorization: 'Bearer TOPSECRET' },
    });
    const res = await handleAdminTesters(req, env);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.total_testers).toBe(1);
    expect(j.by_tier.TESTER01).toBeDefined();
  });
});

describe('handleFeedbackList', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should require user auth when no admin secret', async () => {
    const { env } = makeAuthEnv();
    const req = new Request('https://x.test/');
    const res = await handleFeedbackList(req, env);
    expect(res.status).toBe(401);
  });

  it('should reject mismatched admin secret', async () => {
    const { env } = makeAuthEnv();
    const req = new Request('https://x.test/', {
      headers: { 'X-Admin-Secret': 'WRONG' },
    });
    const res = await handleFeedbackList(req, env);
    expect(res.status).toBe(401);
  });

  it('should accept valid admin secret and return all feedbacks', async () => {
    const { env } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify([{ id: 'fb1' }, { id: 'fb2' }]), { status: 200 }),
    );
    const req = new Request('https://x.test/', {
      headers: { 'X-Admin-Secret': 'TOPSECRET' },
    });
    const res = await handleFeedbackList(req, env);
    const j = await res.json();
    expect(j.feedbacks).toHaveLength(2);
  });

  it('should return user feedbacks with valid Bearer token', async () => {
    const { env, token } = makeAuthEnv('pro');
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      return new Response(JSON.stringify([{ id: 'fbA' }]), { status: 200 });
    });
    const req = new Request('https://x.test/', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = await handleFeedbackList(req, env);
    const j = await res.json();
    expect(j.feedbacks).toHaveLength(1);
  });
});

// ════════════════════════════════════════════════════════════════
// memo.js (route)
// ════════════════════════════════════════════════════════════════

describe('handleAIMemoGenerate', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should reject without auth', async () => {
    const { env } = makeAuthEnv();
    const req = new Request('https://x.test/');
    const res = await handleAIMemoGenerate(req, env);
    expect(res.status).toBe(401);
  });

  it('should return 404 when user not found', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () => new Response('[]', { status: 200 }));
    const res = await handleAIMemoGenerate(authReq(token, { type: 'home' }), env);
    expect(res.status).toBe(404);
  });

  it('should return 404 when profile not found', async () => {
    const { env, token } = makeAuthEnv();
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      return new Response('[]', { status: 200 });
    });
    const res = await handleAIMemoGenerate(authReq(token, { type: 'home' }), env);
    expect(res.status).toBe(404);
  });

  it('should generate home memo when profile exists', async () => {
    const { env, token } = makeAuthEnv();
    let stage = 0;
    globalThis.fetch = vi.fn(async (url) => {
      stage++;
      if (stage === 1) return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      if (stage === 2) {
        return new Response(JSON.stringify([{ id: 'u1', nickname: 'A', strengths: 's' }]), { status: 200 });
      }
      if (String(url).includes('openai.com')) {
        return new Response(JSON.stringify({ choices: [{ message: { content: 'Memo content' } }] }), { status: 200 });
      }
      return new Response('[]', { status: 200 });
    });
    const res = await handleAIMemoGenerate(authReq(token, { type: 'home' }), env);
    const j = await res.json();
    expect(j.memo).toBeDefined();
    expect(j.type).toBe('home');
  });

  it('should return 404 when goal not found for type=goal', async () => {
    const { env, token } = makeAuthEnv();
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      stage++;
      if (stage === 1) return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      if (stage === 2) return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      // goals lookup empty
      return new Response('[]', { status: 200 });
    });
    const res = await handleAIMemoGenerate(authReq(token, { type: 'goal', goal_id: 'g1' }), env);
    expect(res.status).toBe(404);
  });
});

// ════════════════════════════════════════════════════════════════
// voice.js
// ════════════════════════════════════════════════════════════════

describe('handleVoiceTranscribe', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should reject without auth', async () => {
    const { env } = makeAuthEnv();
    const req = new Request('https://x.test/');
    const res = await handleVoiceTranscribe(req, env);
    expect(res.status).toBe(401);
  });

  it('should reject when audio missing', async () => {
    const { env, token } = makeAuthEnv();
    const res = await handleVoiceTranscribe(authReq(token, {}), env);
    expect(res.status).toBe(400);
  });

  it('should call Whisper and return text', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ text: 'transcribed text' }), { status: 200 }),
    );
    // valid base64 of small payload
    const audio = btoa('hello-audio-bytes');
    const res = await handleVoiceTranscribe(authReq(token, { audio, mimeType: 'audio/webm' }), env);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.text).toBe('transcribed text');
  });

  it('should bubble up Whisper error', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: 'wh-err' } }), { status: 400 }),
    );
    const audio = btoa('audio');
    const res = await handleVoiceTranscribe(authReq(token, { audio }), env);
    expect(res.status).toBe(400);
  });
});
