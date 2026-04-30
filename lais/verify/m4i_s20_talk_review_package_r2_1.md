# Lais M4-I R2.1 修正レビューパッケージ — S-20 TALK

> R2.1: R2 ラウンドで edge_case_hunter が追加検出した CRITICAL 2 件への対応確認
> 対象ペルソナ: edge_case_hunter（code_reviewer / a11y_engineer は R2 で CRITICAL 0 達成済み）

---

## R2 CRITICAL 対応マッピング

| R2 ID | ペルソナ | 指摘 | R2.1 対応 |
|---|---|---|---|
| R-101 | edge_case_hunter | Enter 送信 + 同フレーム内クリックによる二重送信レース (setInputValue が非同期反映される間にもう一度 sendMessage が走る) | `sendingRef = useRef(false)` を導入し、sendMessage 先頭で `if (sendingRef.current) return` にて再入ブロック。`queueMicrotask` で解除し、次イベントループ以降は正常動作 |
| R-102 | edge_case_hunter | 日本語 IME 変換中 (composition) の Enter で未確定文字が誤送信される | `isComposing` state + `onCompositionStart/End` ハンドラ追加。`handleKeyDown` 冒頭で `isComposing || e.isComposing || e.keyCode === 229` の三重ガードで Enter を無効化 |

---

## 差分（S20Talk.jsx のみ）

```jsx
// R2.1: IME composition トラッキング
const [isComposing, setIsComposing] = useState(false);

// R2.1: 同一フレーム再入ロック
const sendingRef = useRef(false);

const sendMessage = useCallback(() => {
  if (sendingRef.current) return;
  const trimmed = inputValue.trim();
  if (!trimmed) return;
  sendingRef.current = true;
  queueMicrotask(() => { sendingRef.current = false; });
  // ... 送信処理
}, [inputValue, nextMsgId]);

const handleKeyDown = useCallback((e) => {
  // IME 変換中の Enter は無視（三重ガード）
  if (isComposing || e.isComposing || e.keyCode === 229) return;
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}, [sendMessage, isComposing]);

const handleCompositionStart = useCallback(() => setIsComposing(true), []);
const handleCompositionEnd = useCallback(() => setIsComposing(false), []);

// textarea に composition ハンドラを追加
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
```

---

## 実装パッケージ（R2.1 全文）

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
  // R2.1 fix (edge_case R-102): 日本語 IME 変換中の Enter で誤送信しない
  const [isComposing, setIsComposing] = useState(false);

  // R2 fix (edge_case R-001): Date.now() ベース ID は同一 ms 内で衝突する。
  // useRef のインクリメントカウンタで衝突不可能な key を生成する。
  const msgCounterRef = useRef(0);
  const nextMsgId = useCallback((prefix) => {
    msgCounterRef.current += 1;
    return `${prefix}-${msgCounterRef.current}`;
  }, []);

  // R2.1 fix (edge_case R-101): Enter + click の同一フレーム race を防ぐ再入ロック。
  // setInputValue('') が非同期反映されるため、その前に click が走ると
  // canSend クロージャが依然 true で sendMessage が二重実行される。
  // sendingRef でフレーム再入をブロックし、microtask で解除。
  const sendingRef = useRef(false);

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
    // R2.1 fix (edge_case R-101): 同一フレーム再入を無効化
    if (sendingRef.current) return;
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    sendingRef.current = true;
    // microtask 終了時に解除（後続の click/submit を次フレーム以降に委ねる）
    queueMicrotask(() => { sendingRef.current = false; });

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

---

## レビュアーへの依頼（R2.1）

**対象ペルソナ: edge_case_hunter**

R2 CRITICAL 2 件の対応が適切か確認してください。
- Enter/click の同一フレーム二重送信レースが解消されているか
- IME composition 中の Enter で誤送信されないか

それ以外の新規 CRITICAL がない限り、既知 HIGH/MEDIUM は R2 と同様に Phase A 完了後一括対応扱いで保持してください。

JSON 形式で指摘ください（id / severity / category / location / issue / suggestion）。
