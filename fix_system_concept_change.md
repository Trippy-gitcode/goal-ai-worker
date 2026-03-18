# fix_system_concept_change.md — システムコンセプト変更
> 対象バージョン: v3.4.0 → v3.5.0
> fix_pre_launch_10items.md（v3.4.0）の適用後に実行すること

---

## 概要

GOAL AIのシステムコンセプトを「ゴール設定中心」から「会話＋タスク生成&管理中心」に変更する。
ゴール機能はエキスパート並走モードとして特別機能の位置づけに。

### 変更一覧
| # | 内容 | セクション |
|---|------|-----------|
| 1 | サブタイトル変更 | STEP 1 |
| 2 | タスク化チップ（入力欄上・右揃え） | STEP 2 |
| 3 | AI自動タスク化提案 | STEP 3 |
| 4 | タスク化カード（種類・重み選択） | STEP 4 |
| 5 | サイドバー再構成（タスクリスト常設） | STEP 5 |
| 6 | ゴール機能の位置づけ変更 | STEP 6 |
| 7 | モードiマーク削除 | STEP 7 |
| 8 | モード表示1行化 | STEP 8 |
| 9 | メンケア色変更＋モード背景強調 | STEP 9 |
| 10 | モードアイコンSVG化＋ヘッダーモード名削除 | STEP 10 |
| 11 | チャット入力欄の透明化（モードグラデーション透過） | STEP 11 |
| 12 | スパルタモードのプロンプト変更 | STEP 12 |
| 13 | DB変更（タスク関連カラム） | STEP 13 |
| 14 | 検証・デプロイ | STEP 14 |

---

## 【回帰防止】変更前スナップショット（最初に実行）

```bash
echo "=== SNAPSHOT BEFORE ==="
grep -c "renderChatUI\|CHAT_CONFIGS" frontend/js/chat.js
grep -c "buildProfileBlock\|buildServerSystemPrompt" src/worker.js
grep -c "coaching" src/worker.js frontend/js/chat.js
grep -c "HOME_ROLES\|ai_role" src/worker.js frontend/js/chat.js frontend/js/goals.js
grep -c "ai-memo\|ai_memo\|showAIMemo" src/worker.js frontend/js/chat.js frontend/js/goals.js
grep -c "free_no_count\|freeNoCount" src/worker.js frontend/js/chat.js
grep -c "TESTER_CODES\|tester_code" src/worker.js
grep -c "isOwner\|OWNER_SECRET" src/worker.js
grep -c "skipWaiting\|clients.claim" frontend/sw.js
grep -c "deleteSelectedSessions\|historySelectMode" frontend/js/chat.js frontend/js/ui.js
grep -c "launchConfetti\|checkMilestone" frontend/js/goals.js
grep -c "escapeHtml" frontend/js/api.js
grep -c "harajuku" frontend/style.css
grep -c "transcribeAudio\|MediaRecorder" frontend/js/chat.js
grep -c "overscroll-behavior" frontend/style.css
grep -c "nano-fallback-banner\|getEffectiveModel" src/worker.js frontend/js/chat.js
grep -c "initTabSwipe" frontend/js/goals.js frontend/js/ui.js
grep -c "goal_intent\|goal_candidate" src/worker.js frontend/js/chat.js
grep -c "autoTagSession\|session_tag" src/worker.js frontend/js/chat.js
grep -c "applyReferralReward" src/worker.js
echo "=== END SNAPSHOT ==="
```

---

## STEP 1: サブタイトル変更

```bash
grep -n "YOUR PRIVATE GOAL COACH\|PRIVATE.*COACH\|private.*coach" frontend/index.html frontend/js/ui.js frontend/js/app.js frontend/lp.html | head -10
```

全箇所を変更：
```
YOUR PRIVATE GOAL COACH → YOUR PRIVATE AI PARTNER
```

---

## STEP 2: タスク化ボタン（入力欄の上・右揃えフローティング）

### 2-A: チャット入力欄の上にタスク化チップを追加

会話が始まった後にのみ表示。入力欄の上・右揃え。

