import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  handleHistoryGet,
  handleHistorySave,
  handleHistoryDelete,
} from '../../src/routes/history.js';

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

function makeAuthEnv() {
  const kv = makeKV();
  const tok = 'goal_test_hi';
  kv._store.set(`token:${tok}`, JSON.stringify({ plan: 'pro', userId: 'user-1' }));
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

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

function authReq(token, urlPath = '/api/history', method = 'GET', body = null) {
  return new Request(`https://x.test${urlPath}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('handleHistoryGet', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should reject without auth', async () => {
    const { env } = makeAuthEnv();
    const url = new URL('https://x.test/api/history');
    const req = new Request(url);
    const res = await handleHistoryGet(req, env, url);
    expect(res.status).toBe(401);
  });

  it('should reject invalid goalId', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 }));
    const url = new URL('https://x.test/api/history?goalId=notuuid');
    const req = authReq(token, '/api/history?goalId=notuuid');
    const res = await handleHistoryGet(req, env, url);
    expect(res.status).toBe(400);
  });

  it('should reject invalid sessionId chars', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 }));
    const url = new URL('https://x.test/api/history?sessionId=bad%20chars');
    const req = authReq(token, '/api/history?sessionId=bad%20chars');
    const res = await handleHistoryGet(req, env, url);
    expect(res.status).toBe(400);
  });

  // url-aware fetch helper — picks responses by URL substring
  function smartFetch(byUrl) {
    return vi.fn(async (url) => {
      const u = String(url);
      for (const [needle, resp] of Object.entries(byUrl)) {
        if (u.includes(needle)) {
          return typeof resp === 'function' ? resp(u) : resp;
        }
      }
      return new Response('[]', { status: 200 });
    });
  }

  it('should return messages on simple list', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = smartFetch({
      users: new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 }),
      chat_messages: new Response(JSON.stringify([{ role: 'user', content: 'msg' }]), { status: 200 }),
    });
    const url = new URL('https://x.test/api/history');
    const req = authReq(token, '/api/history');
    const res = await handleHistoryGet(req, env, url);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.messages).toHaveLength(1);
  });

  it('should return aggregated sessions when sessions=true', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = smartFetch({
      users: new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 }),
      chat_messages: new Response(
        JSON.stringify([
          { session_id: 's1', role: 'user', content: 'first', created_at: '2026-05-01T00:00:00Z' },
          { session_id: 's1', role: 'assistant', content: 'reply', created_at: '2026-05-01T00:00:01Z' },
          { session_id: 's2', role: 'user', content: 'other', created_at: '2026-05-01T00:01:00Z' },
        ]),
        { status: 200 },
      ),
    });
    const url = new URL('https://x.test/api/history?sessions=true');
    const req = authReq(token, '/api/history?sessions=true');
    const res = await handleHistoryGet(req, env, url);
    const j = await res.json();
    expect(j.sessions.length).toBe(2);
  });

  it('should accept valid goalId UUID', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = smartFetch({
      users: new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 }),
      chat_messages: new Response('[]', { status: 200 }),
    });
    const url = new URL(`https://x.test/api/history?goalId=${VALID_UUID}`);
    const req = authReq(token, `/api/history?goalId=${VALID_UUID}`);
    const res = await handleHistoryGet(req, env, url);
    expect(res.status).toBe(200);
  });
});

describe('handleHistorySave', () => {
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
    const res = await handleHistorySave(req, env);
    expect(res.status).toBe(401);
  });

  it('should reject when messages array missing', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 }));
    const res = await handleHistorySave(authReq(token, '/api/history', 'POST', {}), env);
    expect(res.status).toBe(400);
  });

  it('should save batch of messages', async () => {
    const { env, token } = makeAuthEnv();
    let stage = 0;
    globalThis.fetch = vi.fn(async () => {
      if (stage++ === 0) return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      return new Response(JSON.stringify([{ id: 1 }, { id: 2 }]), { status: 200 });
    });
    const res = await handleHistorySave(
      authReq(token, '/api/history', 'POST', {
        messages: [
          { role: 'user', content: 'a', goalId: null },
          { role: 'assistant', content: 'b', goalId: null },
        ],
      }),
      env,
    );
    const j = await res.json();
    expect(j.saved).toBe(2);
  });
});

describe('handleHistoryDelete', () => {
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
    const res = await handleHistoryDelete(req, env);
    expect(res.status).toBe(401);
  });

  it('should reject when sessionId missing', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 }));
    const req = new Request('https://x.test/api/history', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = await handleHistoryDelete(req, env);
    expect(res.status).toBe(400);
  });

  it('should reject invalid sessionId pattern', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 }));
    const req = new Request('https://x.test/api/history?sessionId=' + encodeURIComponent('bad chars '), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = await handleHistoryDelete(req, env);
    expect(res.status).toBe(400);
  });

  it('should delete on valid sessionId', async () => {
    const { env, token } = makeAuthEnv();
    globalThis.fetch = vi.fn(async (url) => {
      const u = String(url);
      if (u.includes('users') && !u.includes('chat_messages')) {
        return new Response(JSON.stringify([{ id: 'u1' }]), { status: 200 });
      }
      return new Response(null, { status: 204 });
    });
    const req = new Request('https://x.test/api/history?sessionId=valid_session_id', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = await handleHistoryDelete(req, env);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.deleted).toBe(true);
  });
});
