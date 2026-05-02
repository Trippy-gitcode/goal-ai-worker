import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  handleGoalsList,
  handleGoalCreate,
  handleGoalUpdate,
  handleGoalDelete,
  handleSuggestTasks,
  handleSuggestRoles,
  handleExtractGoals,
  handleGoalLinkCreate,
  handleGoalLinksGet,
} from '../../src/routes/goals.js';

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

function makeAuthEnv(plan = 'pro') {
  const kv = makeKV();
  const tok = 'goal_test_xx';
  kv._store.set(`token:${tok}`, JSON.stringify({ plan, userId: 'user-1' }));
  return {
    env: {
      TOKEN_KV: kv,
      SUPABASE_URL: 'https://s.test',
      SUPABASE_SERVICE_KEY: 'sk',
      OPENAI_API_KEY: 'k',
    },
    token: tok,
  };
}

function authReq(body, token, method = 'POST', urlPath = '/api/goals') {
  return new Request(`https://x.test${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '550e8400-e29b-41d4-a716-446655440001';

describe('handleGoalsList', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should reject when not authenticated', async () => {
    const { env } = makeAuthEnv();
    const req = new Request('https://x.test/');
    const res = await handleGoalsList(req, env);
    expect(res.status).toBe(401);
  });

  it('should return goals when authenticated', async () => {
    const { env, token } = makeAuthEnv();
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      // first: getUserIdFromToken (users select id)
      // second: goals select
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'uid-1' }]), { status: 200 });
      return new Response(JSON.stringify([{ id: 'g1', title: 'Goal 1' }]), { status: 200 });
    });
    const res = await handleGoalsList(authReq(null, token, 'GET'), env);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.goals).toEqual([{ id: 'g1', title: 'Goal 1' }]);
  });

  it('should return 404 when user not found', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () => new Response('[]', { status: 200 }));
    const res = await handleGoalsList(authReq(null, token, 'GET'), env);
    expect(res.status).toBe(404);
  });
});

describe('handleGoalCreate', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should reject 401 without auth', async () => {
    const { env } = makeAuthEnv();
    const req = new Request('https://x.test/', { method: 'POST', body: '{}' });
    const res = await handleGoalCreate(req, env);
    expect(res.status).toBe(401);
  });

  it('should reject when title is missing', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 }));
    const res = await handleGoalCreate(authReq({ description: 'no title' }, token), env);
    expect(res.status).toBe(400);
  });

  it('should create goal when title supplied', async () => {
    const { env, token } = makeAuthEnv();
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      return new Response(JSON.stringify([{ id: 'gid', title: 'My goal' }]), { status: 200 });
    });
    const res = await handleGoalCreate(authReq({ title: 'My goal' }, token), env);
    expect(res.status).toBe(201);
  });
});

describe('handleGoalUpdate / handleGoalDelete', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should reject update without auth', async () => {
    const { env } = makeAuthEnv();
    const url = new URL(`https://x.test/api/goals/${VALID_UUID}`);
    const req = new Request(url, { method: 'PATCH', body: '{}' });
    const res = await handleGoalUpdate(req, env, url);
    expect(res.status).toBe(401);
  });

  it('should reject update with invalid UUID', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 }));
    const url = new URL('https://x.test/api/goals/bad-id');
    const req = authReq({ title: 'x' }, token, 'PATCH', '/api/goals/bad-id');
    const res = await handleGoalUpdate(req, env, url);
    expect(res.status).toBe(400);
  });

  it('should patch when UUID valid', async () => {
    const { env, token } = makeAuthEnv();
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      return new Response(JSON.stringify([{ id: VALID_UUID, title: 'updated' }]), { status: 200 });
    });
    const url = new URL(`https://x.test/api/goals/${VALID_UUID}`);
    const req = authReq({ title: 'updated' }, token, 'PATCH', `/api/goals/${VALID_UUID}`);
    const res = await handleGoalUpdate(req, env, url);
    expect(res.status).toBe(200);
  });

  it('should delete when UUID valid', async () => {
    const { env, token } = makeAuthEnv();
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      return new Response('', { status: 200 });
    });
    const url = new URL(`https://x.test/api/goals/${VALID_UUID}`);
    const req = authReq(null, token, 'DELETE', `/api/goals/${VALID_UUID}`);
    const res = await handleGoalDelete(req, env, url);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.deleted).toBe(true);
  });
});

describe('handleSuggestTasks', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should reject when goal_title missing', async () => {
    const { env, token } = makeAuthEnv();
    const res = await handleSuggestTasks(authReq({}, token), env);
    expect(res.status).toBe(400);
  });

  it('should return tasks JSON on LLM success', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: '{"tasks":["a","b"]}' } }] }), { status: 200 }),
    );
    const res = await handleSuggestTasks(authReq({ goal_title: 'X' }, token), env);
    const j = await res.json();
    expect(j.tasks).toEqual(['a', 'b']);
  });

  it('should fallback on LLM error', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () => { throw new Error('boom'); });
    const res = await handleSuggestTasks(authReq({ goal_title: 'X' }, token), env);
    const j = await res.json();
    expect(j.tasks.length).toBeGreaterThan(0);
  });
});

