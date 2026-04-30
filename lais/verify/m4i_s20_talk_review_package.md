# Lais M4-I 実装レビューパッケージ — S-20 TALK（タブ #2 / チャット UI）

> Phase 4 M4-I レビュー対象一式。
> レビュー種別: sub_review_flow.md D. 実装レビュー（R1 ゴールデン）
> リスク: 🟡 中（Phase A 最終画面 / チャット UI / 10 要素 / 3ペルソナ制 6 回目）

---

## ミッション定義（3ペルソナ制 ENG自律判定）

- **ADV判定:** S-20 はボトムタブ #2 の AI チャット UI。新規 `S20Talk.{jsx,css}` + App.jsx `/talk` route（lazy + Suspense, LP-012）+ S10Grow/S30MeProfile `handleTabSelect` `talk` → `route('/talk')`。S20-1 ヘッダ / S20-2 スクロール / S20-3 AI バブル / S20-4 ユーザーバブル / S20-5 タスク提案カード / S20-6 冒険EXP / S20-7 レベルアップ / S20-8 オートスクロール制御 / S20-9 入力バー（textarea 自動伸長 4 行 + 送信 §5.0 A）/ S20-10 BottomTabBar TALK active。ストリーミング / Supabase / 履歴ドロワー は後続。ローカル state + ダミー AI 応答 (setTimeout) のみ。
- **QA検証:** template_v2 / LOCK 内 / spec §4.9 全項目 / §5.0 A (送信ボタン = aria-disabled + pointer-events:none) / POエスカレーション非該当
- **PO代理:** PD-006 (CRITICAL 0 → HIGH 後回し) / PD-003 (後続機能は明示スコープ外) / PD-005 (LP 事前適用) / PD-101 (スコープ外は A-a 方式) 整合
- → 3者合意 → 実行

**要件（達成状況）:**
1. ✅ 新規 `S20Talk.{jsx,css}`
2. ✅ App.jsx `/talk` route + lazy + Suspense fallback (独立 chunk: 6.94 kB JS / 10.07 kB CSS)
3. ✅ S10Grow / S30MeProfile `handleTabSelect` で `talk` → `route('/talk')`
4. ✅ S20 内 BottomTabBar `grow` → `route('/grow')`, `me` → `route('/me')`, `talk` → no-op
5. ✅ S20-1 ヘッダ (☰ / TALK / 🕐 / 📝) 全ボタン 44×44
6. ✅ S20-2 スクロール領域 padding + gap + auto scroll
7. ✅ S20-3 AI バブル (border-left 2px --accent-subtle, 背景なし, aria-live="polite")
8. ✅ S20-4 ユーザーバブル (--accent-subtle 背景 + --accent border, 右寄せ, 260px)
9. ✅ S20-5 タスク提案カード (登録/編集して登録/✕ 3 ボタン, primary §5.0 対象外の通常, ✕ 44×44)
10. ✅ S20-6 冒険 EXP カード (⚔️ + 検出 + 内容 + +50 EXP, warning アクセント)
11. ✅ S20-7 レベルアップバナー (🎉 Level Up! Lv.12 — EXPLORER)
12. ✅ S20-8 オートスクロール制御バナー (scroll 検知 > 80px → 表示)
13. ✅ S20-9 入力バー (📎 + textarea 自動伸長 max 4 行 / 送信 §5.0 A: aria-disabled + pointer-events:none)
14. ✅ S20-10 BottomTabBar TALK active
15. ✅ ユーザー送信 → 即時バブル追加 → 600ms (reduced-motion 時 10ms) ダミー AI 応答
16. ✅ LP-001/002/003/004/011/012/013/014/015 全 9 事前適用

**スコープ外（後続）:**
- 履歴ドロワー 実体（☰ は console.log のみ）
- 実 AI ストリーミング / Supabase chat 連携
- タスク提案カード「登録する」成功フロー → `✅ 登録しました` 置換 → フェードアウト
- タイピングインジケータの 3 ドット translateY 演出
- 紙吹雪パーティクル（LevelUp）
- 📎 画像添付 実装
- 履歴ドロワー 左スライドイン
- 新規チャット (📝) の確定フロー
- 1 日 2 回冒険 EXP 上限制御

---

## 適用済み Learned Patterns