```bash
grep -n "home-input\|chat-input\|send.*btn\|mic.*btn" frontend/index.html frontend/js/chat.js | head -15
```

**HTML（入力欄コンテナの直前に挿入）：**
```html
<div id="task-chip-wrap" class="task-chip-wrap" style="display:none;">
  <button id="task-chip-btn" class="task-chip" onclick="openTaskFromChat()">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d4a012" stroke-width="2" stroke-linecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
    <span>タスク化</span>
  </button>
</div>
```

**CSS：**
```css
.task-chip-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 0 4px;
  margin-bottom: 6px;
}
.task-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 14px;
  background: rgba(212, 160, 18, 0.1);
  border: 0.5px solid rgba(212, 160, 18, 0.25);
  color: #d4a012;
  font-size: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
}
.task-chip:hover {
  background: rgba(212, 160, 18, 0.18);
}
/* AI自動提案時の強調状態 */
.task-chip.highlight {
  background: rgba(212, 160, 18, 0.15);
  border: 1px solid rgba(212, 160, 18, 0.4);
  animation: pulse-gold 2s ease-in-out infinite;
}
.task-chip.highlight::after {
  content: 'new';
  font-size: 8px;
  color: #f5d380;
  margin-left: 2px;
}
@keyframes pulse-gold {
  0%, 100% { box-shadow: 0 0 0 rgba(212, 160, 18, 0); }
  50% { box-shadow: 0 0 8px rgba(212, 160, 18, 0.3); }
}
```

**表示制御（3つの状態）：**
```javascript
// 会話前: 非表示
function hideTaskChip() {
  const wrap = document.getElementById('task-chip-wrap');
  if (wrap) wrap.style.display = 'none';
}

// 会話中: 通常表示（最初のユーザーメッセージ送信後に表示）
function showTaskChip() {
  const wrap = document.getElementById('task-chip-wrap');
  if (wrap) {
    wrap.style.display = 'flex';
    const btn = document.getElementById('task-chip-btn');
    if (btn) btn.classList.remove('highlight');
  }
}

// AI自動提案時: 強調表示（ルーティング結果でtask_potential=trueの時）
function highlightTaskChip() {
  const wrap = document.getElementById('task-chip-wrap');
  if (wrap) {
    wrap.style.display = 'flex';
    const btn = document.getElementById('task-chip-btn');
    if (btn) btn.classList.add('highlight');
  }
}
```

最初のユーザーメッセージ送信時に`showTaskChip()`を呼び出す。新しい会話開始時に`hideTaskChip()`でリセット。

---

## STEP 3: AI自動タスク化提案

### 3-A: Worker側 — ルーティング判定の拡張

既存のルーティング判定（/api/chat/gpt-simple）のレスポンスに`task_potential`フィールドを追加。

```
現在: { "route": "claude", "coaching": true, "goal_intent": "level2" }
拡張: { "route": "claude", "coaching": true, "goal_intent": "level2", "task_potential": true }
```

ルーティングプロンプトに追加：
```
- task_potential: ユーザーの発言にタスク化できる行動・予定・やるべきことが含まれる場合はtrue
  例：「引っ越しの準備しなきゃ」「来週のプレゼン資料作らないと」「買い物リスト作りたい」
  例外：「天気教えて」「こんにちは」→ false
```

### 3-B: フロントエンド側 — チップ強調表示

```javascript
function onRoutingResult(result) {
  // ... 既存のcoaching検出ロジック

  // タスク化可能と判断された場合 → チップを強調表示
  if (result.task_potential) {
    highlightTaskChip();
  }
}
```

AI応答内にインラインボタンは追加しない。入力欄上のチップがゴールドパルスで強調されることで、ユーザーに「タスクにできそう」と伝える。

---

## STEP 4: タスク化カード（種類・重み選択）

### 4-A: AIにタスク分解を依頼

