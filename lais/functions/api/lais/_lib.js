/*
 * lais/functions/api/lais/_lib.js
 *
 * Mission: LAIS-PHASE-A-REAL-COMPLETION
 *
 * Cloudflare Pages Functions 共通ヘルパ。
 * 各 endpoint は SUPABASE_SERVICE_KEY（service_role）で DML を実行する。
 * クライアント JWT は Authorization Bearer で受け取り、Supabase Auth API で検証して
 * auth.uid() 相当の user_id を取り出す。
 *
 * 環境変数（Pages Project Settings の Environment Variables で設定済 想定）:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_KEY
 *   - SUPABASE_PUBLISHABLE_KEY (anon)
 *
 * セキュリティ:
 *   - service_role key は絶対にクライアントに返さない
 *   - JWT 検証で user.id を取り、後続 DML の user_id 制約に利用
 *   - JSON マッピングは src/lib/db.js と一致（adapter 層 SSoT は両者同一）
 */

const TASK_DESC_VERSION = '__LAIS_TASK_V1__';
const GOAL_DESC_VERSION = '__LAIS_GOAL_V1__';
const LAIS_PROFILE_TAG_PREFIX = '__LAIS_PROFILE_V1__\n';

const CATEGORY_LABEL = {
  work: 'Work',
  health: 'Health',
  learn: 'Learn',
  hobby: 'Hobby',
  social: 'Social',
  other: 'Other',
};

const STATUS_LABEL_JA = {
  scheduled: '予定',
  active: '進行中',
  done: '達成',
};

export function corsHeaders(origin) {
  // Cloudflare Pages は同一オリジン配信なので Origin echo は最小限。CSP は _headers 側で。
  return {
    'access-control-allow-origin': origin || '*',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'authorization,content-type,apikey,prefer',
    'access-control-max-age': '86400',
  };
}

export function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });
}

export function errorResponse(message, status = 400, code = 'lais_error') {
  return jsonResponse({ error: { code, message } }, status);
}

/**
 * Supabase Auth API で JWT を検証し user 情報を取得。
 * 失敗時は throw。
 */
export async function authenticateRequest(request, env) {
  const auth = request.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  if (!m) throw new AuthError('missing bearer token');
  const jwt = m[1].trim();
  if (!jwt) throw new AuthError('empty bearer token');

  const url = `${env.SUPABASE_URL}/auth/v1/user`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      authorization: `Bearer ${jwt}`,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new AuthError(`auth verify failed: ${res.status} ${body.slice(0, 120)}`);
  }
  const user = await res.json();
  if (!user || !user.id) throw new AuthError('user payload empty');
  return user;
}

export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * service_role で REST 経由 SELECT/INSERT/UPDATE/DELETE を行う薄いラッパ。
 */