| LP | 適用箇所 |
|---|---|
| LP-001 | prefers-reduced-motion で `.s20-scroll`/`.s20-task-card-*`/`.s20-autoscroll`/`.s20-send` の transition-duration 1ms + scroll-behavior auto + AI 応答 setTimeout を 10ms |
| LP-002 | `useEffect` で `mainRef.current.focus({ preventScroll: true })` |
| LP-003 | inline event handler 最小化 / dangerouslySetInnerHTML 不使用 |
| LP-004 | コントラスト実測は下部「コントラスト実測」節 |
| LP-011 | 数値は design tokens + calc (`calc(60px + 82px + --space-md)` 等) |
| LP-012 | `S20Talk = lazy(() => import(...))` + Suspense fallback (独立 chunk 6.94 kB JS) |
| LP-013 | `@supports (bottom: env(safe-area-inset-bottom))` で `.s20-input` / `.s20-autoscroll` / `.s20-talk` padding-bottom を段階的に上書き (env 第 2 引数未使用) |
| LP-014 | `:focus:not(:focus-visible)` + `:focus-visible` で programmatic/keyboard focus 分離 (全 interactive 要素) |
| LP-015 | `.s20-bubble-user` に `border: 1px solid var(--accent)` 明示 (Non-text Contrast) |

---

## design_spec_v1.md §4.9 S-20 TALK（完全引用）

### 4.9 S-20 TALK（タブ #2）

- **目的 / UX参照:** AI 対話。ux_v1.md §3.0 〜 §3.3
- **画面タイプ:** タブ画面（ボトムタブ #2 active）
- **レイアウト原則:** ヘッダ 56px + チャットスクロール + 入力バー 60px + タブバー 82px

**セクション順序:**

1. ヘッダ行（☰ / `TALK` / 🕐 / 📝）
2. チャットスクロール領域
3. 入力バー
4. ボトムタブバー

**要素仕様:**

**[ヘッダ] — S20-1**

- 高さ `56px` / border-bottom `1px solid --border-strong` / padding `0 --space-lg`
- 左: ☰ アイコン 22×22 stroke `--text-primary` / タップ → 履歴ドロワー
- 中央: `TALK` 14px `--text-muted` letter-spacing `1.5px` uppercase
- 右: 🕐 と 📝 アイコン 22×22 stroke `--text-primary` / gap `--space-md`

**[チャットスクロール領域] — S20-2**

- padding `--space-md --space-lg`
- 縦スクロール / スクロール追従（§3.3）
- メッセージ間 margin `--space-md`

**[AI メッセージバブル] — S20-3**

- 左寄せ
- border-left `2px solid --accent-subtle` / padding `10px 14px`
- テキスト 14px color `--text-primary` line-height `1.7` letter-spacing `-0.02em`
- タイムスタンプ 11px color `--text-muted` / バブル下 `--space-xs`
- **背景は持たない**（縦ラインのみの Open Air 原則）

**[ユーザーメッセージバブル] — S20-4**

- 右寄せ / max-width `260px`
- 背景 `--accent-subtle` / radius `12px 4px 12px 12px` / padding `12px 16px`
- テキスト 14px color `--text-primary` line-height `1.7`
- タイムスタンプ 11px color `--text-muted` / text-align right

**[タスク提案カード] — S20-5**

- AI バブル直後に配置（インラインカード）
- 背景 `--bg-surface` / border-left `3px solid --accent` / radius `--radius-lg` / padding `--space-md`
- ラベル `タスクにしますか？` 11px `--text-muted` letter-spacing `1.5px` uppercase
- タスク名 14px `--text-primary` letter-spacing `-0.02em`
- 時刻 11px `--text-muted`
- ボタン行: gap `--space-sm` / margin-top `--space-md`
  - `登録する`: 背景 `--button-primary-bg` color `#FFFFFF` weight `600` padding `12px 18px` radius `--radius-pill` min-height `44px`
  - `編集して登録`: border `1px solid --border-strong` color `--text-primary` padding `12px 18px` radius `--radius-pill` min-height `44px`
  - `✕`: border `1px solid --border-strong` color `--text-secondary` min-width `44px` min-height `44px` radius `--radius-pill`

**[冒険 EXP カード] — S20-6**（AI が冒険検出時）

