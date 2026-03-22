# fix_profile_page.md — プロフィールページ改善
> 対象バージョン: v3.3.0 → v3.3.1
> render_chat_ui_integration.md（v3.3.0）の適用後に実行すること

---

## 概要

プロフィールページの2分割レイアウトを廃止し、1ページ連続スクロールに変更する。
AI理解度の設定/未設定一覧は折りたたみ式にしてスペースを節約する。

---

## STEP 1: 現状確認

```bash
# プロフィール画面のDOM構造を確認
grep -n "profile\|prof-\|mypage" frontend/index.html | head -30
grep -n "profile\|prof-\|mypage" frontend/js/profile.js | head -30
grep -n "profile\|prof-\|mypage" frontend/style.css | head -30
```

2分割の原因を特定する（overflow:hidden、max-height、separate scroll container等）。

---

## STEP 2: 2分割レイアウトの解消

### 2-A: HTMLの構造変更

2分割を構成しているコンテナを1つに統合する。

**変更前（想定）：**
```html
<div class="profile-top">
  <!-- 基本情報 -->
</div>
<div class="profile-bottom">
  <!-- デザインセッション結果 -->
</div>
```

**変更後：**
```html
<div class="profile-page">
  <!-- AI理解度 -->
  <!-- 基本情報 -->
  <!-- デザインセッション結果 -->
  <!-- やり直しボタン -->
</div>
```

### 2-B: CSSの修正

```bash
grep -n "overflow.*auto\|overflow.*scroll\|max-height\|height.*calc\|height.*vh" frontend/style.css | grep -i prof
```

2分割の原因となっているCSS（個別のoverflow:auto、固定height等）を削除し、
親コンテナのみスクロール可能にする。

```css
.profile-page {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 16px;
}
```

分割用のCSS（.profile-top, .profile-bottom等）があれば削除またはdisplayのみ残す。

---

## STEP 3: AI理解度セクション（折りたたみ式）

### 3-A: 理解度スコア計算

```javascript
function calcProfileCompleteness() {
  const fields = [
    { key: 'nickname', label: 'ニックネーム' },
    { key: 'occupation', label: '職種' },
    { key: 'age', label: '年齢' },
    { key: 'mbti', label: 'MBTI' },
    { key: 'strengths', label: '強み' },
    { key: 'weaknesses', label: '弱み' },
    { key: 'values', label: '価値観' },
    { key: 'vision', label: 'ビジョン' },
    { key: 'constraints', label: '生活上の制約' },
    { key: 'catchphrase', label: 'キャッチコピー' }
  ];

  let filled = 0;
  const items = fields.map(f => {
    const done = !!USER_PROFILE[f.key];
    if (done) filled++;
    return { ...f, done };
  });

  return {
    percent: Math.round((filled / fields.length) * 100),
    filled,
    total: fields.length,
    items
  };
}
```

### 3-B: HTML構造

```html
<div class="profile-completeness">
  <div class="completeness-header" onclick="toggleCompletenessDetail()">
    <span class="completeness-icon">📋</span>
    <span class="completeness-label">AIの理解度</span>
    <span class="completeness-score" id="completeness-score">72%</span>
    <span class="completeness-toggle" id="completeness-toggle">↓ 詳細</span>
  </div>
  <div class="completeness-detail" id="completeness-detail" style="display:none">
    <!-- 設定/未設定の一覧がここに展開される -->
  </div>
</div>
```

### 3-C: 展開/折りたたみロジック

```javascript
function toggleCompletenessDetail() {
  const detail = document.getElementById('completeness-detail');
  const toggle = document.getElementById('completeness-toggle');
  const isOpen = detail.style.display !== 'none';

  detail.style.display = isOpen ? 'none' : 'block';
  toggle.textContent = isOpen ? '↓ 詳細' : '↑ 閉じる';
}

function renderCompletenessDetail() {
  const { percent, filled, total, items } = calcProfileCompleteness();

  document.getElementById('completeness-score').textContent = `${percent}%`;

  const detail = document.getElementById('completeness-detail');
  detail.innerHTML = items.map(item => `
    <div class="completeness-item ${item.done ? 'done' : 'todo'}">
      <span class="completeness-check">${item.done ? '✅' : '⬜'}</span>
      <span class="completeness-field">${item.label}</span>
    </div>
  `).join('');
}
```

