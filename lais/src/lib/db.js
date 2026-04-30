/*
 * lais/src/lib/db.js
 *
 * Mission: LAIS-PHASE-A-REAL-COMPLETION
 *
 * Lais ドメイン CRUD + Realtime のクライアント実装。
 *
 * 設計:
 *   ・既存 Supabase（goal-ai-worker と共用）の RLS が token-id ベースで Lais の
 *     auth.uid() ベースクエリを拒否するため、CRUD はすべて Cloudflare Pages Functions
 *     `/api/lais/*` 経由で実行（service_role bypass）。
 *   ・JWT は supabase-js が管理する access_token を Authorization Bearer で付与。
 *   ・Realtime は postgres_changes が publication 未登録のため、broadcast チャネル
 *     `lais:chat:<user_id>` で代替（サーバ側 Pages Function が INSERT 後 broadcast）。
 *
 * 主要 API:
 *   bootstrapUser()
 *   getProfile() / updateProfile(patch)
 *   listTasks() / createTask(t) / updateTask(id, patch) / deleteTask(id)
 *   listGoals() / getGoal(id) / createGoal(g) / updateGoal(id, patch) / deleteGoal(id)
 *   listChatMessages() / appendChatMessage({role, content})
 *   subscribeChatMessages(userId, onInsert) → channel
 *   unsubscribeChannel(channel)
 */

import { supabase } from './supabase.js';

const API_BASE = '/api/lais';

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data?.session?.access_token;
  if (!token) throw new Error('not authenticated');
  return token;
}

async function getAuthUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user?.id) throw new Error('not authenticated');
  return data.user.id;
}