export async function sb(env, method, path, opts = {}) {
  const url = `${env.SUPABASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = {
    apikey: env.SUPABASE_SERVICE_KEY,
    authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    ...(opts.headers || {}),
  };
  let body;
  if (opts.body !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  if (opts.prefer) {
    headers['prefer'] = opts.prefer;
  }
  const res = await fetch(url, { method, headers, body });
  const ct = res.headers.get('content-type') || '';
  let data = null;
  if (ct.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => '');
  }
  if (!res.ok) {
    const msg =
      typeof data === 'object' && data && data.message
        ? data.message
        : typeof data === 'string'
        ? data.slice(0, 240)
        : `supabase ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

// ===== profile JSON helpers (src/lib/db.js と同一マッピング) =====

export function decodeUsersProfile(aiMemo) {
  if (!aiMemo || typeof aiMemo !== 'string') return {};
  if (!aiMemo.startsWith(LAIS_PROFILE_TAG_PREFIX)) return {};
  const json = aiMemo.slice(LAIS_PROFILE_TAG_PREFIX.length);
  try {
    return JSON.parse(json) || {};
  } catch {
    return {};
  }
}

export function encodeUsersProfile(profile) {
  return LAIS_PROFILE_TAG_PREFIX + JSON.stringify(profile || {});
}

export function decodeTaskRow(row) {
  if (!row) return null;
  let meta = {};
  try {
    if (row.description) {
      const trimmed = row.description.trim();
      if (trimmed.startsWith('{')) meta = JSON.parse(trimmed) || {};
    }
  } catch {
    meta = {};
  }
  const status = row.status || 'scheduled';
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.title || '',
    time: meta.time || '',
    duration: typeof meta.duration === 'number' ? meta.duration : null,
    category: meta.category || 'other',
    categoryLabel: meta.categoryLabel || labelForCategory(meta.category),
    status,
    statusLabel: labelForStatus(status),
    memo: meta.memo || '',
    parentGoalId: meta.parent_goal_id || null,
    date: row.target_date || null,
    meta_text: buildTaskMeta(status, meta.duration),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function encodeTaskRow(task, userId) {
  const desc = {
    __tag: TASK_DESC_VERSION,
    lais_kind: 'task',
    time: task.time || '',
    duration: typeof task.duration === 'number' ? task.duration : null,
    category: task.category || 'other',
    categoryLabel: task.categoryLabel || labelForCategory(task.category),
    memo: task.memo || '',
    parent_goal_id: task.parentGoalId || null,
  };
  return {
    user_id: userId,
    title: (task.name || '').slice(0, 240),
    description: JSON.stringify(desc),
    status: task.status || 'scheduled',
    progress: task.status === 'done' ? 100 : 0,
    target_date: task.date || null,
    task_type: 'task',
    priority: 'normal',
    source: 'lais',
  };
}

export function decodeGoalRow(row) {
  if (!row) return null;
  let meta = {};
  try {
    if (row.description) {
      const trimmed = row.description.trim();
      if (trimmed.startsWith('{')) meta = JSON.parse(trimmed) || {};
    }
  } catch {
    meta = {};
  }
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.title || '',
    description: meta.body || '',
    progress: typeof row.progress === 'number' ? row.progress : 0,
    daysLeft: row.target_date ? daysBetween(new Date(), row.target_date) : null,
    category: meta.category || 'other',
    categoryLabel: meta.categoryLabel || labelForCategory(meta.category),
    categories: Array.isArray(meta.categories) ? meta.categories : [],
    target_date: row.target_date || null,
    status: row.status || 'active',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function encodeGoalRow(goal, userId) {
  const primaryCategory =
    Array.isArray(goal.categories) && goal.categories.length > 0
      ? goal.categories[0]
      : goal.category || 'other';
  const desc = {
    __tag: GOAL_DESC_VERSION,
    lais_kind: 'goal',
    body: goal.description || '',
    category: primaryCategory,
    categoryLabel: labelForCategory(primaryCategory),
    categories: Array.isArray(goal.categories) ? goal.categories : [],
  };
  return {
    user_id: userId,
    title: (goal.name || '').slice(0, 240),
    description: JSON.stringify(desc),
    status: goal.status || 'active',
    progress: typeof goal.progress === 'number' ? goal.progress : 0,
    target_date: goal.target_date || null,
    task_type: 'life',
    priority: 'normal',
    source: 'lais',
  };
}

export function decodeChatRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    role: row.role || 'user',
    text: row.content || '',
    message_type: row.message_type || 'chat',
    created_at: row.created_at,
    // BUG-RT-TALK-CRITICAL-3-FIX (Bug 3): time は client 側で JST 整形する。
    // CF Pages Worker のランタイム TZ は UTC のため、ここで getHours() すると
    // ユーザー側 (JST) と AI 側 (UTC) の時刻が画面内で混在する。
    // 互換のため key 自体は残し、JST に統一して返す。
    time: shortTimeJst(row.created_at),
  };
}

function shortTimeJst(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    // Asia/Tokyo に強制変換（toLocaleString だと環境差異あり、UTC + 9h を直接計算）
    const utcMs = d.getTime();
    const jstMs = utcMs + 9 * 60 * 60 * 1000;
    const jst = new Date(jstMs);
    const hh = String(jst.getUTCHours()).padStart(2, '0');
    const mm = String(jst.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch {
    return '';
  }
}

function daysBetween(from, toDate) {
  try {
    const to = typeof toDate === 'string' ? new Date(toDate) : toDate;
    const ms = to - from;
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  } catch {
    return null;
  }
}

function labelForCategory(c) {
  return CATEGORY_LABEL[c] || 'Other';
}

function labelForStatus(s) {
  return STATUS_LABEL_JA[s] || '予定';
}

function buildTaskMeta(status, duration) {
  const minutes = typeof duration === 'number' ? `${duration}分` : '';
  const stat = labelForStatus(status);
  if (!minutes) return stat;
  return `${stat} · ${minutes}`;
}

/**
 * 自分の users 行を ensure。存在しなければ service_role で INSERT する。
 * （goal-ai-worker の既存 RLS では user-self INSERT が拒否されるため、
 *  service_role bypass で代行）
 *
 * 注: goal-ai-worker の users スキーマは token_id / device_id を NOT NULL で持つ。
 *     Lais ユーザーは Supabase Auth UID が一意なので、それを派生した値で埋める。
 */
export async function ensureUsersRow(env, userId, email) {
  // SELECT
  const existing = await sb(env, 'GET', `/rest/v1/users?id=eq.${userId}&select=id`);
  if (Array.isArray(existing) && existing.length > 0) return false;
  // INSERT — token_id/device_id は NOT NULL 制約のため Lais 派生値で埋める
  await sb(env, 'POST', `/rest/v1/users`, {
    body: {
      id: userId,
      token_id: `lais-${userId}`,
      device_id: 'lais-web',
      ai_memo: encodeUsersProfile({}),
      ai_memo_updated_at: new Date().toISOString(),
    },
    prefer: 'resolution=ignore-duplicates',
  }).catch((err) => {
    // 重複時は ignore-duplicates が効くが、念のため
    if (err && err.status === 409) return null;
    throw err;
  });
  return true;
}

/**
 * 簡易 input サニタイズ（オブジェクト前提）
 */
export function sanitize(input, allowedKeys) {
  const out = {};
  if (!input || typeof input !== 'object') return out;
  for (const k of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(input, k)) out[k] = input[k];
  }
  return out;
}