### 3-D: CSS

```css
.profile-completeness {
  margin-bottom: 20px;
  border-radius: 12px;
  background: var(--card-bg, var(--bg-secondary));
  overflow: hidden;
}

.completeness-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
}

.completeness-icon {
  font-size: 1.1rem;
}

.completeness-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-primary);
  flex: 1;
}

.completeness-score {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--accent);
}

.completeness-toggle {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.completeness-detail {
  padding: 0 16px 12px;
}

.completeness-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 0.85rem;
}

.completeness-item.done {
  color: var(--text-secondary);
}

.completeness-item.todo {
  color: var(--text-tertiary);
}

.completeness-check {
  font-size: 0.8rem;
}
```

---

## STEP 4: ページ全体のレイアウト順序

プロフィールページのセクション順序を以下に統一：

```
1. AI理解度（折りたたみ式） ← 新規追加
2. 基本情報（ニックネーム・職種・年齢）
3. デザインセッション結果（MBTI・強み・弱み・価値観・ビジョン・制約・キャッチコピー）
4. [私をデザイン（やり直す）] ボタン
```

### 4-A: renderProfile関数の修正

```bash
grep -n "renderProfile\|showProfile\|profilePage" frontend/js/profile.js
```

既存のrenderProfile関数内で、上記の順序で各セクションをDOM生成するよう修正。
AI理解度セクションを先頭に配置し、renderCompletenessDetail()を呼び出す。

---

## STEP 5: 検証・デプロイ

### 自動検証
```bash
# 2分割の解消
echo "=== 分割CSS ==="
grep -c "profile-top\|profile-bottom" frontend/style.css frontend/index.html
# 期待: 0（削除済み）

# AI理解度
echo "=== completeness ==="
grep -c "completeness\|calcProfileCompleteness\|toggleCompletenessDetail" frontend/js/profile.js
# 期待: 3以上

echo "=== completeness CSS ==="
grep -c "completeness" frontend/style.css
# 期待: 5以上

# 1ページスクロール
echo "=== profile-page ==="
grep -c "profile-page" frontend/style.css frontend/index.html
# 期待: 2以上
```

### 保全確認grep（CLAUDE.md記載の全項目）
```bash
grep -c "escapeHtml" frontend/js/api.js                       # 1以上
grep -c "Secure" frontend/js/globals.js frontend/js/ui.js     # 1以上
grep -c "console.log" frontend/index.html                     # 0件
grep -c "overscroll-behavior" frontend/style.css              # 1以上
grep -c "kabeuchi\|壁打ち" frontend/js/chat.js                # 1以上
grep -c "launchConfetti\|checkMilestone" frontend/js/goals.js # 2以上
grep -c "transcribeAudio\|MediaRecorder" frontend/js/chat.js  # 1以上
grep -c "harajuku" frontend/style.css                         # 5以上
grep -c "\-\-text-primary" frontend/style.css                 # 6以上
grep "APP_VERSION" frontend/js/globals.js                     # 存在確認
```

### バージョン更新（4箇所同期）
```bash
# 現在のバージョンの次に更新（小数第二位）
grep -rn "APP_VERSION" frontend/js/globals.js frontend/sw.js frontend/index.html src/worker.js
# sw.jsのCACHE_NAMEも同期更新
```

### デプロイ
```bash
npx wrangler deploy src/worker.js
npx wrangler pages deploy frontend --project-name goal-ai-frontend
```

### 報告フォーマット
```
Deployed: v3.3.1
- プロフィールページ2分割廃止→1ページスクロール
- AI理解度セクション追加（折りたたみ式、設定/未設定一覧）
```