```javascript
async function requestTaskBreakdown(contextText) {
  showToast('タスクを分析中...');

  const response = await apiCall('/api/chat/gpt-simple', {
    method: 'POST',
    body: {
      messages: [{
        role: 'user',
        content: `以下の会話内容からタスクを抽出してJSON配列で返してください。各タスクにはtitle（タスク名、20文字以内）とdeadline（YYYY-MM-DD形式、推定できない場合はnull）を含めてください。3〜7個程度。JSONのみ返してください。\n\n${contextText}`
      }],
      context: 'task_breakdown'
    }
  });

  if (response?.result) {
    try {
      const tasks = JSON.parse(response.result.replace(/```json|```/g, '').trim());
      showTaskCard(tasks);
    } catch (e) {
      showToast('タスクの分析に失敗しました');
    }
  }
}
```

### 4-B: タスク化カードUI

```javascript
function showTaskCard(tasks) {
  const modal = document.createElement('div');
  modal.className = 'task-card-modal';
  modal.innerHTML = `
    <div class="task-card">
      <h3 class="task-card-title">📌 タスク化</h3>
      <div class="task-card-list">
        ${tasks.map((t, i) => `
          <label class="task-card-item">
            <input type="checkbox" checked data-idx="${i}">
            <span class="task-card-name">${escapeHtml(t.title)}</span>
            ${t.deadline ? `<span class="task-card-date">${t.deadline}</span>` : ''}
          </label>
        `).join('')}
      </div>
      <div class="task-card-options">
        <div class="task-card-type">
          <span>種類:</span>
          <label><input type="radio" name="task-type" value="life" checked> ライフ</label>
          <label><input type="radio" name="task-type" value="goal"> ゴール紐付</label>
        </div>
        <div class="task-card-goal-select" id="task-goal-select" style="display:none">
          <select id="task-goal-dropdown">
            <option value="">ゴールを選択...</option>
          </select>
        </div>
        <div class="task-card-priority">
          <span>重み:</span>
          <label><input type="radio" name="task-priority" value="high"> 🔴重要</label>
          <label><input type="radio" name="task-priority" value="normal" checked> 🟡普通</label>
          <label><input type="radio" name="task-priority" value="low"> 🟢軽い</label>
        </div>
      </div>
      <div class="task-card-actions">
        <button onclick="cancelTaskCard()" class="task-card-cancel">キャンセル</button>
        <button onclick="confirmTaskCard()" class="task-card-confirm">追加する</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // ゴール紐付選択時にゴールドロップダウンを表示
  modal.querySelectorAll('input[name="task-type"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const goalSelect = document.getElementById('task-goal-select');
      goalSelect.style.display = e.target.value === 'goal' ? 'block' : 'none';
      if (e.target.value === 'goal') populateGoalDropdown();
    });
  });
}
```

### 4-C: タスク保存

```javascript
async function confirmTaskCard() {
  const modal = document.querySelector('.task-card-modal');
  const checked = modal.querySelectorAll('input[type="checkbox"]:checked');
  const taskType = modal.querySelector('input[name="task-type"]:checked').value;
  const priority = modal.querySelector('input[name="task-priority"]:checked').value;
  const goalId = taskType === 'goal' ? document.getElementById('task-goal-dropdown').value : null;

  const tasks = [];
  checked.forEach(cb => {
    const idx = parseInt(cb.dataset.idx);
    const name = cb.parentElement.querySelector('.task-card-name').textContent;
    const dateEl = cb.parentElement.querySelector('.task-card-date');
    tasks.push({
      title: name,
      deadline: dateEl ? dateEl.textContent : null,
      task_type: taskType,
      priority: priority,
      goal_id: goalId || null,
      status: 'pending',
      source: 'chat'
    });
  });

  // 一括保存
  for (const task of tasks) {
    await apiCall('/api/tasks', { method: 'POST', body: task });
  }

  modal.remove();
  showToast(`${tasks.length}件のタスクを追加しました`);
  updateSidebarTaskList(); // サイドバーのタスクリスト更新
}
```

### 4-D: タスク化カードCSS

```css
.task-card-modal {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.task-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  max-width: 400px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
}
.task-card-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
}
.task-card-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}
.task-card-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
  background: var(--bg-secondary, rgba(255,255,255,0.05));
  cursor: pointer;
}
.task-card-name {
  flex: 1;
  font-size: 0.9rem;
  color: var(--text-primary);
}
.task-card-date {
  font-size: 0.75rem;
  color: var(--accent);
}
.task-card-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.task-card-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.task-card-cancel {
  padding: 8px 16px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
}
.task-card-confirm {
  padding: 8px 16px;
  border-radius: 8px;
  background: var(--accent);
  border: none;
  color: var(--bg);
  font-weight: 600;
  cursor: pointer;
}
```

---

## STEP 5: サイドバー再構成（タスクリスト常設）

### 5-A: サイドバーのセクション順序変更

```bash
grep -n "sidebar\|sb-section\|sb-menu\|チャットレコード\|進行中のゴール\|パーソナル" frontend/index.html frontend/js/ui.js | head -20
```

**変更後の順序：**
```
1. ロゴ + サブタイトル + プランタグ
2. モード（1行：通常/メンケア/スパルタ）
3. 📋 タスク（期限近い順5件 + 「全タスク →」リンク）
4. チャットレコード（過去の会話 →）
5. 🎯 ゴールプロジェクト（+ 新しいゴール）
6. パーソナル（私をデザイン / AIの理解メモ）
7. ⬆ Proにアップグレード
8. 下部バー: [アバター][名前][⚙][?]
9. 利用規約 | プライバシー | vX.X.X
```

### 5-B: タスクリスト表示

```javascript
async function updateSidebarTaskList() {
  const tasks = await apiCall('/api/tasks?status=pending&limit=5&sort=deadline');
  const container = document.getElementById('sb-task-list');
  if (!container) return;

  if (!tasks || tasks.length === 0) {
    container.innerHTML = '<div class="sb-task-empty">タスクなし</div>';
    return;
  }

  container.innerHTML = tasks.map(t => {
    const priorityDot = { high: '🔴', normal: '🟡', low: '🟢' }[t.priority] || '🟡';
    const deadline = t.deadline ? formatDate(t.deadline) : '';
    return `
      <div class="sb-task-item" onclick="showTaskDetail('${t.id}')">
        <input type="checkbox" onclick="event.stopPropagation(); toggleTaskDone('${t.id}')" ${t.status === 'done' ? 'checked' : ''}>
        <span class="sb-task-name">${escapeHtml(t.title)}</span>
        <span class="sb-task-meta">${priorityDot} ${deadline}</span>
      </div>
    `;
  }).join('') + '<div class="sb-task-more" onclick="showPage(\'tasks\')">全タスク →</div>';
}
```

**CSS：**
```css
.sb-task-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s;
}
.sb-task-item:hover {
  background: rgba(255,255,255,0.05);
}
.sb-task-name {
  flex: 1;
  font-size: 0.8rem;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sb-task-meta {
  font-size: 0.7rem;
  color: var(--text-tertiary);
  white-space: nowrap;
}
.sb-task-more {
  padding: 6px 12px;
  font-size: 0.75rem;
  color: var(--accent);
  cursor: pointer;
  text-align: right;
}
.sb-task-empty {
  padding: 8px 12px;
  font-size: 0.8rem;
  color: var(--text-tertiary);
}
```

---

## STEP 6: ゴール機能の位置づけ変更

### 6-A: サイドバーの文言変更

```bash
grep -n "進行中のゴール\|新しいゴール\|goal.*section" frontend/index.html frontend/js/ui.js | head -10
```

- 「進行中のゴール」→「🎯 ゴールプロジェクト」
- セクションラベルの下に小さく「目標に本気で取り組むエキスパートモード」

### 6-B: ホームカードの「🎯 目標を設定したい」

これは残す。タップするとゴールプロジェクト作成画面に遷移。

---

## STEP 7: モードiマーク削除

### 7-A: 情報アイコン削除

```bash
grep -n "info.*icon\|ℹ\|mode.*info\|mode.*i-mark\|tooltip.*mode" frontend/index.html frontend/js/ui.js frontend/style.css | head -10
```

各モードカード/ボタンの横にあるiマーク（情報アイコン）を削除。
ポップアップ式に変更するのでiマークは不要（タップ自体が説明表示のアクション）。
スマホで押せない問題も同時に解消。

---

## STEP 8: モード表示1行化（通常モード非表示＋ポップアップ式）

### 8-A: サイドバーのモード選択

```bash
grep -n "mode.*select\|mode.*card\|mode.*option\|モード" frontend/index.html frontend/js/ui.js | head -15
```

現在のカード型を1行のピルボタンに変更。**通常モードのボタンは削除**（デフォルト状態なので表示不要）。

```html
<div class="mode-row">
  <button class="mode-pill" data-mode="mencare" onclick="handleModeClick('mencare')">💚 メンケア</button>
  <button class="mode-pill" data-mode="kabeuchi" onclick="handleModeClick('kabeuchi')">💭 壁打ち</button>
  <button class="mode-pill" data-mode="spartan" onclick="handleModeClick('spartan')">🔥 スパルタ</button>
</div>
```

```css
.mode-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  flex-wrap: nowrap;
}
.mode-pill {
  padding: 4px 10px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.mode-pill.active {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(200, 146, 10, 0.1);
}
```

### 8-B: モード切替ポップアップ

タップ時に詳細説明ポップアップを表示。現在のモード状態によって内容が変わる。

```javascript
const MODE_DESCRIPTIONS = {
  mencare: {
    icon: '💚',
    name: 'メンケアモード',
    description: '寄り添い型のメンタルケアパートナー。共感を第一に、あなたの気持ちを受け止めます。'
  },
  kabeuchi: {
    icon: '💭',
    name: '壁打ちモード',
    description: '答えを出さず思考を引き出すソクラテス式。質問だけで考えを深めます。'
  },
  spartan: {
    icon: '🔥',
    name: 'スパルタモード',
    description: '丁寧だけど辛口。甘さゼロで言い訳の妥当性もチェック。無駄なフォローなしで、率直に問題点と改善点だけを伝えます。'
  }
};

function handleModeClick(mode) {
  const currentMode = getCurrentMode(); // 'normal' | 'mencare' | 'spartan'
  const info = MODE_DESCRIPTIONS[mode];
  const isActive = currentMode === mode;

  showModal({
    title: `${info.icon} ${info.name}${isActive ? '（ON）' : ''}`,
    content: isActive
      ? '<p>通常モードに戻します。</p>'
      : `<p>${info.description}</p>`,
    buttons: [
      {
        text: isActive ? '停止する' : '設定する',
        action: () => {
          if (isActive) {
            setMode('normal'); // 通常に戻す
            document.querySelectorAll('.mode-pill').forEach(p => p.classList.remove('active'));
          } else {
            setMode(mode);
            document.querySelectorAll('.mode-pill').forEach(p => p.classList.remove('active'));
            document.querySelector(`[data-mode="${mode}"]`)?.classList.add('active');
          }
          closeModal();
        }
      },
      { text: 'キャンセル', action: 'close' }
    ]
  });
}
```

補足テキスト（「無理せず」「思考を深める」等）はサイドバーから全て削除。詳細はポップアップ内のみで表示。

---

## STEP 9: メンケア色変更＋モード背景強調

### 9-A: メンケアの色を緑に

```bash
grep -n "mencare.*color\|mencare.*#\|mencare.*rgb\|mode-mencare" frontend/style.css | head -10
```

メンケアモードのアクセントカラーを緑系に変更：

```css
/* 変更前: 青系 */
/* 変更後: 緑系 */
body.mode-mencare #home-chat-wrap {
  background: linear-gradient(180deg, var(--bg) 0%, rgba(40, 180, 100, 0.12) 100%);
}
body.mode-mencare #home-input-wrap {
  border-color: rgba(40, 180, 100, 0.5) !important;
}
```

### 9-B: モード背景グラデーションを強調

```css
/* スパルタ: もっと赤く */
body.mode-spartan #home-chat-wrap {
  background: linear-gradient(180deg, var(--bg) 0%, rgba(220, 50, 50, 0.15) 100%);
}
body.mode-spartan #home-input-wrap {
  border-color: rgba(220, 50, 50, 0.6) !important;
}