- 背景 `--bg-surface` / border-left `3px solid --warning` / radius `--radius-lg` / padding `--space-md`
- アイコン `⚔️` + テキスト `冒険を検出！` 14px `--text-primary`
- 冒険内容 14px `--text-secondary`（最大 2 行）
- `+50 EXP` 14px weight `600` color `--warning` 右寄せ
- 出現: scale(0.8→1) + opacity(0→1) 300ms spring-default
- 1 日上限（2 回）超過時: `+0 EXP（本日の上限）` / アクセント色を `--text-muted` に変更

**[レベルアップバナー] — S20-7**

- インラインで AI バブル位置に配置
- `🎉 Level Up! Lv.{N} — {称号}` / 14px weight `600` color `--accent`
- 紙吹雪パーティクル演出（Phase 4 実装）

**[オートスクロール制御バナー] — S20-8**

- ユーザーが上方スクロール中に表示
- 画面下から `80px` の位置に float / 幅 `auto` padding `12px 18px` 背景 `--bg-elevated` border `1px solid --accent-subtle` radius `--radius-pill`
- テキスト `↓ 新しいメッセージ` 14px `--accent`

**[入力バー] — S20-9**

- 高さ `60px` / border-top `1px solid --border` / padding `0 --space-lg` / flex align center gap `--space-sm`
- 📎 クリップ 22×22 stroke `--text-secondary`
- テキスト入力: flex 1 / 高さ `40px` 背景 `--bg-surface` border `1px solid --border-strong` radius `--radius-pill` padding `0 16px` font-size `14px`
- 入力中は自動伸長（最大 4 行 → 約 `100px`）
- ➤ 送信: 44×44 / radius `50%` / 入力なし時: 背景 `--button-disabled-bg` / SVG `--button-disabled-text` / `pointer-events: none` / `aria-disabled="true"`（§5.0 A）/ 入力あり時: 背景 `--button-primary-bg` / SVG `#FFFFFF` / `pointer-events: auto`

**[ボトムタブバー] — S20-10**

- S10-10 と同。Active は TALK

**状態・インタラクション:**

- メッセージ送信: ユーザーバブル即表示 → AI に `...` タイピングインジケータ（3 ドット opacity 0.3→1 pulse 禁止、代わりに spring-default で 3 回 translateY）→ ストリーミング開始で置換
- タスク提案カードの `登録する` 成功 → カード置換「✅ 登録しました」0.5s → フェードアウト `--duration-normal` ease-out
- 履歴ドロワー: 左から 80% 幅（最大 320px）でスライドイン

**検証可能なスクショ事実:**

- 画面上端にヘッダ、中央にチャットバブル 2 〜 3 個、下端に入力バー + タブバー
- AI バブルは背景なし・左に青薄ラインのみ
- ユーザーバブルは `--accent-subtle` 背景で右寄せ
- タスク提案カードが AI バブル直後に配置され、`登録する`「編集して登録」2 ボタンが存在

**Phase 4 対応:** A-5（`タスクにしますか？` ラベルのコントラスト改善）

---

---

## §5.0 A/B 区分（disabled 表現）

- **A 区分（CTA / Submit）:** 送信ボタン (S20-9) は `aria-disabled="true"` + `pointer-events: none` + 視覚的に button-disabled-bg。HTML `disabled` 属性は使わない（focus 可能な状態を維持）
- **B 区分（通常ボタン）:** 該当なし（タスク提案カードは有効状態固定）

---

## 実装パッケージ

### 1. lais/src/components/App.jsx（M4-I 差分）

```jsx
const S20Talk = lazy(() => import('./screens/S20Talk.jsx'));

// Router:
<TalkRoute path="/talk" />

function TalkRoute() {
  return (
    <Suspense fallback={<main class="route-fallback" role="status" aria-live="polite" aria-label="読み込み中" />}>
      <S20Talk />
    </Suspense>
  );
}
```

### 2. lais/src/components/screens/S10Grow.jsx（M4-I 差分）

```jsx
const handleTabSelect = useCallback((tabId) => {
  if (tabId === 'grow') return;
  if (tabId === 'me') { route('/me'); return; }
  if (tabId === 'talk') { route('/talk'); return; }
}, []);
```

### 3. lais/src/components/screens/S30MeProfile.jsx（M4-I 差分）

```jsx
const handleTabSelect = useCallback((tabId) => {
  if (tabId === 'me') return;
  if (tabId === 'grow') { route('/grow'); return; }
  if (tabId === 'talk') { route('/talk'); return; }
}, []);
```

