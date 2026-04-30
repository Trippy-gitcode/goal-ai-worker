import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { BottomTabBar } from '../shared/BottomTabBar.jsx';
import { IconClose, IconSparkle, IconSword, IconArrowDown } from '../icons/index.js';
import {
  listChatMessages,
  appendChatMessage,
  respondToChat,
  subscribeChatMessages,
  unsubscribeChannel,
  auth as dbAuth,
} from '../../lib/db.js';
import { supabase } from '../../lib/supabase.js';
import './S20Talk.css';

/*
 * S-20 TALK（タブ #2 / チャット UI）
 * design_spec_v1.md §4.9 準拠
 *
 * 本ミッション（M4-I）スコープ:
 * - S20-1〜S20-10 全要素描画
 * - ユーザー送信 → ダミー AI 応答 (setTimeout) のみ
 * - 履歴ドロワー / Supabase / 画像添付 / ストリーミング は後続
 *
 * Learned Patterns 事前適用:
 * - LP-001: prefers-reduced-motion で setTimeout / transition 縮退
 * - LP-002: マウント時 main focus
 * - LP-003: CSP は Phase B（画面側では XSS に依存しない実装）
 * - LP-004: コントラスト実測（css コメント参照）
 * - LP-011: 数値は design tokens / calc に寄せる
 * - LP-012: 本画面自体が lazy import される（App.jsx 側）
 * - LP-013: env(safe-area-inset-bottom) は @supports 分岐で第2引数未使用
 * - LP-014: programmatic focus と keyboard focus を :focus-visible で分離
 * - LP-015: Active pill / カード border に --accent を明示
 * - LP-016 候補: aria-readonly は role 指定要素のみ。プレーン div には付与しない
 * - LP-017 候補: タップ領域 44×44 は min-height + min-width + inline-flex + padding を併用
 */

// LAIS-PHASE-A-REAL-COMPLETION: Mock messages 撤去。Supabase chat_messages を実利用。
// AI 応答は Phase A スコープ外のため、本画面では「ユーザー送信→DB INSERT→Realtime 受信」のみ実装。
// 後続フェーズで Worker 側の AI 推論連携と置換される（design_spec_v1.md §4.9）。

// 視覚的アタッチメント（タスク提案・冒険検出）は Phase A 段階では未表示。
// design_spec の S20-5/S20-6 を維持するため、helper コンポーネントは残置するが
// 現状のメッセージ流には attachment フィールドが付かない。
const TASK_PROPOSAL = { name: '朝のストレッチ 5 分', time: '毎朝 07:00' };
const QUEST = { label: '冒険を検出！', detail: '新しい朝の習慣：5 分ストレッチ', exp: 50 };

const MAX_ROWS = 4;

// BUG-RT-TALK-CRITICAL-3-FIX (Bug 3): 全画面 JST 統一の単一経路。
// db.js から渡る created_at (UTC ISO) を Asia/Tokyo の HH:mm に整形する。
// 既存 server-side `time` も同じ JST 整形済だが、ローカル整形のほうがズレが起きない。
function formatJstHm(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return '';
  }
}

function nowJstHm() {
  return formatJstHm(new Date().toISOString());
}

function adaptMessage(m) {
  // BUG-RT-TALK-CRITICAL-3-FIX (Bug 3): created_at から JST 整形を最優先。
  // server-side `time` は互換 fallback。
  const time = formatJstHm(m.created_at) || m.time || '';
  return {
    id: m.id,
    role: m.role === 'user' ? 'user' : 'ai',
    text: m.text || '',
    time,
    client_msg_id: m.client_msg_id || null,
    created_at: m.created_at || null,
  };
}