/* メンケア: はっきり緑 */
body.mode-mencare #home-chat-wrap {
  background: linear-gradient(180deg, var(--bg) 0%, rgba(40, 180, 100, 0.15) 100%);
}
body.mode-mencare #home-input-wrap {
  border-color: rgba(40, 180, 100, 0.6) !important;
}
```

---

## STEP 10: モードアイコンSVG化＋ヘッダーモード名削除

### 10-A: モード切替ポップアップの絵文字をSVGに

モード切替時のトースト/ポップアップに表示される絵文字を、ゴールドグラデーションSVGアイコンに変更。

```javascript
const MODE_ICONS = {
  normal: '<svg width="20" height="20" viewBox="0 0 24 24" ...>/* 笑顔 */</svg>',
  mencare: '<svg width="20" height="20" viewBox="0 0 24 24" ...>/* ハート+緑 */</svg>',
  spartan: '<svg width="20" height="20" viewBox="0 0 24 24" ...>/* 炎 */</svg>'
};
```

ただしモード切替のポップアップ自体で使用するSVGのstrokeカラーはモード別：
- 通常: ゴールドグラデーション（通常のgold-grad）
- メンケア: 緑グラデーション（#28b464 → #80e0a0）
- スパルタ: 赤グラデーション（#dc3232 → #ff8080）

### 10-B: ヘッダーのモード名（chat-role-badge）削除

```bash
grep -n "chat-role-badge\|role-badge\|updateRoleBadge" frontend/js/chat.js frontend/style.css | head -10
```

- chat-role-badgeのDOMを非表示（display:none）にする
- updateRoleBadge()の呼び出しはそのまま残す（復活可能）
- CSSに `.chat-role-badge { display: none; }` を追加

---

## STEP 11: チャット入力欄の透明化（モードグラデーション透過）

### 11-A: 入力欄コンテナの背景を透明にする

```bash
grep -n "home-input\|chat-input\|input.*area\|input.*wrap\|input.*container" frontend/style.css | head -15
```

入力欄コンテナの background を transparent に変更。position: sticky; bottom: 0 は維持。

```css
#home-input-wrap,
.chat-input-container {
  background: transparent;
  position: sticky;
  bottom: 0;
}
```

### 11-B: 入力欄自体は半透明＋ぼかし

入力欄のinput/textarea要素はvar(--bg)の半透明版＋backdrop-filterで、モードグラデーションが透けて見えるようにする。

```css
.chat-input-box,
#home-input textarea {
  background: rgba(var(--bg-rgb), 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
```

※ `--bg-rgb`がCSS変数に未定義の場合は、各テーマごとにrgba値を直接指定：
- ダーク系: rgba(10, 14, 26, 0.85)
- ライト系: rgba(240, 242, 245, 0.85)
- ハラジュク系: rgba(255, 244, 79, 0.85)

### 11-C: 全テーマでのテキスト視認性確認

全6テーマ（ダーク/ダークグラス/ライト/ライトグラス/ハラジュク/ハラジュクグラス）× 全モード（通常/メンケア/壁打ち/スパルタ）でチャット入力欄のテキストが読めることを確認。読めない場合はopacityを0.9に上げる。

---

## STEP 12: スパルタモードのプロンプト変更

### 12-A: システムプロンプト変更

```bash
grep -n "spartan\|スパルタ\|SYS_SPARTAN\|SPARTAN" src/worker.js frontend/js/globals.js | head -15
```

スパルタモードのシステムプロンプトを以下に変更：

```
あなたは端的で辛口なコーチです。口調は丁寧語を使いますが、無駄な褒め言葉・フォロー・励ましは一切しません。甘さゼロです。問題点や甘さを率直に指摘し、具体的な改善点だけを伝えます。共感・慰め・サポートの言葉は不要です。短く、的確に、事実だけを述べてください。ユーザーが言い訳をした場合、その言い訳の妥当性を論理的に検証し、妥当でなければ率直に指摘してください。
```

### 12-B: モード切替ポップアップの説明文変更

MODE_DESCRIPTIONSのspartanを変更：
```javascript
spartan: {
  icon: '🔥',
  name: 'スパルタモード',
  description: '丁寧だけど辛口。甘さゼロで言い訳の妥当性もチェック。無駄なフォローなしで、率直に問題点と改善点だけを伝えます。'
}
```

---

## STEP 13: DB変更

### Supabaseマイグレーション（手動実行）

```sql
-- タスクテーブルに種類と重みを追加（既存テーブルにカラムがない場合）
ALTER TABLE goals ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'life' CHECK (task_type IN ('life', 'goal'));
ALTER TABLE goals ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low'));
ALTER TABLE goals ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'chat', 'ai'));
```

※ タスクが独立テーブル（tasks）にある場合はそちらに追加。goalsテーブル内にタスクがネストされている場合はgoalsに追加。既存のテーブル構造をgrepで確認してから適用すること。

---

## STEP 14: 検証・デプロイ

### 修正後の検証grep

```bash
echo "=== STEP 1: サブタイトル ==="
grep -c "AI PARTNER\|AI Partner" frontend/index.html frontend/lp.html
# 期待: 2以上
grep -c "GOAL COACH" frontend/index.html frontend/lp.html
# 期待: 0