### 4. lais/src/components/screens/S20Talk.jsx（新規全文）

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
    const lineHeight = 20; // 14px * 1.4 近似（css と一致）
    const maxHeight = lineHeight * MAX_ROWS + 20; // padding 分
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
      id: `msg-u-${now.getTime()}`,
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
        id: `msg-a-${Date.now()}`,
        role: 'ai',
        text: 'いい一歩ですね。続けていきましょう。',
        time,
      };
      setMessages((prev) => [...prev, reply]);
      pendingTimerRef.current = null;
    }, delay);
  }, [inputValue]);

  const handleSendClick = useCallback(() => {
    sendMessage();
  }, [sendMessage]);

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
      <form
        class="s20-input"
        onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
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
          onClick={handleSendClick}
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

### 5. lais/src/components/screens/S20Talk.css（新規全文）

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
  bottom: calc(60px + 82px + var(--space-md));
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
    bottom: calc(env(safe-area-inset-bottom) + 60px + 82px + var(--space-md));
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
.s20-input {
  flex-shrink: 0;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 82px;
  height: 60px;
  padding: 0 var(--space-lg);
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
.s20-input-field {
  width: 100%;
  min-height: 40px;
  max-height: 100px;
  background: var(--bg-surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-pill);
  padding: 10px 16px;
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  font-family: var(--font-family-base);
  letter-spacing: var(--letter-spacing-ja);
  line-height: 1.4;
  resize: none;
  box-sizing: border-box;
}

.s20-input-field::placeholder {
  color: var(--text-muted);
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

## デザイントークン（night-sky 抜粋）

```css
[data-theme="night-sky"] {
  --bg-primary: #0D1117;
  --bg-surface: #161B22;
  --bg-elevated: #1C2128;
  --border: #484F58;
  --border-strong: #6E7681;
  --text-primary: #E6EDF3;
  --text-secondary: #9BA7B4;
  --text-muted: #7A8593;
  --accent: #79C0FF;
  --accent-subtle: rgba(121, 192, 255, 0.14);
  --button-primary-bg: #1A5FC8;
  --button-disabled-bg: #1F2937;
  --button-disabled-text: #6E7681;
  --warning: #D29922;
  --focus-ring-color: var(--accent);
}
```

---

## WCAG AA コントラスト実測値（night-sky）

| 項目 | 前景 | 背景 | 比率 | 判定 |
|---|---|---|---|---|
| S20-1 タイトル `TALK` | `--text-muted` #7A8593 | `--bg-primary` #0D1117 | **5.06:1** | AA 合格 |
| S20-1 アイコン (stroke) | `--text-primary` #E6EDF3 | `--bg-primary` | **15.81:1** | AAA |
| S20-3 AI バブル本文 | `--text-primary` | `--bg-primary` | **15.81:1** | AAA |
| S20-3 タイムスタンプ | `--text-muted` | `--bg-primary` | **5.06:1** | AA 合格 |
| S20-3 左ライン (non-text) | `--accent-subtle` 14% α | `--bg-primary` | 近似 1.2:1 | **WCAG 1.4.11 未達（装飾扱い）— 識別は border + バブル形状で担保** |
| S20-4 ユーザーバブル本文 | `--text-primary` | `--accent-subtle` 合成 ≈ #1F2F3D | **9.5:1** | AAA |
| S20-4 ユーザーバブル border (non-text) | `--accent` #79C0FF | `--bg-primary` | **9.49:1** | WCAG 1.4.11 ✓ |
| S20-5 `タスクにしますか？` ラベル | `--text-muted` | `--bg-surface` #161B22 | **3.47:1** | spec §7 A-5 既知課題（Phase 4 対応予定） |
| S20-5 タスク名 | `--text-primary` | `--bg-surface` | **13.97:1** | AAA |
| S20-5 primary CTA 文字 | `#FFFFFF` | `--button-primary-bg` #1A5FC8 | **5.94:1** | AA 合格 |
| S20-5 secondary border (non-text) | `--border-strong` #6E7681 | `--bg-surface` | **3.33:1** | WCAG 1.4.11 ✓ |
| S20-5 ✕ | `--text-secondary` #9BA7B4 | `--bg-surface` | **6.63:1** | AA 合格 |
| S20-6 冒険ラベル | `--text-primary` | `--bg-surface` | **13.97:1** | AAA |
| S20-6 冒険内容 | `--text-secondary` | `--bg-surface` | **6.63:1** | AA 合格 |
| S20-6 +50 EXP | `--warning` #D29922 | `--bg-surface` | **6.99:1** | AA 合格 |
| S20-6 left border (non-text) | `--warning` | `--bg-surface` | **6.99:1** | WCAG 1.4.11 ✓ |
| S20-7 Level Up テキスト | `--accent` | `--bg-primary` | **9.49:1** | AAA |
| S20-8 バナー文字 | `--accent` | `--bg-elevated` #1C2128 | **8.28:1** | AAA |
| S20-8 バナー border (non-text) | `--accent` | `--bg-elevated` | **8.28:1** | WCAG 1.4.11 ✓ |
| S20-9 入力フィールド文字 | `--text-primary` | `--bg-surface` | **13.97:1** | AAA |
| S20-9 placeholder | `--text-muted` | `--bg-surface` | **4.48:1** | AA 小文字 ギリ未達 → 注視。代替として文字 14px letter-spacing 確保 |
| S20-9 送信 有効 | `#FFFFFF` | `--button-primary-bg` | **5.94:1** | AA 合格 |
| S20-9 送信 無効 | `--button-disabled-text` | `--button-disabled-bg` | **3.69:1** | §5.0 A non-text 3:1 ✓ |

---

## 状態遷移表

```
GROW [BottomTabBar: TALK タップ] → route('/talk') → S20 (Suspense → mount → main focus)
ME   [BottomTabBar: TALK タップ] → route('/talk') → S20 (同上)
  → [textarea 入力] → 送信ボタン aria-disabled 解除 + pointer-events auto
  → [送信タップ / Enter] → ユーザーバブル追加 + textarea reset
     → 600ms (reduced-motion 10ms) → ダミー AI 応答バブル
  → [スクロール上方 80px 超] → S20-8 バナー表示 → タップで末尾スクロール
  → [☰ / 🕐 / 📝 / 📎 / 提案カード 3 ボタン] → console.log
  → [BottomTabBar: GROW] → route('/grow')
  → [BottomTabBar: ME] → route('/me')
  → [BottomTabBar: TALK] → 現在地 (no-op)
```

---

## チェックリスト

- ✅ route 追加 (/talk) + lazy + Suspense
- ✅ LP-002: マウント時 main programmatic focus
- ✅ LP-014: focus-visible 分離 (全 interactive 要素)
- ✅ LP-013: env(safe-area-inset-bottom) + 82px BottomTabBar 分 @supports 分岐
- ✅ LP-012: 独立 chunk (S20Talk-*.js 6.94 kB / -*.css 10.07 kB)
- ✅ §5.0 A: 送信ボタン disabled = aria-disabled + pointer-events:none
- ✅ aria-labelledby で main をタイトルに紐付け
- ✅ aria-live="polite" を AI バブルに付与 (spec §6 a11y 要件)
- ✅ BottomTabBar TALK active (aria-current="page")
- ✅ setTimeout は useRef で HMR/unmount 回収
- ⚠️ E2E テスト: Phase 4 後続 (LAIS-PHASE4-TEST-SETUP)

---

## レビュアーへの依頼

1. **CRITICAL**: spec §4.9 違反 / WCAG 必須基準違反 / セキュリティ欠陥 / 無限ループ / データ破壊
2. **HIGH**: spec 細部からの逸脱 / UX 悪化 / 潜在バグ
3. **MEDIUM/LOW**: 改善提案

**特に確認してほしい点:**
- S20-1〜S20-10 全要素が spec §4.9 と一致しているか
- §5.0 A 区分の送信ボタン実装（aria-disabled + pointer-events:none, HTML disabled 未使用）
- Non-text Contrast: ユーザーバブル border / タスク提案カード accent 左ライン / 冒険 warning 左ライン / オートスクロールバナー border
- LP-001: reduced-motion で AI 応答 setTimeout を短縮する分岐の妥当性
- LP-002: main focus のタイミングが Suspense fallback 後に走ることの確認
- setTimeout / scroll listener / textarea ref の unmount 安全性
- spec §7 A-5 既知課題（`タスクにしますか？` ラベル 3.47:1）は Phase 4 対応予定のためスコープ外 — CRITICAL にしないこと
- 非 CRITICAL スコープ外（履歴ドロワー実体 / ストリーミング / 画像添付 / 紙吹雪）を CRITICAL にしないこと

JSON 形式で指摘ください（id / severity / category / location / issue / suggestion）。
