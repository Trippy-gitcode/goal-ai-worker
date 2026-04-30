# Lais M4-I R2 修正レビューパッケージ — S-20 TALK

> Phase 4 M4-I R2 レビュー対象一式。
> レビュー種別: sub_review_flow.md D. 実装レビュー（R2 修正ラウンド）
> R1 CRITICAL 4 件の対応確認。対象ペルソナ: code_reviewer / a11y_engineer / edge_case_hunter

---

## R1 CRITICAL 対応マッピング

| R1 ID | ペルソナ | 指摘 | R2 対応 |
|---|---|---|---|
| R-001 | code_reviewer | 送信ボタン onClick と form onSubmit の両方で sendMessage → 二重送信 | ボタンの onClick を撤去し、type="submit" のみで発火。onSubmit 内に canSend ガード移動。handleSendClick 削除 |
| R-001 | a11y_engineer | .s20-input-field::placeholder のコントラスト 4.48:1 (WCAG 1.4.3 AA 4.5:1 未達) | placeholder 色 --text-muted → --text-secondary (#9BA7B4)。--bg-surface 上で 6.63:1 達成。opacity:1 で Firefox dim 無効化 |
| R-002 | a11y_engineer | .s20-input-field min-height 40px (44×44 未達) | min-height: var(--tap-target-min) (44px)。padding 10 → 12px。.s20-input 全体 min-height 68px に波及。.s20-autoscroll bottom calc も同期 |
| R-001 | edge_case_hunter | 送信ボタン二重呼び出し + Date.now() ベース id 衝突 | 送信統一 (同上) + useRef カウンタ msgCounterRef + nextMsgId(prefix) で衝突不可能 ID 生成 |

**他 HIGH 30 件は Phase A 完了後一括対応 (PD-006)。**

---

## R1 スコープ外の扱い

- spec §7 A-5 既知課題 (タスクにしますか？ 3.47:1) → 事前宣言通りスコープ外
- 履歴ドロワー / ストリーミング / 画像添付 / 紙吹雪 → 事前宣言通りスコープ外

---

## 実装パッケージ（R2 全文）

### S20Talk.jsx

```jsx
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { BottomTabBar } from '../shared/BottomTabBar.jsx';
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

const INITIAL_MESSAGES = [
  {
    id: 'msg-1',
    role: 'ai',
    text: 'おかえりなさい。今日のタスクはどう進んでいますか？',
    time: '09:30',
  },
  {
    id: 'msg-2',
    role: 'user',
    text: '朝のストレッチをやったよ',
    time: '09:31',
  },
  {
    id: 'msg-3',
    role: 'ai',
    text: '素晴らしいですね。続けやすくするために、小さなタスクに落としておきましょう。',
    time: '09:31',
    attachment: { type: 'task' },
  },
  {
    id: 'msg-4',
    role: 'ai',
    text: '今朝の 5 分ストレッチは、昨日から始めた新しい冒険ですね。',
    time: '09:32',
    attachment: { type: 'quest' },
  },
  {
    id: 'msg-5',
    role: 'system',
    kind: 'levelup',
    level: 12,
    title: 'EXPLORER',
  },
];

const TASK_PROPOSAL = {
  name: '朝のストレッチ 5 分',
  time: '毎朝 07:00',
};

const QUEST = {
  label: '冒険を検出！',
  detail: '新しい朝の習慣：5 分ストレッチ',
  exp: 50,
};

const AI_REPLY_DELAY_MS = 600;
const AI_REPLY_DELAY_REDUCED_MS = 10;
const MAX_ROWS = 4;

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function S20Talk() {
  const titleId = useId();
  const mainRef = useRef(null);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const pendingTimerRef = useRef(null);

  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [showScrollBanner, setShowScrollBanner] = useState(false);

  // R2 fix (edge_case R-001): Date.now() ベース ID は同一 ms 内で衝突する。
  // useRef のインクリメントカウンタで衝突不可能な key を生成する。
  const msgCounterRef = useRef(0);
  const nextMsgId = useCallback((prefix) => {
    msgCounterRef.current += 1;
    return `${prefix}-${msgCounterRef.current}`;
  }, []);

  // LP-002: main focus
  useEffect(() => {
    if (mainRef.current) mainRef.current.focus({ preventScroll: true });
  }, []);

  // unmount / HMR 時の setTimeout 回収
  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
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

  const sendMessage = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const time = `${hh}:${mm}`;

    const userMsg = {
      id: nextMsgId('msg-u'),
      role: 'user',
      text: trimmed,
      time,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    // textarea リサイズリセット
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // ダミー AI 応答
    const delay = prefersReducedMotion() ? AI_REPLY_DELAY_REDUCED_MS : AI_REPLY_DELAY_MS;
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = setTimeout(() => {
      const reply = {
        id: nextMsgId('msg-a'),
        role: 'ai',
        text: 'いい一歩ですね。続けていきましょう。',
        time,
      };
      setMessages((prev) => [...prev, reply]);
      pendingTimerRef.current = null;
    }, delay);
  }, [inputValue, nextMsgId]);

  const handleKeyDown = useCallback((e) => {
    // Enter = 送信 / Shift+Enter = 改行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const logAction = useCallback((label) => {
    // eslint-disable-next-line no-console
    console.log(`[S20] ${label} (後続)`);
  }, []);

  const sendBtnAriaDisabled = !canSend;

  return (
    <main
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
                    <span class="s20-levelup-icon" aria-hidden="true">🎉</span>
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
          ↓ 新しいメッセージ
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
          ✕
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
        <span class="s20-quest-icon" aria-hidden="true">⚔️</span>
        <span class="s20-quest-label">{QUEST.label}</span>
      </div>
      <p class="s20-quest-detail">{QUEST.detail}</p>
      <p class="s20-quest-exp">+{QUEST.exp} EXP</p>
    </div>
  );
}

export default S20Talk;
```

### S20Talk.css

```css
/*
 * S-20 TALK — design_spec_v1.md §4.9 準拠
 * タブ画面 / チャット UI
 *
 * Learned Patterns 事前適用:
 * - LP-001: prefers-reduced-motion 縮退
 * - LP-011: 数値は design tokens / calc で依存関係明示
 * - LP-013: env(safe-area-inset-bottom) は @supports 分岐で第 2 引数未使用
 * - LP-014: :focus-visible と programmatic focus の分離
 * - LP-015: Active 状態に border-color を可視で残す
 * - LP-017 候補: タップ領域 44×44 を min-height + min-width + inline-flex + padding で確保
 *
 * コントラスト実測（Night Sky, #0D1117 背景系）:
 * - --text-primary #E6EDF3 on --bg-primary #0D1117 = 14.7:1 AA/AAA
 * - --text-muted #6E7681 on --bg-primary #0D1117 = 4.12:1 AA (small text 4.5:1 未達ではあるため label は 11px + letter-spacing で運用)
 * - --accent #79C0FF on --bg-primary #0D1117 = 9.49:1 AA/AAA
 * - --accent #79C0FF on --bg-surface #161B22 = 8.46:1 AA/AAA
 * - タイムスタンプ 11px --text-muted は §7 A-5 指摘の対象。--bg-elevated / --accent で別途対応検討中
 */

/* Container ------------------------------------------------------------- */
.s20-talk {
  min-height: 100dvh;
  max-height: 100dvh;
  background: var(--bg-primary);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: calc(82px); /* BottomTabBar */
}

@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .s20-talk {
    padding-bottom: calc(env(safe-area-inset-bottom) + 82px);
  }
}

.s20-talk:focus:not(:focus-visible) { outline: none; }
.s20-talk:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: calc(var(--focus-ring-offset) * -1);
}

.s20-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

/* S20-1 ヘッダ --------------------------------------------------------- */
.s20-header {
  flex-shrink: 0;
  height: 56px;
  padding: 0 var(--space-lg);
  border-bottom: 1px solid var(--border-strong);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-primary);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

.s20-header-title {
  font-size: var(--font-size-sm); /* 14px */
  color: var(--text-muted);
  letter-spacing: var(--letter-spacing-label);
  text-transform: uppercase;
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-label);
  margin: 0;
}

.s20-header-right {
  display: inline-flex;
  align-items: center;
  gap: var(--space-md);
}

/* LP-017: min-height + min-width + inline-flex + padding */
.s20-header-icon-btn {
  background: transparent;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  min-width: var(--tap-target-min);
  min-height: var(--tap-target-min);
  padding: 11px;
  margin: -11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
}

.s20-header-icon-btn:focus:not(:focus-visible) { outline: none; }
.s20-header-icon-btn:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

/* S20-2 スクロール領域 ------------------------------------------------ */
.s20-scroll {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-md) var(--space-lg);
  /* 入力バー 60px 分の余白 */
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.s20-scroll:focus:not(:focus-visible) { outline: none; }
.s20-scroll:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: calc(var(--focus-ring-offset) * -1);
}

.s20-message-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.s20-message-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-sm);
}

.s20-message-item-user {
  align-items: flex-end;
}

/* S20-3 AI バブル ----------------------------------------------------- */
.s20-bubble-ai {
  max-width: 280px;
  border-left: 2px solid var(--accent-subtle);
  padding: 10px 14px;
  background: transparent; /* Open Air 原則 */
}

.s20-bubble-ai-text {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  line-height: var(--line-height-ja-body);
  letter-spacing: var(--letter-spacing-ja);
  margin: 0;
}

.s20-bubble-ai-time {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin-top: var(--space-xs);
}

/* S20-4 ユーザーバブル ------------------------------------------------ */
/*
 * LP-015: accent-subtle 塗り + border で non-text contrast 確保
 *   --accent on --bg-primary = 9.49:1 で 3:1 要件クリア
 */
.s20-bubble-user {
  max-width: 260px;
  background: var(--accent-subtle);
  border: 1px solid var(--accent);
  border-radius: 12px 4px 12px 12px;
  padding: 12px 16px;
}

.s20-bubble-user-text {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  line-height: var(--line-height-ja-body);
  letter-spacing: var(--letter-spacing-ja);
  margin: 0;
}

.s20-bubble-user-time {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  text-align: right;
  margin-top: var(--space-xs);
}

/* S20-5 タスク提案カード ---------------------------------------------- */
.s20-task-card {
  background: var(--bg-surface);
  border-left: 3px solid var(--accent);
  border-top: 1px solid var(--border);
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  max-width: 320px;
  align-self: flex-start;
}

.s20-task-card-label {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-label);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-label);
  margin: 0 0 var(--space-sm);
}

.s20-task-card-name {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  letter-spacing: var(--letter-spacing-ja);
  line-height: var(--line-height-ja-body);
  margin: 0;
}

.s20-task-card-time {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin: var(--space-xs) 0 0;
}

.s20-task-card-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-md);
  flex-wrap: wrap;
}

.s20-task-card-primary {
  background: var(--button-primary-bg);
  color: #FFFFFF;
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
  font-family: var(--font-family-base);
  border: 1px solid var(--button-primary-bg);
  border-radius: var(--radius-pill);
  padding: 12px 18px;
  min-height: var(--tap-target-min);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--duration-fast) var(--ease-out);
}

.s20-task-card-secondary {
  background: transparent;
  color: var(--text-primary);
  font-weight: var(--font-weight-regular);
  font-size: var(--font-size-sm);
  font-family: var(--font-family-base);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-pill);
  padding: 12px 18px;
  min-height: var(--tap-target-min);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--duration-fast) var(--ease-out);
}

.s20-task-card-dismiss {
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  font-family: var(--font-family-base);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-pill);
  min-width: var(--tap-target-min);
  min-height: var(--tap-target-min);
  padding: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--duration-fast) var(--ease-out);
}

.s20-task-card-primary:focus:not(:focus-visible),
.s20-task-card-secondary:focus:not(:focus-visible),
.s20-task-card-dismiss:focus:not(:focus-visible) { outline: none; }
.s20-task-card-primary:focus-visible,
.s20-task-card-secondary:focus-visible,
.s20-task-card-dismiss:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

/* S20-6 冒険 EXP カード ----------------------------------------------- */
.s20-quest {
  background: var(--bg-surface);
  border-left: 3px solid var(--warning);
  border-top: 1px solid var(--border);
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  max-width: 320px;
  align-self: flex-start;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.s20-quest-header {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

.s20-quest-icon {
  font-size: var(--font-size-base);
  line-height: 1;
}

.s20-quest-label {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  letter-spacing: var(--letter-spacing-ja);
}

.s20-quest-detail {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: var(--line-height-ja-body);
  margin: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.s20-quest-exp {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--warning);
  text-align: right;
  margin: 0;
}

/* S20-7 レベルアップバナー ------------------------------------------- */
.s20-levelup {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  align-self: flex-start;
  padding: 10px 14px;
}

.s20-levelup-icon {
  font-size: var(--font-size-base);
}

.s20-levelup-text {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--accent);
  letter-spacing: var(--letter-spacing-ja);
}

/* S20-8 オートスクロール制御バナー ----------------------------------- */
/*
 * 入力バー 60px + BottomTabBar 82px + 余白 を避けて float
 * LP-011: 数値は変数同士の calc で依存関係を明示
 */
.s20-autoscroll {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(68px + 82px + var(--space-md));
  padding: 12px 18px;
  background: var(--bg-elevated);
  border: 1px solid var(--accent);
  color: var(--accent);
  font-size: var(--font-size-sm);
  font-family: var(--font-family-base);
  border-radius: var(--radius-pill);
  cursor: pointer;
  z-index: var(--z-sticky);
  min-height: var(--tap-target-min);
  min-width: var(--tap-target-min);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--duration-fast) var(--ease-out);
}

@supports (bottom: env(safe-area-inset-bottom)) {
  .s20-autoscroll {
    bottom: calc(env(safe-area-inset-bottom) + 68px + 82px + var(--space-md));
  }
}

.s20-autoscroll:focus:not(:focus-visible) { outline: none; }
.s20-autoscroll:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

/* S20-9 入力バー ------------------------------------------------------ */
/*
 * BottomTabBar (82px) の上に固定。safe-area-inset-bottom は @supports で
 * フォールバック値を使わず段階的に上書き（LP-013）。
 */
/*
 * R2 fix (a11y R-002 波及): textarea min-height を 44px に引き上げたことに伴い、
 * 入力バー全体の最小高さも 60px → 68px に拡張（44 + 上下 12px 余白）。
 * spec §4.9 S20-9 「高さ 60px」は 40px textarea 前提のため、a11y 優先で上書き（Phase 4 対応候補）
 */
.s20-input {
  flex-shrink: 0;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 82px;
  min-height: 68px;
  padding: 12px var(--space-lg);
  border-top: 1px solid var(--border);
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  z-index: var(--z-sticky);
}

@supports (bottom: env(safe-area-inset-bottom)) {
  .s20-input {
    bottom: calc(env(safe-area-inset-bottom) + 82px);
  }
}

.s20-input-clip {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  min-width: var(--tap-target-min);
  min-height: var(--tap-target-min);
  padding: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
}

.s20-input-clip:focus:not(:focus-visible) { outline: none; }
.s20-input-clip:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

.s20-input-field-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
}

/*
 * 自動伸長 textarea
 * max 4 行 ≈ 100px
 */
/*
 * R2 fix (a11y R-002): min-height 40px → 44px（タップ領域 44×44 を充足）
 * padding を 12px に引き上げて 1 行時も 44px を維持（12+20+12=44）
 */
.s20-input-field {
  width: 100%;
  min-height: var(--tap-target-min);
  max-height: 104px;
  background: var(--bg-surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-pill);
  padding: 12px 16px;
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  font-family: var(--font-family-base);
  letter-spacing: var(--letter-spacing-ja);
  line-height: 1.4;
  resize: none;
  box-sizing: border-box;
}

/*
 * R2 fix (a11y R-001): placeholder contrast 4.48:1 → 6.63:1 に引き上げ
 * --text-muted #7A8593 (4.48:1) ではなく --text-secondary #9BA7B4 (6.63:1 on --bg-surface) を使用
 * WCAG 2.2 AA 1.4.3 最低コントラスト 4.5:1 をクリア
 */
.s20-input-field::placeholder {
  color: var(--text-secondary);
  opacity: 1; /* Firefox のデフォルト dim 化を無効化 */
}

.s20-input-field:focus:not(:focus-visible) { outline: none; }
.s20-input-field:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

/*
 * §5.0 A 区分: 送信ボタンの disabled は aria-disabled + pointer-events:none
 * HTML disabled 属性は使わず、見た目と aria を分離
 */
.s20-send {
  width: var(--tap-target-min);
  height: var(--tap-target-min);
  min-width: var(--tap-target-min);
  min-height: var(--tap-target-min);
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background var(--duration-fast) var(--ease-out);
  padding: 0;
}

.s20-send-active {
  background: var(--button-primary-bg);
  color: #FFFFFF;
}

.s20-send-disabled {
  background: var(--button-disabled-bg);
  color: var(--button-disabled-text);
  pointer-events: none;
}

.s20-send:focus:not(:focus-visible) { outline: none; }
.s20-send:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

/* LP-001: prefers-reduced-motion 縮退 -------------------------------- */
@media (prefers-reduced-motion: reduce) {
  .s20-scroll {
    scroll-behavior: auto;
  }
  .s20-task-card-primary,
  .s20-task-card-secondary,
  .s20-task-card-dismiss,
  .s20-autoscroll,
  .s20-send {
    transition-duration: 1ms !important;
  }
}
```

---

## レビュアーへの依頼（R2）

**対象ペルソナ: code_reviewer / a11y_engineer / edge_case_hunter**

R1 CRITICAL 4 件の対応が適切か確認してください。
以下のいずれかに該当すれば CRITICAL として再報告してください:
- 送信二重発火が依然残っている
- placeholder コントラストが依然 4.5:1 未満
- タップ領域が依然 44×44 未満
- msg ID 衝突が依然残っている

HIGH 以下は R1 と同じ方針（Phase A 完了後一括対応）のため、R2 では CRITICAL のみ評価してください。

JSON 形式で指摘ください（id / severity / category / location / issue / suggestion）。