export function S20Talk() {
  const titleId = useId();
  const mainRef = useRef(null);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const pendingTimerRef = useRef(null);
  const channelRef = useRef(null);
  const seenIdsRef = useRef(new Set());

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [showScrollBanner, setShowScrollBanner] = useState(false);
  const [loadError, setLoadError] = useState('');
  // BUG-RT-TALK-CRITICAL-3-FIX (Bug 2): AI 応答待ちのインジケータ
  const [aiPending, setAiPending] = useState(false);
  // R2.1 fix (edge_case R-102): 日本語 IME 変換中の Enter で誤送信しない
  const [isComposing, setIsComposing] = useState(false);

  // R2 fix (edge_case R-001): Date.now() ベース ID は同一 ms 内で衝突する。
  const msgCounterRef = useRef(0);
  const nextMsgId = useCallback((prefix) => {
    msgCounterRef.current += 1;
    return `${prefix}-${msgCounterRef.current}`;
  }, []);

  // BUG-RT-TALK-CRITICAL-3-FIX (Bug 1): client_msg_id → optimistic id の対応表。
  // broadcast で同じ client_msg_id を持つ message が来た時、optimistic を本物に置換する
  // ことで二重表示を防ぐ。
  const clientMsgIdToOptimisticRef = useRef(new Map());
  const seenClientMsgIdRef = useRef(new Set());

  // R2.1 fix (edge_case R-101): Enter + click の同一フレーム race を防ぐ再入ロック。
  const sendingRef = useRef(false);

  // LP-002: main focus
  useEffect(() => {
    if (mainRef.current) mainRef.current.focus({ preventScroll: true });
  }, []);

  // 履歴読込 + Realtime 購読
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const list = await listChatMessages({ limit: 100 });
        if (cancelled) return;
        const adapted = list.map(adaptMessage);
        seenIdsRef.current = new Set(adapted.map((m) => m.id));
        setMessages(adapted);
      } catch (err) {
        if (!cancelled) setLoadError(err?.message || 'チャット履歴の取得に失敗しました');
      }
      try {
        const userId = await dbAuth.getAuthUserId();
        if (cancelled) return;
        // RealtimeClient の auth token 同期（postgres_changes RLS でも broadcast でも JWT 必要）
        try {
          const { data } = await supabase.auth.getSession();
          const token = data?.session?.access_token;
          if (token && supabase.realtime && typeof supabase.realtime.setAuth === 'function') {
            supabase.realtime.setAuth(token);
          }
        } catch {
          /* setAuth 失敗は致命でない */
        }
        const ch = subscribeChatMessages(userId, (msg) => {
          if (cancelled) return;
          if (!msg || !msg.id) return;
          // BUG-RT-TALK-CRITICAL-3-FIX (Bug 1): 二重表示防止の 3 段階チェック
          // 1) 既に persisted id を見ている → skip
          if (seenIdsRef.current.has(msg.id)) return;
          // 2) client_msg_id が optimistic と一致 → optimistic を本物に置換
          const cid = msg.client_msg_id;
          if (cid && clientMsgIdToOptimisticRef.current.has(cid)) {
            const optimisticId = clientMsgIdToOptimisticRef.current.get(cid);
            clientMsgIdToOptimisticRef.current.delete(cid);
            seenClientMsgIdRef.current.add(cid);
            seenIdsRef.current.add(msg.id);
            setMessages((prev) =>
              prev.map((m) => (m.id === optimisticId ? adaptMessage(msg) : m))
            );
            // AI 側 broadcast を受けた場合は loading 解除
            if (msg.role === 'assistant') setAiPending(false);
            return;
          }
          // 3) client_msg_id が既に解決済 → skip（二重 broadcast 安全弁）
          if (cid && seenClientMsgIdRef.current.has(cid)) return;
          seenIdsRef.current.add(msg.id);
          if (cid) seenClientMsgIdRef.current.add(cid);
          setMessages((prev) => [...prev, adaptMessage(msg)]);
          if (msg.role === 'assistant') setAiPending(false);
        });
        channelRef.current = ch;
      } catch (err) {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.warn('[S20] subscribe failed:', err && err.message);
        }
      }
    }
    init();

    // JWT refresh 後の再接続: onAuthStateChange を購読し setAuth で更新
    const { data: authSubData } = supabase.auth.onAuthStateChange((_event, sess) => {
      const token = sess?.access_token;
      if (token && supabase.realtime && typeof supabase.realtime.setAuth === 'function') {
        try { supabase.realtime.setAuth(token); } catch { /* noop */ }
      }
    });
    return () => {
      cancelled = true;
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
      // unsubscribe leak 防止
      if (channelRef.current) {
        unsubscribeChannel(channelRef.current);
        channelRef.current = null;
      }
      try { authSubData?.subscription?.unsubscribe?.(); } catch { /* noop */ }
    };
  }, []);

  // 新規メッセージが追加されたら末尾へスクロール
  useEffect(() => {
    if (!scrollRef.current) return;
    if (showScrollBanner) return; // ユーザーが上方閲覧中は追従しない
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, showScrollBanner]);

  const handleTabSelect = useCallback((tabId) => {
    if (tabId === 'talk') return; // 現在地
    if (tabId === 'grow') {
      route('/grow');
      return;
    }
    if (tabId === 'me') {
      route('/me');
      return;
    }
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    // 末尾 80px 以内なら「末尾にいる」と判定
    setShowScrollBanner(distance > 80);
  }, []);

  const jumpToBottom = useCallback(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    setShowScrollBanner(false);
  }, []);

  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    // 14px * 1.4 = 19.6px, padding 12px 上下 = 24px
    // max 4 行 ≈ 19.6 * 4 + 24 = 102.4 → 104px (css max-height と一致)
    const lineHeight = 20;
    const verticalPadding = 24;
    const maxHeight = lineHeight * MAX_ROWS + verticalPadding;
    const next = Math.min(ta.scrollHeight, maxHeight);
    ta.style.height = `${next}px`;
  }, []);

  const handleInput = useCallback((e) => {
    setInputValue(e.currentTarget.value);
    resizeTextarea();
  }, [resizeTextarea]);

  const canSend = inputValue.trim().length > 0;

  const sendMessage = useCallback(async () => {
    // R2.1 fix (edge_case R-101): 同一フレーム再入を無効化
    if (sendingRef.current) return;
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    sendingRef.current = true;
    queueMicrotask(() => { sendingRef.current = false; });

    // BUG-RT-TALK-CRITICAL-3-FIX (Bug 3): JST 表示時刻
    const time = nowJstHm();

    // BUG-RT-TALK-CRITICAL-3-FIX (Bug 1): client_msg_id を発番。
    // server に送信 → DB INSERT → broadcast に echo されて戻る。
    // broadcast 受信時に client_msg_id 一致で optimistic を本物に置換 → 重複表示なし。
    const userClientMsgId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `u-${crypto.randomUUID()}`
        : `u-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const optimisticId = nextMsgId('msg-u');
    clientMsgIdToOptimisticRef.current.set(userClientMsgId, optimisticId);

    const userMsg = {
      id: optimisticId,
      role: 'user',
      text: trimmed,
      time,
      client_msg_id: userClientMsgId,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // history snapshot は server 送信用に固定（race を避ける）
    const historyForAi = messages
      .filter((m) => m.role === 'user' || m.role === 'ai')
      .map((m) => ({ role: m.role, text: m.text }));

    let userInsertOk = false;
    try {
      const persisted = await appendChatMessage({
        role: 'user',
        content: trimmed,
        client_msg_id: userClientMsgId,
      });
      userInsertOk = true;
      if (persisted && persisted.id) {
        seenIdsRef.current.add(persisted.id);
        // optimistic を本物に置換（id を採用、broadcast の重複は client_msg_id で吸収）
        clientMsgIdToOptimisticRef.current.delete(userClientMsgId);
        seenClientMsgIdRef.current.add(userClientMsgId);
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticId ? adaptMessage(persisted) : m))
        );
      }
    } catch (err) {
      // 失敗: optimistic を取り除き、エラー表示
      clientMsgIdToOptimisticRef.current.delete(userClientMsgId);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      // eslint-disable-next-line no-console
      console.warn('[S20] sendMessage failed:', err && err.message);
      setLoadError(err?.message || 'メッセージ送信に失敗しました');
      return;
    }

    if (!userInsertOk) return;

    // BUG-RT-TALK-CRITICAL-3-FIX (Bug 2): 実 AI 応答を server 経由で生成。
    // 固定文字列「いい一歩ですね。続けていきましょう。」は撤去。
    setAiPending(true);
    const aiClientMsgId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `a-${crypto.randomUUID()}`
        : `a-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    try {
      const aiMessage = await respondToChat({
        user_message: trimmed,
        history: historyForAi,
        client_msg_id: aiClientMsgId,
      });
      if (aiMessage && aiMessage.id) {
        // broadcast でも届く可能性 → 直接挿入は client_msg_id 経由 dedup に委ねる
        if (!seenIdsRef.current.has(aiMessage.id) &&
            !seenClientMsgIdRef.current.has(aiClientMsgId)) {
          seenIdsRef.current.add(aiMessage.id);
          seenClientMsgIdRef.current.add(aiClientMsgId);
          setMessages((prev) => [...prev, adaptMessage(aiMessage)]);
        }
      }
      setAiPending(false);
    } catch (err) {
      setAiPending(false);
      // eslint-disable-next-line no-console
      console.warn('[S20] respondToChat failed:', err && err.message);
      setLoadError(err?.message || 'AI 応答の生成に失敗しました');
    }
  }, [inputValue, nextMsgId, messages]);

  const handleKeyDown = useCallback((e) => {
    // R2.1 fix (edge_case R-102): IME 変換確定の Enter を送信トリガにしない
    // isComposing state に加え、ネイティブ e.isComposing / keyCode 229 も二重ガード
    if (isComposing || e.isComposing || e.keyCode === 229) return;
    // Enter = 送信 / Shift+Enter = 改行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage, isComposing]);

  const handleCompositionStart = useCallback(() => setIsComposing(true), []);
  const handleCompositionEnd = useCallback(() => setIsComposing(false), []);

  const logAction = useCallback((label) => {
    // eslint-disable-next-line no-console
    console.log(`[S20] ${label} (後続)`);
  }, []);

  const sendBtnAriaDisabled = !canSend;

  return (
    <main
      id="main-content"
      ref={mainRef}
      tabIndex={-1}
      class="s20-talk"
      aria-labelledby={titleId}
    >
      {/* S20-1 ヘッダ */}
      <header class="s20-header" role="banner">
        <button
          type="button"
          class="s20-header-icon-btn"
          aria-label="履歴を開く"
          onClick={() => logAction('履歴ドロワー')}
        >
          <svg viewBox="0 0 22 22" width="22" height="22" aria-hidden="true" focusable="false">
            <path d="M4 6h14 M4 11h14 M4 16h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </button>
        <h1 id={titleId} class="s20-header-title">TALK</h1>
        <div class="s20-header-right">
          <button
            type="button"
            class="s20-header-icon-btn"
            aria-label="時刻"
            onClick={() => logAction('時刻')}
          >
            <svg viewBox="0 0 22 22" width="22" height="22" aria-hidden="true" focusable="false">
              <circle cx="11" cy="11" r="7.5" fill="none" stroke="currentColor" stroke-width="1.6" />
              <path d="M11 6 v5 l3.5 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none" />
            </svg>
          </button>
          <button
            type="button"
            class="s20-header-icon-btn"
            aria-label="新規チャット"
            onClick={() => logAction('新規チャット')}
          >
            <svg viewBox="0 0 22 22" width="22" height="22" aria-hidden="true" focusable="false">
              <path
                d="M4 15.5 L4 18 L6.5 18 L16.5 8 L14 5.5 Z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </header>

      {loadError && (
        <div role="alert" style={{ padding: '8px 16px', color: 'var(--text-error, #b00020)', fontSize: 12 }}>
          {loadError}
        </div>
      )}

      {/* S20-2 スクロール領域 */}
      <section
        class="s20-scroll"
        ref={scrollRef}
        onScroll={handleScroll}
        aria-label="チャット履歴"
      >
        <ol class="s20-message-list">
          {messages.map((msg) => {
            if (msg.role === 'system' && msg.kind === 'levelup') {
              // S20-7 レベルアップバナー
              return (
                <li key={msg.id} class="s20-message-item">
                  <div class="s20-levelup" role="status">
                    <span class="s20-levelup-icon" data-icon-replaced="sparkle">
                      <IconSparkle size={20} aria-label="レベルアップ" decorative={false} />
                    </span>
                    <span class="s20-levelup-text">
                      Level Up! Lv.{msg.level} — {msg.title}
                    </span>
                  </div>
                </li>
              );
            }

            if (msg.role === 'ai') {
              // S20-3 AI バブル
              return (
                <li key={msg.id} class="s20-message-item">
                  <div
                    class="s20-bubble-ai"
                    aria-live="polite"
                  >
                    <p class="s20-bubble-ai-text">{msg.text}</p>
                    <time class="s20-bubble-ai-time">{msg.time}</time>
                  </div>
                  {msg.attachment?.type === 'task' && (
                    <TaskProposalCard onAction={logAction} />
                  )}
                  {msg.attachment?.type === 'quest' && (
                    <QuestCard />
                  )}
                </li>
              );
            }

            // S20-4 ユーザーバブル
            return (
              <li key={msg.id} class="s20-message-item s20-message-item-user">
                <div class="s20-bubble-user">
                  <p class="s20-bubble-user-text">{msg.text}</p>
                  <time class="s20-bubble-user-time">{msg.time}</time>
                </div>
              </li>
            );
          })}
          {/* BUG-RT-TALK-CRITICAL-3-FIX (Bug 2): AI 応答待ちインジケータ */}
          {aiPending && (
            <li class="s20-message-item" data-testid="ai-pending">
              <div class="s20-bubble-ai" aria-live="polite">
                <p class="s20-bubble-ai-text" style={{ opacity: 0.6 }}>...</p>
              </div>
            </li>
          )}
        </ol>
      </section>

      {/* S20-8 オートスクロール制御バナー */}
      {showScrollBanner && (
        <button
          type="button"
          class="s20-autoscroll"
          onClick={jumpToBottom}
          aria-label="末尾にスクロール"
        >
          <IconArrowDown size={16} /> 新しいメッセージ
        </button>
      )}

      {/* S20-9 入力バー */}
      {/*
        R2 fix (code_reviewer R-001 / edge_case R-001):
        送信経路を form onSubmit に一本化。ボタンの onClick を撤去し、
        type="submit" 一択で二重送信を排除。canSend ガードを onSubmit 内に移動。
      */}
      <form
        class="s20-input"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSend) return;
          sendMessage();
        }}
        aria-label="メッセージ入力"
      >
        <button
          type="button"
          class="s20-input-clip"
          aria-label="画像を添付"
          onClick={() => logAction('画像添付')}
        >
          <svg viewBox="0 0 22 22" width="22" height="22" aria-hidden="true" focusable="false">
            <path
              d="M15 6 L7.5 13.5 C6.5 14.5, 6.5 16, 7.5 17 C8.5 18, 10 18, 11 17 L18 10 C19.5 8.5, 19.5 6, 18 4.5 C16.5 3, 14 3, 12.5 4.5 L5.5 11.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <label class="s20-input-field-wrapper">
          <span class="s20-visually-hidden">メッセージ</span>
          <textarea
            ref={textareaRef}
            class="s20-input-field"
            value={inputValue}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder="メッセージを入力"
            rows={1}
            aria-label="メッセージ"
          />
        </label>
        <button
          type="submit"
          class={'s20-send ' + (canSend ? 's20-send-active' : 's20-send-disabled')}
          aria-label="送信"
          aria-disabled={sendBtnAriaDisabled}
        >
          <svg viewBox="0 0 22 22" width="20" height="20" aria-hidden="true" focusable="false">
            <path
              d="M4 11 L18 4 L14 11 L18 18 Z"
              fill="currentColor"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </form>

      {/* S20-10 BottomTabBar */}
      <BottomTabBar active="talk" onSelect={handleTabSelect} />
    </main>
  );
}

