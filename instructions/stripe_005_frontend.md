# GOAL AI — Stripe従量課金 Part 5/5: フロントエンド
> Claude Code用 / 作成：2026-03-20
> INSTRUCTION_ID: STRIPE-005-FRONTEND
> REQUIRES_VERSION: v3.9.2（STRIPE-004-API-WEBHOOK適用後）
> リスクレベル: 🟡中（UI変更のみ。Worker側ロジック変更なし）
> 依存: STRIPE-004-API-WEBHOOK（完了必須）
> 次: DESIGN-IMPL-001

---

## ⚠ 注意事項

### 1. 既存のサイドバー・チャット・フッター構造を壊さない。追加のみ。
### 2. CSS変数を使用。ハードコード色禁止。

---

## 概要

| 機能 | 説明 |
|------|------|
| **利用額バー** | サイドバーに「今月: ¥2,150 / ¥2,980」進捗バー |
| **節約額表示** | 「3社別々より¥6,850お得」 |
| **キャップ通知** | 80%接近/100%到達トースト + アップグレード導線 |
| **フェアユース通知** | 5h窓/週間窓超過トースト |
| **復帰通知** | 「通常モードに戻りました」トースト |
| **月初リセット通知** | 「利用額がリセットされました」トースト |
| **降格バッジ** | フッターに稲妻SVG +「軽量モード」テキスト |

---

## 事前grep確認

```bash
# サイドバーの構造を確認
grep -n "sidebar\|side-bar\|sidebarContent" frontend/index.html
# → 利用額バーを追加する場所を特定

# フッターのモデル名表示
grep -n "formatModelName\|model-name\|X-Model-Used" frontend/index.html
# → 降格バッジを追加する場所を特定

# SSEパース処理
grep -n "data.*DONE\|EventSource\|onmessage\|text/event-stream" frontend/index.html
# → metadataハンドリングを追加する場所を特定

# showToastの既存実装
grep -n "showToast\|toast" frontend/index.html
# → 既存のトースト関数を使う。なければ新規作成。
```

---

## Step 1: Plan Status ポーリング

**globals.js に追加:**

```javascript
// ============================================================
// Plan Status管理（STRIPE-005）
// ============================================================
let PLAN_STATUS = null;
let planStatusTimer = null;

async function fetchPlanStatus() {
  try {
    const res = await fetch('/api/plan/status', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) return;

    const prevStatus = PLAN_STATUS;
    PLAN_STATUS = await res.json();

    // 月初リセット検出
    if (prevStatus && PLAN_STATUS.billing.period_start &&
        prevStatus.billing.period_start !== PLAN_STATUS.billing.period_start) {
      showToast('利用額がリセットされました。新しい月の始まりです！', 'success');
    }

    // 次回ポーリング間隔をサーバーから取得
    const ttl = (PLAN_STATUS.cache_ttl || 60) * 1000;
    clearTimeout(planStatusTimer);
    planStatusTimer = setTimeout(fetchPlanStatus, ttl);

    // UIを更新
    updateUsageDisplay();

  } catch (e) {
    console.error('Plan status fetch failed:', e);
    // 失敗時は60秒後にリトライ
    clearTimeout(planStatusTimer);
    planStatusTimer = setTimeout(fetchPlanStatus, 60000);
  }
}

// アプリ起動時に呼び出す（既存の初期化処理内に追加）
// fetchPlanStatus();
```

---

## Step 2: サイドバー利用額バー

### 2-1. HTML（サイドバー内、アップグレード促進の上に配置）

```html
<!-- サイドバー内に追加 -->
<div id="usage-bar-container" class="usage-bar-container" style="display:none">
  <div class="usage-label" id="usage-label"></div>
  <div class="usage-bar-track">
    <div class="usage-bar-fill" id="usage-bar-fill"></div>
  </div>
</div>
<div id="savings-display" class="savings-display" style="display:none"></div>
```

### 2-2. CSS