describe('handleSuggestRoles', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should reject when goal_title missing', async () => {
    const { env, token } = makeAuthEnv();
    const res = await handleSuggestRoles(authReq({}, token), env);
    expect(res.status).toBe(400);
  });

  it('should return suggestions on LLM success', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"suggestions":[{"icon":"X","name":"A","description":"d"}]}' } }],
        }),
        { status: 200 },
      ),
    );
    const res = await handleSuggestRoles(authReq({ goal_title: 'X' }, token), env);
    const j = await res.json();
    expect(j.suggestions.length).toBe(1);
  });

  it('should provide fallback roles on LLM error', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () => { throw new Error('boom'); });
    const res = await handleSuggestRoles(authReq({ goal_title: 'X' }, token), env);
    const j = await res.json();
    expect(j.suggestions.length).toBeGreaterThanOrEqual(3);
  });
});

describe('handleExtractGoals', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should return [] when too few messages', async () => {
    const { env, token } = makeAuthEnv();
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      return new Response(JSON.stringify([{ role: 'user', content: 'hi' }]), { status: 200 });
    });
    const res = await handleExtractGoals(authReq({}, token), env);
    const j = await res.json();
    expect(j.goals).toEqual([]);
  });

  it('should call LLM with 3+ messages and return parsed json', async () => {
    const { env, token } = makeAuthEnv();
    let stage = 0;
    globalThis.fetch = vi.fn(async (url) => {
      if (stage === 0) {
        stage++;
        return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      }
      if (String(url).includes('chat_messages')) {
        return new Response(
          JSON.stringify(Array.from({ length: 5 }, (_, i) => ({ role: 'user', content: 'm' + i }))),
          { status: 200 },
        );
      }
      // openai
      return new Response(
        JSON.stringify({ choices: [{ message: { content: '{"goals":[{"title":"G","reason":"r"}]}' } }] }),
        { status: 200 },
      );
    });
    const res = await handleExtractGoals(authReq({}, token), env);
    const j = await res.json();
    expect(j.goals.length).toBe(1);
  });
});

describe('handleGoalLinkCreate', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should reject when goal_id_from missing', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 }));
    const res = await handleGoalLinkCreate(authReq({}, token), env);
    expect(res.status).toBe(400);
  });

  it('should reject invalid UUIDs', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 }));
    const res = await handleGoalLinkCreate(
      authReq({ goal_id_from: 'bad', goal_id_to: 'also-bad' }, token),
      env,
    );
    expect(res.status).toBe(400);
  });

  it('should reject when goal not owned (403)', async () => {
    const { env, token } = makeAuthEnv();
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      // ownership empty
      return new Response('[]', { status: 200 });
    });
    const res = await handleGoalLinkCreate(
      authReq({ goal_id_from: VALID_UUID, goal_id_to: VALID_UUID_2 }, token),
      env,
    );
    expect(res.status).toBe(403);
  });

  it('should create link when both goals owned', async () => {
    const { env, token } = makeAuthEnv();
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      if (stage === 0) {
        stage++;
        return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      }
      // both ownership checks return rows; final POST returns
      stage++;
      if (stage <= 3) return new Response(JSON.stringify([{ id: VALID_UUID }]), { status: 200 });
      return new Response(JSON.stringify([{ id: 'link-1' }]), { status: 200 });
    });
    const res = await handleGoalLinkCreate(
      authReq({ goal_id_from: VALID_UUID, goal_id_to: VALID_UUID_2 }, token),
      env,
    );
    expect(res.status).toBe(201);
  });
});

describe('handleGoalLinksGet', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should reject invalid UUID', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 }));
    const url = new URL('https://x.test/api/goals/notuuid/links');
    const req = authReq(null, token, 'GET', '/api/goals/notuuid/links');
    const res = await handleGoalLinksGet(req, env, url);
    expect(res.status).toBe(400);
  });

  it('should reject when goal not owned', async () => {
    const { env, token } = makeAuthEnv();
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      return new Response('[]', { status: 200 });
    });
    const url = new URL(`https://x.test/api/goals/${VALID_UUID}/links`);
    const req = authReq(null, token, 'GET', `/api/goals/${VALID_UUID}/links`);
    const res = await handleGoalLinksGet(req, env, url);
    expect(res.status).toBe(403);
  });

  it('should return links when owned', async () => {
    const { env, token } = makeAuthEnv();
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      if (stage === 0) {
        stage++;
        return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      }
      if (stage === 1) {
        stage++;
        return new Response(JSON.stringify([{ id: VALID_UUID }]), { status: 200 });
      }
      return new Response(JSON.stringify([{ id: 'l1', goal_id_from: VALID_UUID, goal_id_to: VALID_UUID_2 }]), {
        status: 200,
      });
    });
    const url = new URL(`https://x.test/api/goals/${VALID_UUID}/links`);
    const req = authReq(null, token, 'GET', `/api/goals/${VALID_UUID}/links`);
    const res = await handleGoalLinksGet(req, env, url);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.links.length).toBe(1);
  });
});