/*
 * S20-5 タスク提案カード
 * §5.0 A の適用対象は primary CTA / 送信ボタン。本カードのボタンは通常ボタン扱い（§5.0 B inactive = disabled 属性 + 見た目トーンダウン）だが、現時点では有効状態固定。
 */
function TaskProposalCard({ onAction }) {
  return (
    <div class="s20-task-card" role="group" aria-label="タスク提案">
      <p class="s20-task-card-label">タスクにしますか？</p>
      <p class="s20-task-card-name">{TASK_PROPOSAL.name}</p>
      <p class="s20-task-card-time">{TASK_PROPOSAL.time}</p>
      <div class="s20-task-card-actions">
        <button
          type="button"
          class="s20-task-card-primary"
          onClick={() => onAction('タスク登録')}
        >
          登録する
        </button>
        <button
          type="button"
          class="s20-task-card-secondary"
          onClick={() => onAction('タスク編集して登録')}
        >
          編集して登録
        </button>
        <button
          type="button"
          class="s20-task-card-dismiss"
          aria-label="閉じる"
          onClick={() => onAction('タスク提案閉じる')}
        >
          <IconClose size={16} />
        </button>
      </div>
    </div>
  );
}

/*
 * S20-6 冒険 EXP カード
 */
function QuestCard() {
  return (
    <div class="s20-quest" role="group" aria-label="冒険検出">
      <div class="s20-quest-header">
        <span class="s20-quest-icon" data-icon-replaced="sword">
          <IconSword size={20} aria-label="冒険" decorative={false} />
        </span>
        <span class="s20-quest-label">{QUEST.label}</span>
      </div>
      <p class="s20-quest-detail">{QUEST.detail}</p>
      <p class="s20-quest-exp">+{QUEST.exp} EXP</p>
    </div>
  );
}

export default S20Talk;