echo "=== STEP 2: タスク化チップ ==="
grep -c "task-chip-wrap\|task-chip\|openTaskFromChat\|showTaskChip\|highlightTaskChip" frontend/js/chat.js frontend/index.html frontend/style.css
# 期待: 4以上

echo "=== STEP 3: AI自動タスク化 ==="
grep -c "task_potential\|highlightTaskChip" src/worker.js frontend/js/chat.js
# 期待: 2以上

echo "=== STEP 4: タスク化カード ==="
grep -c "task-card-modal\|requestTaskBreakdown\|confirmTaskCard" frontend/js/chat.js
# 期待: 3以上

echo "=== STEP 5: サイドバータスクリスト ==="
grep -c "sb-task-list\|updateSidebarTaskList\|sb-task-item" frontend/js/ui.js frontend/style.css
# 期待: 3以上

echo "=== STEP 6: ゴールプロジェクト ==="
grep -c "ゴールプロジェクト\|エキスパート" frontend/index.html frontend/js/ui.js
# 期待: 1以上

echo "=== STEP 7: iマーク削除 ==="
grep -c "info.*icon\|ℹ\|i-mark" frontend/index.html frontend/js/ui.js
# 期待: 0（全削除）

echo "=== STEP 8: モードポップアップ ==="
grep -c "mode-row\|mode-pill\|handleModeClick\|MODE_DESCRIPTIONS" frontend/style.css frontend/index.html frontend/js/ui.js
# 期待: 4以上