async function apiFetch(path, init = {}) {
  const token = await getAccessToken();
  const headers = {
    authorization: `Bearer ${token}`,
    ...(init.headers || {}),
  };
  if (init.body !== undefined && typeof init.body !== 'string') {
    headers['content-type'] = 'application/json';
    init = { ...init, body: JSON.stringify(init.body) };
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  let body = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    body = await res.json().catch(() => null);
  } else {
    body = await res.text().catch(() => '');
  }
  if (!res.ok) {
    const msg =
      (body && typeof body === 'object' && body.error && body.error.message) ||
      (typeof body === 'string' ? body.slice(0, 240) : `lais api ${res.status}`);
    const err = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

// ===== bootstrap =====

export async function bootstrapUser() {
  return apiFetch(`/bootstrap`, { method: 'POST' });
}

// ===== profile =====

export async function getProfile() {
  const { profile } = await apiFetch(`/profile`, { method: 'GET' });
  return profile;
}

export async function updateProfile(patch) {
  const { profile } = await apiFetch(`/profile`, { method: 'PATCH', body: patch });
  return profile;
}

// ===== prefs (subset of profile) =====

export async function getPrefs() {
  const profile = await getProfile();
  return profile.prefs || {};
}

export async function setPrefs(patch) {
  const profile = await updateProfile({ prefs: patch });
  return profile.prefs || {};
}

// ===== tasks =====

export async function listTasks(opts = {}) {
  const qs = opts.parentGoalId ? `?parentGoalId=${encodeURIComponent(opts.parentGoalId)}` : '';
  const { tasks } = await apiFetch(`/tasks${qs}`, { method: 'GET' });
  return tasks || [];
}

export async function getTask(id) {
  const { task } = await apiFetch(`/tasks/${encodeURIComponent(id)}`, { method: 'GET' });
  return task;
}

export async function createTask(task) {
  const { task: created } = await apiFetch(`/tasks`, { method: 'POST', body: task });
  return created;
}

export async function updateTask(id, patch) {
  const { task } = await apiFetch(`/tasks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: patch,
  });
  return task;
}

export async function deleteTask(id) {
  return apiFetch(`/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ===== goals =====

export async function listGoals() {
  const { goals } = await apiFetch(`/goals`, { method: 'GET' });
  return goals || [];
}

export async function getGoal(id) {
  const { goal, tasks } = await apiFetch(`/goals/${encodeURIComponent(id)}`, { method: 'GET' });
  return { goal, tasks: tasks || [] };
}

export async function createGoal(goal) {
  const { goal: created } = await apiFetch(`/goals`, { method: 'POST', body: goal });
  return created;
}

export async function updateGoal(id, patch) {
  const { goal } = await apiFetch(`/goals/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: patch,
  });
  return goal;
}

export async function deleteGoal(id) {
  return apiFetch(`/goals/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ===== chat =====

export async function listChatMessages(opts = {}) {
  const limit = typeof opts.limit === 'number' ? opts.limit : 100;
  const { messages } = await apiFetch(`/chat?limit=${limit}`, { method: 'GET' });
  return messages || [];
}

export async function appendChatMessage({ role, content, client_msg_id }) {
  // BUG-RT-TALK-CRITICAL-3-FIX (Bug 1): client_msg_id を server に渡す。
  // server は DB 保存はせず broadcast payload にエコーバック → 楽観更新と broadcast の dedup に利用。
  const body = { role: role || 'user', content: content || '' };
  if (client_msg_id) body.client_msg_id = client_msg_id;
  const { message } = await apiFetch(`/chat`, { method: 'POST', body });
  return message;
}

/**
 * BUG-RT-TALK-CRITICAL-3-FIX (Bug 2): 実 AI 応答を生成する。
 * server 側で Anthropic / OpenAI を呼び、assistant メッセージを INSERT + broadcast する。
 * 戻り値は assistant message（broadcast でも到達するため、画面側は dedup で重複を弾く）。
 */
export async function respondToChat({ user_message, history, client_msg_id }) {
  const body = {
    user_message: String(user_message || ''),
    history: Array.isArray(history) ? history : [],
  };
  if (client_msg_id) body.client_msg_id = client_msg_id;
  const { message } = await apiFetch(`/chat/respond`, { method: 'POST', body });
  return message;
}

// ===== Realtime (broadcast channel) =====

/**
 * 自分のチャットメッセージ受信を購読する。
 * postgres_changes は chat_messages が publication 未登録のため使えない。
 * 代替として broadcast チャネル `lais:chat:<user_id>` を Pages Function 経由で利用。
 *
 * @param {string} userId
 * @param {(message)=>void} onMessage
 * @returns {RealtimeChannel}
 */
export function subscribeChatMessages(userId, onMessage) {
  if (!userId) throw new Error('userId required');
  const channel = supabase
    .channel(`lais:chat:${userId}`)
    .on('broadcast', { event: 'message' }, (payload) => {
      try {
        const msg = payload?.payload?.message;
        if (msg) onMessage(msg);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[Lais] subscribeChatMessages handler error:', err);
      }
    })
    .subscribe((status) => {
      // 任意: SUBSCRIBED / CHANNEL_ERROR / TIMED_OUT などのログを取りたい場合
      if (typeof window !== 'undefined' && window.__LAIS_RT_DEBUG__) {
        // eslint-disable-next-line no-console
        console.debug('[Lais RT] status:', status);
      }
    });
  return channel;
}

export async function unsubscribeChannel(channel) {
  if (!channel) return;
  try {
    await supabase.removeChannel(channel);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[Lais] removeChannel failed:', err);
  }
}

// ===== Helpers (for screens) =====

/**
 * S-10 Grow 用: 当日 + overdue + upcoming タスクを分類して返す。
 * 'today' = target_date が今日 / 'overdue' = today より前 / 'upcoming' = today より後 / 'inbox' = date null
 *
 * BUG-RT-S12-OPTIMISTIC-UPDATE V4:
 *   - listTasks + listGoals を Promise.all で並列化（理論上 ~半減）。
 *   - 並列化前: シリアル await（~600ms + ~500ms = ~1100ms）
 *   - 並列化後: max(~600ms, ~500ms) = ~600ms
 */
export async function loadDashboard() {
  const [tasks, goals] = await Promise.all([listTasks(), listGoals()]);
  const today = isoDate(new Date());
  const overdue = [];
  const todayList = [];
  const upcoming = [];
  const inbox = [];
  for (const t of tasks) {
    if (!t.date) {
      inbox.push(t);
      continue;
    }
    if (t.date < today) overdue.push(t);
    else if (t.date === today) todayList.push(t);
    else upcoming.push(t);
  }
  return { overdue, today: todayList, upcoming, inbox, goals };
}

export function isoDate(d) {
  // YYYY-MM-DD（local 時刻）
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export const __test__ = {
  isoDate,
};

export const auth = {
  getAccessToken,
  getAuthUserId,
};