```css
.usage-bar-container {
  padding: 8px 16px;
  margin: 4px 0;
}

.usage-label {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.usage-bar-track {
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
}

.usage-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease, background 0.3s ease;
}

.savings-display {
  padding: 2px 16px 8px;
  font-size: 10px;
  color: var(--text-tertiary);
}
```

### 2-3. JavaScript（ui.js に追加）

```javascript
function updateUsageDisplay() {
  const container = document.getElementById('usage-bar-container');
  if (!container) return;

  if (!PLAN_STATUS || PLAN_STATUS.plan === 'free') {
    container.style.display = 'none';
    const savingsEl = document.getElementById('savings-display');
    if (savingsEl) savingsEl.style.display = 'none';
    return;
  }

  const { billing } = PLAN_STATUS;
  container.style.display = 'block';

  // ラベル
  const label = document.getElementById('usage-label');
  if (label) {
    label.textContent = `今月の利用: ¥${billing.current_amount.toLocaleString()} / ¥${billing.cap.toLocaleString()}`;
  }

  // 進捗バー色: 80%以上=オレンジ, 100%=赤
  const fill = document.getElementById('usage-bar-fill');
  if (fill) {
    const barColor = billing.cap_percent >= 100 ? '#dc3232'
      : billing.cap_percent >= 80 ? '#ef9f27'
      : 'var(--gold-primary)';
    fill.style.width = `${Math.min(100, billing.cap_percent)}%`;
    fill.style.background = barColor;
  }

  // 節約額表示
  const savingsEl = document.getElementById('savings-display');
  if (savingsEl && PLAN_STATUS.savings.saved > 0) {
    savingsEl.textContent = `3社別々より¥${PLAN_STATUS.savings.saved.toLocaleString()}お得`;
    savingsEl.style.display = 'block';
  }
}
```

---

## Step 3: ストリーミングメタデータ処理

**chat.js のSSEパース処理内に追加:**

```javascript
// 既存のSSEパース処理内（data行の解析部分）
// data: [DONE] のチェック後に追加

// メタデータ処理（STRIPE-005）
if (typeof parsedData === 'object' && parsedData.type === 'metadata') {
  handleStreamMetadata(parsedData);
  return; // テキスト表示はしない
}
```

**handleStreamMetadata関数:**

```javascript
function handleStreamMetadata(metadata) {
  // キャップ通知
  if (metadata.cap_notification) {
    const notif = metadata.cap_notification;
    if (notif.type === 'cap_reached') {
      showToast(notif.message, 'warning');
      // アップグレード導線（2秒後）
      if (PLAN_STATUS?.upgrade_hint?.show) {
        setTimeout(() => {
          showToast(PLAN_STATUS.upgrade_hint.message, 'info', {
            action: 'アップグレード',
            onClick: () => navigateTo('plan-select')
          });
        }, 2000);
      }
    } else if (notif.type === 'cap_approaching') {
      showToast(notif.message, 'info');
    }
  }

  // フェアユース通知
  if (metadata.fair_use_notification) {
    showToast(metadata.fair_use_notification.message, 'warning');
  }

  // 降格復帰通知
  if (metadata.recovery_notification) {
    showToast(metadata.recovery_notification.message, 'success');
  }

  // 利用額バー更新
  fetchPlanStatus();
}
```

---

## Step 4: 降格バッジ（SVG）

### 4-1. SVG定義（稲妻アイコン、ストロークのみ）

```javascript
const DEGRADED_BADGE_SVG = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M8.5 1L2 9.5h5.5L6.5 15 14 6.5H8L8.5 1z"
        stroke="var(--text-tertiary)" stroke-width="1.2"
        stroke-linejoin="round" fill="none"/>
</svg>`;
```

### 4-2. フッターモデル名の拡張

既存の `formatModelName` 呼び出し箇所を拡張:

```javascript
/**
 * フッターのモデル名 + 降格バッジ
 * @param {string} modelName - AI応答で使われたモデル名
 * @param {boolean} isDegraded - 降格中かどうか（SSEメタデータから取得）
 */