echo "=== STEP 9: メンケア緑 ==="
grep -n "mencare.*40.*180.*100\|mencare.*28b4\|mencare.*green" frontend/style.css
# 期待: 2以上

echo "=== STEP 10: ヘッダーモード名削除 ==="
grep -c "chat-role-badge.*none\|role-badge.*display.*none" frontend/style.css
# 期待: 1以上

echo "=== STEP 11: 入力欄透明化 ==="
grep -c "transparent\|backdrop-filter.*blur\|bg-rgb\|rgba.*0\.85" frontend/style.css
# 期待: 2以上

echo "=== STEP 12: スパルタプロンプト ==="
grep -c "丁寧語\|辛口\|言い訳.*妥当性\|フォロー.*不要" src/worker.js frontend/js/globals.js
# 期待: 2以上
```

### 回帰防止スナップショット比較

```bash
echo "=== SNAPSHOT AFTER ==="
grep -c "renderChatUI\|CHAT_CONFIGS" frontend/js/chat.js
grep -c "buildProfileBlock\|buildServerSystemPrompt" src/worker.js
grep -c "coaching" src/worker.js frontend/js/chat.js
grep -c "HOME_ROLES\|ai_role" src/worker.js frontend/js/chat.js frontend/js/goals.js
grep -c "ai-memo\|ai_memo\|showAIMemo" src/worker.js frontend/js/chat.js frontend/js/goals.js
grep -c "free_no_count\|freeNoCount" src/worker.js frontend/js/chat.js
grep -c "TESTER_CODES\|tester_code" src/worker.js
grep -c "isOwner\|OWNER_SECRET" src/worker.js
grep -c "skipWaiting\|clients.claim" frontend/sw.js
grep -c "deleteSelectedSessions\|historySelectMode" frontend/js/chat.js frontend/js/ui.js
grep -c "launchConfetti\|checkMilestone" frontend/js/goals.js
grep -c "escapeHtml" frontend/js/api.js
grep -c "harajuku" frontend/style.css
grep -c "transcribeAudio\|MediaRecorder" frontend/js/chat.js
grep -c "overscroll-behavior" frontend/style.css
grep -c "nano-fallback-banner\|getEffectiveModel" src/worker.js frontend/js/chat.js
grep -c "initTabSwipe" frontend/js/goals.js frontend/js/ui.js
grep -c "goal_intent\|goal_candidate" src/worker.js frontend/js/chat.js
grep -c "autoTagSession\|session_tag" src/worker.js frontend/js/chat.js
grep -c "applyReferralReward" src/worker.js
echo "=== END SNAPSHOT ==="
```

**BEFOREとAFTERを比較し、数値が減っている項目があれば再修正。**

### 保全確認grep（全項目）

```bash
grep -c "escapeHtml" frontend/js/api.js                       # 1以上
grep -c "Secure" frontend/js/globals.js frontend/js/ui.js     # 1以上
grep -c "console.log" frontend/index.html                     # 0件
grep -c "overscroll-behavior" frontend/style.css              # 1以上
grep -c "kabeuchi\|壁打ち" frontend/js/chat.js                # 1以上（非表示だがコード残存）
grep -c "launchConfetti\|checkMilestone" frontend/js/goals.js # 2以上
grep -c "transcribeAudio\|MediaRecorder" frontend/js/chat.js  # 1以上
grep -c "harajuku" frontend/style.css                         # 5以上
grep -c "\-\-text-primary" frontend/style.css                 # 6以上
grep -c "CHAT_CONFIGS\|renderChatUI" frontend/js/chat.js      # 5以上
grep -c "buildProfileBlock\|buildServerSystemPrompt" src/worker.js  # 2以上
grep "APP_VERSION" frontend/js/globals.js                     # 存在確認
```

### バージョン更新（4箇所同期）

```bash
grep -rn "APP_VERSION" frontend/js/globals.js frontend/sw.js frontend/index.html src/worker.js
# 全箇所を 3.5.0 に更新
# sw.jsのCACHE_NAMEも 'goal-ai-v3.5.0' に更新
```

### デプロイ

```bash
npx wrangler deploy src/worker.js
npx wrangler pages deploy frontend --project-name goal-ai-frontend
```

### 報告フォーマット

```
Deployed: v3.5.0
- サブタイトル: YOUR PRIVATE AI PARTNER
- タスク化チップ（入力欄上・右揃え、会話中表示、AI提案時ゴールドパルス）
- タスク化カード（種類:ライフ/ゴール、重み:3段階）
- サイドバーにタスクリスト常設（期限近い順5件）
- ゴール機能をエキスパート並走モードに位置づけ変更
- 壁打ちモード維持、モードiマーク削除
- モード表示1行化（メンケア/壁打ち/スパルタ）＋ポップアップ式詳細説明
- メンケア色を緑に、モード背景グラデーション強調
- モードアイコンSVG化、ヘッダーモード名削除
- チャット入力欄透明化（モードグラデーション透過）
- スパルタモード: 命令口調廃止→丁寧辛口＋言い訳妥当性チェック
SNAPSHOT BEFORE/AFTER差分: 全項目一致
```