function formatModelFooter(modelName, isDegraded) {
  let html = `<span class="model-name">${formatModelName(modelName)}</span>`;

  if (isDegraded) {
    html += `<span class="degraded-badge" title="軽量モードで動作中">
      ${DEGRADED_BADGE_SVG}
      <span class="degraded-text">軽量モード</span>
    </span>`;
  }

  return html;
}
```

### 4-3. CSS

```css
.degraded-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: 6px;
  color: var(--text-tertiary);
  font-size: 10px;
}

.degraded-text {
  opacity: 0.7;
}
```

### 4-4. SSEレスポンスからdegraded状態を取得

Worker側でストリーミング完了後にメタデータとして送信:

```javascript
// Worker側（handleChatStream内、ストリーミング完了後）
// data: {"type":"metadata","degraded":true,"model_used":"gpt-5-nano","cap_notification":{...}}
```

フロントエンド側でメタデータからdegraded状態を抽出し、フッター描画時に渡す。

---

## Step 5: キャップ接近/到達トースト + 復帰通知 + 月初リセット通知

**chat.js のストリーミングレスポンス処理に追加:**

```javascript
// ストリーミング完了後のメタデータ処理
function handleResponseMetadata(metadata) {
  // キャップ通知
  if (metadata?.cap_notification) {
    const notif = metadata.cap_notification;
    if (notif.type === 'cap_reached') {
      showToast(notif.message, 'warning');
      // アップグレード導線
      if (PLAN_STATUS?.upgrade_hint?.show) {
        setTimeout(() => {
          showToast(PLAN_STATUS.upgrade_hint.message, 'info', {
            action: 'アップグレード',
            onClick: () => navigateTo('plan-select')
          });
        }, 2000);
      }
    } else if (notif.type === 'cap_approaching') {
      showToast(notif.message, 'info');
    }
  }

  // フェアユース通知
  if (metadata?.fair_use_notification) {
    showToast(metadata.fair_use_notification.message, 'warning');
  }

  // 降格からの復帰通知
  if (metadata?.recovery_notification) {
    showToast(metadata.recovery_notification.message, 'success');
  }

  // plan/status再取得（利用額バー更新）
  fetchPlanStatus();
}
```

---

## 保全確認grep

```bash
# 新規追加
grep -c "fetchPlanStatus\|PLAN_STATUS" frontend/js/globals.js    # 2以上
grep -c "updateUsageDisplay" frontend/js/ui.js                    # 1以上
grep -c "handleStreamMetadata\|handleResponseMetadata" frontend/js/chat.js  # 1以上
grep -c "DEGRADED_BADGE_SVG\|degraded-badge" frontend/js/chat.js # 1以上
grep -c "usage-bar-container" frontend/index.html                 # 1以上

# 既存保全
grep -c "renderChatUI\|sendMessage" frontend/js/chat.js           # 2以上
grep -c "formatModelName" frontend/js/chat.js                     # 1以上
grep -c "showToast" frontend/js/ui.js                             # 1以上
grep -c "sidebarContent\|sidebar" frontend/index.html             # 1以上
```

---

## ロールバック

```bash
wrangler rollback
# フロントエンドはPages側なので、Pages rollbackも必要:
# wrangler pages deployment list
# wrangler pages deployment rollback <deployment-id>
```

---

## 🔴 承認チェックポイント

1. サイドバーに利用額バーが表示される（Free以外）
2. キャップ到達時にトーストが表示される
3. フェアユース超過時にトーストが表示される
4. フッターに降格バッジ（SVG稲妻+「軽量モード」）が表示される
5. 月初に利用額リセット通知が表示される
6. 既存のチャット・サイドバー・フッター機能が正常動作

承認後、DESIGN-IMPL-001 に進む。

---

*次の指示書: DESIGN-IMPL-001（デザイン実装統合）*
