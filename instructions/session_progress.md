# GOAL AI — プロジェクトダッシュボード
> セッション引き継ぎの唯一の情報源。300行以内を維持。
> ⚠ 現在1193行。セッション開始プリフライトでアーカイブ必須: bash scripts/session_archiver.sh
> 仕様参照: docs/goal_ai_project_v6_4.md / docs/goal_ai_reference_v2.md / docs/ux_redesign_v2.md
> ミッション定義: templates/mission_template_v2.md準拠
> 完了済み詳細: instructions/results/session_history.md

---

## 5行サマリー
- **Version:** v4.0.8（デプロイ済み 2026-04-05）
- **Next:** UX-01 Phase B（UI実装。B-1 ME構造化ヒアリング→B-2 TODAY刷新→B-3 TALK UI→B-4 GOALS Hub→B-5 Calendar/Analytics）
- **Last done:** P14 Phase Aデプロイ完了（v4.0.8, canopy PASS, Worker+Pages正常）
- **Open issues:** TEST-E2E途中（E2E-01 PASS, E2E-02 1FAIL残）→ UX-01後に再開
- **方針変更:** テスト配布より「自分が毎日使いたいツール」を優先。新コンセプト「君の人生をより素敵に」。マインドセットプリセット導入

## 現在地
- **バージョン:** v4.0.8
- **チェーン:** ~~UX-01 Phase A~~ → ~~P14 デプロイ~~ → UX-01 Phase B → TEST-E2E → UX-01 Phase C-D
- **次のミッション:** UX-01-B1（ME構造化ヒアリング）

---

## ミッションキュー（上から順に実行）

### ~~P14: Phase Aデプロイ（C2基準フロー）~~ ✅ 完了 2026-04-05
> v4.0.8 デプロイ済み。canopy PASS, Worker version=4.0.8, Pages version=4.0.8, /api/me/identity→401

---

### ~~UX-01-B1: ME構造化ヒアリングセッション~~ ✅ 完了 2026-04-05
> IDENTITY_SESSION_PROMPT追加、[IDENTITY_UPDATE]タグ検出→user_identity API自動保存、ME画面identity表示（desired_image/strengths/weaknesses）、loadIdentityFromServer()追加。canopy PASS

**目的:** ME画面に「自分を知るセッション」を実装。20問以上の構造化ヒアリングで信念・価値観・強み・弱み・見られたい姿を掘り下げ、矛盾を指摘し、結果をuser_identityに自動保存

**フロー:**
```
ME画面 →「自分を知る」ボタン
  → セッション画面（TALK風のチャットUI）
  → AIが順に質問（Q1〜Q20+）
  → ユーザーの回答に矛盾があればAIが指摘・深掘り
  → セッション完了 → 構造化された自己定義をuser_identityに保存
  → ME画面に反映（vision/strengths/weaknesses/desired_image等）
```

**実装詳細:**
1. ME画面に「自分を知るセッション開始」ボタン追加
2. セッション用のシステムプロンプト作成（構造化ヒアリング指示）
3. セッション完了時にAI応答から[IDENTITY_UPDATE]タグを検出→user_identity API呼び出し
4. ME画面にidentityデータを表示（vision大きく/strengths・weaknesses 2カラム/desired_imageタグ）

**完了コマンド:**
```bash
# cmd1: セッション開始ボタン存在
grep -c 'self-design\|identity-session\|自分を知る' frontend/index.html  # 期待: 1以上
# cmd2: セッション用プロンプト
grep -c 'IDENTITY_UPDATE\|identity_session\|self_design' src/services/prompt.js  # 期待: 1以上
# cmd3: ME画面にidentity表示
grep -c 'identity\|vision\|strengths\|desired_image' frontend/js/profile.js  # 期待: 3以上
# cmd4: canopy PASS
bash tests/smoke/canopy.sh 2>&1 | tail -1
```

**FAIL条件:** セッション開始UI未実装 / プロンプト未定義 / ME表示未実装 / canopy FAIL

---

### ~~UX-01-B2: TODAY画面刷新（タスク自動展開の表示）~~ ✅ 完了 2026-04-05
> QOL提案カード枠(qol-proposal-slot)追加、関連ゴール表示(hub-linked-goals+renderLinkedGoals)追加。goal-tagは既存実装済み。canopy PASS

**目的:** Phase Aで実装したGOAL_CREATE→タスク自動展開の結果がTODAY画面に適切に表示される。ゴール横断タスク表示、QOL提案カード枠、ゴールタグ表示

**実装:**
1. タスクカードにゴール名タグ表示（複数ゴールに跨るタスクが視覚的にわかる）
2. GOAL_PROPOSALで承認されたタスクがTODAYに即反映（リロード不要）
3. QOL提案カード枠（Phase Cで中身を入れる。今は空の枠のみ）
4. related_goalsリンクの視覚表示（ゴール詳細画面）

**完了コマンド:**
```bash
# cmd1: タスクカードにゴールタグ
grep -c 'goal-tag\|goal-label\|goalTitle' frontend/js/goals.js  # 期待: 1以上
# cmd2: QOL提案カード枠
grep -c 'qol-proposal\|qol-card\|proposal-slot' frontend/index.html  # 期待: 1以上
# cmd3: related_goals表示
grep -c 'related.*goal\|goal-link\|linked-goal' frontend/js/goals.js  # 期待: 1以上
# cmd4: canopy PASS
bash tests/smoke/canopy.sh 2>&1 | tail -1
```

**FAIL条件:** ゴールタグ未表示 / QOL枠なし / ゴール間リンク未表示 / canopy FAIL

**目的:** Cloudflare KV Free plan（1,000 writes/日）で25名テスト配布が運用可能になるよう、高頻度KV writeをSupabaseに移行する。目標: 1メッセージあたりKV write 2回以下

**背景:** 現状1メッセージ≈8 KV writes。内訳: rate-limit 5回 + usage tracking 2回 + route cache 1回。25名×20メッセージ/日=4,000 writes → 制限超過。ペイドプラン不使用方針

**移行対象（KV→Supabase）:**
1. `checkRateLimit()` — rate-limit.js:7-11 — 日次レート制限カウンター
2. `incrementDailyUsage()` — rate-limit.js:32-36 — 日次使用量カウンター
3. `incrementFreeModelUsage()` — rate-limit.js:55-59 — モデル別使用量
4. `checkFairUseV2()` — rate-limit.js:72-77 — 時間/日次フェアユースカウンター（2 puts）
5. `recordTurnUsage()` — chat.js:199-200, 261-262 — ターンカウント
6. `maybeSendUsageRecord()` — chat.js:379, 402 — Stripe同期カウンター

**KVに残す（低頻度 or read重視）:**
- route cache（TTL付きread重視。write低頻度）
- location cache（初回のみ）
- memo/profile/history（5ターンに1回）
- token data（登録時のみ）
- checkout webhook（Stripeイベント時のみ）
- error log（chat.js:292。稀）

**Supabase側の実装方針:**
- `usage_counters`テーブル新規作成（token_id, counter_type, counter_key, value, expires_at）
- `INSERT ... ON CONFLICT (token_id, counter_type, counter_key) DO UPDATE SET value = value + 1`でatomic increment
- expires_atで日次/時間リセットを実現（TTL相当）
- 読み取りはKVキャッシュ可（read回数は無制限）

**プリフライト:**
```bash
# 現在のKV put箇所数
grep -rn '\.put(' src/utils/rate-limit.js | wc -l  # 記録
grep -rn '\.put(' src/routes/chat.js | wc -l  # 記録
# Supabase接続確認
grep -c 'SUPABASE_URL' src/index.js  # 期待: 1以上
```

**完了コマンド:**
```bash
# cmd1: rate-limit.jsのKV put削減（移行対象6箇所が消えている）
KV_RL=$(grep -c '\.put(' src/utils/rate-limit.js)
[ "$KV_RL" -le 0 ] && echo "PASS: rate-limit KV puts=$KV_RL" || echo "FAIL: $KV_RL puts remain"

# cmd2: chat.jsのusage tracking KV put削減
KV_CHAT=$(grep -c 'TOKEN_KV.*put\|\.put.*usage\|\.put.*tc:' src/routes/chat.js)
[ "$KV_CHAT" -le 2 ] && echo "PASS: chat KV puts=$KV_CHAT" || echo "FAIL: $KV_CHAT puts remain"

# cmd3: Supabaseカウンターテーブル存在
grep -c 'usage_counters' src/utils/rate-limit.js  # 期待: 1以上

# cmd4: テスト全件PASS
npx vite preview --port 4173 &
FRONTEND_BASE=http://localhost:4173 npx playwright test --project=mobile --timeout=60000 2>&1 | grep "0 failed"

# cmd5: canopy PASS
bash tests/smoke/canopy.sh 2>&1 | tail -1
```

**FAIL条件:**
- rate-limit.jsにKV putが1箇所でも残っている
- Supabaseカウンターの参照がない
- テストFAIL
- canopy FAIL

**完了報告:**
```
KV-OPT: 移行前 KV puts/message=X → 移行後 KV puts/message=Y
  移行済み: [関数名リスト]
  KVに残留: [関数名リスト + 理由]
  git diff --stat
```

---

### TEST-AC: テスト品質改善（Phase 3-5残り。Phase 1-2完了済み）
> リスク: 🟡中
> 推定: 2時間
> 参照: docs/test_audit_v1.md（アンチパターン6種＋AC定義＋修正方針）
> 対象ファイル: tests/e2e/helpers/test-guards.ts（新規）, tests/e2e/specs/*.spec.ts

**目的:** 「524テストPASSなのにエラーが出る」問題を構造的に解決する。全テストにAcceptance Criteriaを追加し、甘いPASS判定を排除する

**Phase 1-2完了済み（実装26で実施）:**
- ✅ test-guards.ts + assert-ai-response.ts 作成
- ✅ 全9 specにガード組み込み
- ✅ E2E serial→describe 6箇所除去
- ✅ バグ3件修正（JSロード順/diary API引数順/KV制限発見）
- ⏸ Phase 3-5はKV日次制限超過でテスト実行不可→KV-OPT完了後に再開

**プリフライト:**
```bash
# 監査レポートの存在確認
wc -l docs/test_audit_v1.md  # 期待: 200以上
# 現在のテスト件数
TOTAL=0; for f in tests/e2e/specs/test*.spec.ts tests/e2e/specs/e2e-*.spec.ts; do C=$(grep -c "test(" "$f" 2>/dev/null); TOTAL=$((TOTAL+C)); done
echo "現在のテスト数: $TOTAL"
```

**Phase 1: グローバルガード作成（最重要。これだけで大半を検出可能）**
`tests/e2e/helpers/test-guards.ts` を新規作成:
```typescript
// AC-GLOBAL-1: console.error監視
// AC-GLOBAL-2: unhandled rejection監視
// AC-GLOBAL-3: エラートースト検出（正常フローテスト時）
// AC-GLOBAL-4: .msg.ai の「エラー」テキスト検出
```
具体的な実装方法はdocs/test_audit_v1.md「全テスト共通AC」セクション参照

**Phase 2: 全specファイルにガード組み込み + E2E並列化**
対象specファイル一覧（test-design.spec.tsは除外）:
```bash
ls tests/e2e/specs/test*.spec.ts tests/e2e/specs/e2e-*.spec.ts tests/e2e/specs/baseline.spec.ts tests/e2e/specs/features.spec.ts
```
各ファイルのbeforeEach/afterEachにtest-guards.tsをインポート＋適用。
test06-errors.spec.tsは**エラーが出ることが正常**なので、ガードのエラー検出をスキップする設定を入れる

**E2E並列化（e2e-fullflow.spec.ts）:**
- `test.describe.serial` を全て `test.describe` に変更（serialを外す）
- 各テストは既にloadApp()でauto-register→独立ユーザーなので、データ依存がない
- **データ依存テストは1テスト内で完結させる**（例: E2E-02「タスクがTODAYリストに表示される」→同一テスト内でタスク追加→同じページのままTODAYタブに切替→リスト確認。別テストのデータを前提にしない）
- playwright.config.tsの `fullyParallel: true` + `workers: 4` により自動で並列実行される

**Phase 3: AI応答ヘルパー追加**
`tests/e2e/helpers/assert-ai-response.ts` を新規作成:
```typescript
// AC-AI-1: テキストに「エラー」「失敗」「error」を含まない
// AC-AI-2: テキストが20文字以上
// AC-AI-3: inputが再入力可能
```
AI応答を待つ全テストで`assertValidAIResponse(page)`を呼び出す。
対象テスト: E2E-03系、test01-ux 2-1系、test04-data AI応答系

**Phase 4: カテゴリ別AC追加（docs/test_audit_v1.md準拠）**
- AC-TASK: タスク操作後にリストに反映されることを検証
- AC-ERR: エラーテスト→エラーメッセージ表示を検証（tabVisible だけではFAIL）
- AC-BILL: プラン表示が正しいことをUI上で検証（関数存在だけではFAIL）
- AC-GOAL: ゴール操作後にリストに反映されることを検証

**Phase 5: テスト実行→FAIL修正ループ**
```bash
npx vite preview --port 4173 &
FRONTEND_BASE=http://localhost:4173 npx playwright test --project=mobile --reporter=list --timeout=60000 2>&1
```
- グローバルガードにより新たにFAILするテストが出る→**実装（プロダクトコード）を修正する**
- テスト側のAC基準を緩めてPASSにすることは禁止
- 0 failedになるまで最大5ループ

**完了コマンド（全てPASSで完了）:**
```bash
# cmd1: グローバルガードが存在
ls tests/e2e/helpers/test-guards.ts tests/e2e/helpers/assert-ai-response.ts

# cmd2: 全specファイルがガードをインポートしている（test-design除く）
for f in tests/e2e/specs/test0*.spec.ts tests/e2e/specs/e2e-*.spec.ts; do
  grep -l "test-guards" "$f" > /dev/null || echo "MISSING: $f"
done

# cmd2b: E2Eにserial指定が残っていないこと
grep -c "describe.serial" tests/e2e/specs/e2e-fullflow.spec.ts  # 期待: 0

# cmd3: 「エラー」の否定アサーションが存在
grep -rn "not.*toContain.*エラー\|not.*toContain.*error" tests/e2e/helpers/ | wc -l  # 期待: 1以上

# cmd4: テスト全件PASS
FRONTEND_BASE=http://localhost:4173 npx playwright test --project=mobile --timeout=60000 2>&1 | grep "0 failed"

# cmd5: canopy PASS
bash tests/smoke/canopy.sh 2>&1 | tail -1
```

**FAIL条件:**
- cmd1: ヘルパーファイルが存在しない
- cmd2: ガード未適用のspecファイルがある
- cmd2b: E2Eにserial指定が残っている
- cmd3: エラーの否定アサーションが0件
- cmd4: failed > 0
- cmd5: canopy FAIL

**完了報告フォーマット:**
```
TEST-AC: XX PASS / YY FAIL / ZZ SKIP / 合計NN

■ ACカテゴリ別サマリー（ふとしレビュー用）
| カテゴリ | 対象テスト数 | 問題検出 | 解決(実装修正) | スキップ | 残課題 |
|----------|-------------|---------|---------------|---------|--------|
| AC-GLOBAL (グローバルガード) | XX | XX | XX | XX | XX |
| AC-AI (AI応答検証) | XX | XX | XX | XX | XX |
| AC-TASK (タスク操作) | XX | XX | XX | XX | XX |
| AC-ERR (エラーハンドリング) | XX | XX | XX | XX | XX |
| AC-BILL (課金・プラン) | XX | XX | XX | XX | XX |
| AC-GOAL (ゴール操作) | XX | XX | XX | XX | XX |
| AC-NAV (画面遷移) | XX | XX | XX | XX | XX |
| AC-AUTH (認証) | XX | XX | XX | XX | XX |
| AC-SIDE (サイドバー・設定) | XX | XX | XX | XX | XX |
| 合計 | XX | XX | XX | XX | XX |

■ 問題検出の内訳（解決できなかったもの）
  [カテゴリ] [テスト名] [問題内容] [理由]

■ スキップ理由（1行で簡潔に）
  [テスト名]: [理由]
  例: "Stripe決済テスト: 本番課金が発生するため"
  例: "iOS固有テスト: Chromiumでは再現不可"

■ 実装修正
  git diff --stat

■ グローバルガードで新規検出したバグ: [リスト]
```

---

### TEST-DESIGN: デザイン品質テスト（タップターゲット＋文字視認性＋レイアウト一貫性）
> リスク: 🟡中
> 推定: 1.5時間
> 参照: なし（本セクション内に基準を全て記載）
> 対象ファイル: tests/e2e/specs/test-design.spec.ts（新規作成）, frontend/index.html, frontend/style.css（FAIL修正時）

**目的:** テスト配布前にUIのデザイン品質を自動検証する。Apple HIG準拠。FAILは実装を修正する

**テスト対象画面（11画面）:**
TODAY, TALK, GOALS（リスト）, Goal Hub, ME, Calendar, Analytics, Settings, Tasks, サイドバー, ボトムタブ

**基準（Apple HIG + WCAG AA）:**
- タップターゲット: 全インタラクティブ要素 ≥ 44×44px（getBoundingClientRect）
- ボタン間隔: 隣接するタップターゲット間 ≥ 8px
- フォントサイズ: 全テキスト要素 ≥ 12px（getComputedStyle）
- 行間: 本文テキスト line-height ≥ 1.4
- コントラスト比: テキストと背景 ≥ 4.5:1（WCAG AA）。大文字（18px以上）は ≥ 3:1
- overflow: 各画面で横スクロール発生 = FAIL
- 3デバイス幅: SE(320px), 標準(375px), Plus(414px) で全画面スクショ

**プリフライト:**
```bash
# Playwright環境確認
npx playwright --version  # 期待: 1.59.1
# axe-core インストール（コントラスト比自動検証）
npm list @axe-core/playwright 2>/dev/null || npm install -D @axe-core/playwright
# テスト対象画面数
echo "11画面 × 3カテゴリ = 33テストグループ"
```

**Phase 1: specファイル作成（test-design.spec.ts）**
テスト構造:
```
describe('Design Quality')
  describe('Cat1: タップターゲット (44×44px)')
    11画面 × タップ要素チェック
  describe('Cat2: 文字視認性')
    11画面 × フォントサイズ/行間/コントラスト
  describe('Cat3: レイアウト一貫性')
    11画面 × 3viewport × overflow + スクショ
```

各テストの実装方法:
- **Cat1**: page.$$('button, a, input, [role="button"], [onclick]')で全インタラクティブ要素取得→getBoundingClientRect()で幅・高さ≥44px判定。FAIL時は要素のセレクタとサイズを出力
- **Cat2**: page.$$('*')でテキスト持ち要素取得→getComputedStyle()でfont-size≥12px、line-height判定。コントラスト比はaxe-coreの`color-contrast`ルールで自動判定
- **Cat3**: 3viewport（320/375/414px）で各画面スクショ→document.documentElement.scrollWidth > viewport幅ならFAIL

作成後の検証:
```bash
TC=$(grep -c "test(" tests/e2e/specs/test-design.spec.ts)
echo "テストケース数: $TC"  # 期待: 30以上
```

**Phase 2: テスト実行（localhost。3viewportで分割実行）**
```bash
npx vite preview --port 4173 &
FRONTEND_BASE=http://localhost:4173 npx playwright test tests/e2e/specs/test-design.spec.ts --project=mobile --reporter=list --timeout=30000 2>&1
```

**Phase 3: FAIL修正ループ**
- FAILしたUIの**CSS/HTMLを修正する**（テスト修正禁止）
- 典型的な修正: min-width/min-height追加、font-size引き上げ、padding調整
- 修正後に再テスト。0 failedになるまで最大3ループ
- 3ループで解決しない場合、残FAILリストを報告してHOLD

**Phase 4: 全画面スクショ一覧生成（目視レビュー用）**
```bash
# 3viewport × 11画面 = 33枚のスクショ
ls tests/e2e/screenshots/design/*.png | wc -l  # 期待: 33
```
スクショファイル名規則: `{viewport}_{screen}.png`（例: 320_today.png, 375_talk.png）

**完了コマンド（全てPASSで完了）:**
```bash
# cmd1: テストケース数 ≥ 30
TC=$(grep -c "test(" tests/e2e/specs/test-design.spec.ts)
[ "$TC" -ge 30 ] && echo "PASS: $TC" || echo "FAIL: $TC < 30"

# cmd2: テスト全件PASS
FRONTEND_BASE=http://localhost:4173 npx playwright test tests/e2e/specs/test-design.spec.ts --project=mobile --timeout=30000 2>&1 | grep "0 failed"

# cmd3: スクショ33枚（3viewport × 11画面）
SC=$(ls tests/e2e/screenshots/design/*.png 2>/dev/null | wc -l | tr -d ' ')
[ "$SC" -ge 33 ] && echo "PASS: $SC screenshots" || echo "FAIL: $SC < 33"

# cmd4: canopy PASS
bash tests/smoke/canopy.sh 2>&1 | tail -1
```

**FAIL条件:**
- テストケース数 < 30
- failed > 0（CSS修正でPASSにする。テスト基準を緩めてPASSにすることは禁止）
- スクショ33枚未満
- canopy FAIL

**完了報告フォーマット（3区分）:**
```
TEST-DESIGN: XX PASS / YY FAIL / ZZ SKIP / 合計NN
  Cat1 タップターゲット: XX PASS / YY FAIL
    FAIL詳細: [画面名] [要素セレクタ] 現在サイズ → 修正後サイズ
  Cat2 文字視認性: XX PASS / YY FAIL
    FAIL詳細: [画面名] [要素] font-size/contrast → 修正後
  Cat3 レイアウト: XX PASS / YY FAIL
    FAIL詳細: [画面名] [viewport] overflow幅
  修正した実装: git diff --stat
  スクショ一覧: tests/e2e/screenshots/design/（33枚）
```

---

### TEST-E2E: 本番APIに対するE2Eフルフローテスト（最優先）
> リスク: 🟡中
> 推定: 2時間
> 参照: docs/e2e_fullflow_test.md
> 対象ファイル: tests/e2e/specs/e2e-fullflow.spec.ts, frontend/**, src/**（FAIL修正時）

**目的:** ユーザーが実際にやる全操作を、本番APIに対して、最初から最後まで自動テストする。FAILは実装を修正する（テスト修正禁止）

**背景:** 438テストALL PASSなのにタスク追加が動かない。localhostテストはUI存在確認のみでユーザーフローを検証していなかった

**プリフライト:**
```bash
# 仕様書の項目数を記録
E2E=$(grep -c '^\- \[ \]' docs/e2e_fullflow_test.md)
echo "E2E項目数: $E2E"  # 期待: 86

# 本番URLが応答するか
curl -s -o /dev/null -w "%{http_code}" https://goal-ai-frontend.pages.dev  # 期待: 200
curl -s -o /dev/null -w "%{http_code}" https://goal-ai-worker.goalai-futoshi.workers.dev/api/version  # 期待: 200
```

**テスト環境（モック禁止。データ注入禁止）:**
```bash
FRONTEND_BASE=https://goal-ai-frontend.pages.dev
# AI応答タイムアウト: 90秒
# 全て本番APIに対して実行。localhostは使わない
```

**Phase 1: specファイル作成**
docs/e2e_fullflow_test.mdの全`- [ ]`項目に1:1でtest()を作成。
テストは以下のルールで書く:
- auto-registerでテストユーザーを自動作成
- 全操作をUI経由で行う（page.click, page.fill, page.locator等）
- AI応答は最大90秒待つ。タイムアウト=FAIL（skipにしない）
- 各テストでスクリーンショット3枚（操作前/操作後/結果）
- E2E-01〜06はserial（前のテストで作ったデータを次で使う）
- E2E-07以降はparallel可

作成後の項目数一致確認:
```bash
TC=$(grep -c "test(" tests/e2e/specs/e2e-fullflow.spec.ts)
[ "$TC" -ge 86 ] && echo "PASS: $TC >= 86" || echo "FAIL: $TC < 86"
```

**Phase 2: テスト実行（フォアグラウンド。分割）**
```bash
# E2E-01〜06（serial: ユーザーフロー依存）
FRONTEND_BASE=https://goal-ai-frontend.pages.dev npx playwright test tests/e2e/specs/e2e-fullflow.spec.ts --project=mobile --reporter=list --timeout=90000 2>&1
```

**Phase 3: FAIL修正ループ**
- FAILした項目の**実装（プロダクトコード）を修正する**
- **テスト側を修正してPASSにすることは禁止**
- 修正後にフロントエンドを再デプロイしてから再テスト
- 0 failedになるまで繰り返し（最大5ループ）

**完了コマンド:**
```bash
# cmd1: テストケース数 >= 86
TC=$(grep -c "test(" tests/e2e/specs/e2e-fullflow.spec.ts)
[ "$TC" -ge 86 ] && echo "PASS" || echo "FAIL"

# cmd2: テスト全件PASS（本番URL）
FRONTEND_BASE=https://goal-ai-frontend.pages.dev npx playwright test tests/e2e/specs/e2e-fullflow.spec.ts --project=mobile --timeout=90000 2>&1 | grep "0 failed"

# cmd3: スクリーンショット
ls tests/e2e/screenshots/e2e/*.png | wc -l  # 期待: 20以上

# cmd4: canopy PASS
bash tests/smoke/canopy.sh 2>&1 | tail -1
```

**FAIL条件:**
- テストケース数 < 86
- failed > 0（テスト修正でPASSにした場合もFAIL扱い）
- スクリーンショット20枚未満
- canopy FAIL

**完了報告（3区分）:**
```
TEST-E2E: XX PASS / YY FAIL / ZZ SKIP / 合計86
  E2E-01 起動認証: PASS/FAIL
  E2E-02 タスク追加: PASS/FAIL ← 最重要
  E2E-03 チャット: PASS/FAIL
  ...
修正した実装: git diff --stat
スクリーンショット: tests/e2e/screenshots/e2e/
```

---

### TEST-REFACTOR: テストアンチパターン修正→全テスト再実行（最優先）
> リスク: 🟡中
> 推定: 1時間
> 参照: docs/test_package_v1.md（テストSKIPルール・必須/オプション分類表）
> 対象ファイル: tests/e2e/specs/test*.spec.ts

**目的:** テストが「通っているが実は何も検証していない」箇所を全て修正し、全テストを再実行する

**原則: test.skip()は最終手段。まずデータ注入かAPIモックで検証可能にする。**

**背景:** 前回TEST-FULLで438 ALL PASSだが、以下のアンチパターンでPASS扱いになっている項目がある:
- expect(true): 4件 → 何も検証していないのにPASS
- .catch(() => {}): 7件 → エラーを握りつぶしてPASS
- .catch(() => false) + if分岐: 15件 → エラー時に検証をスキップしてPASS
- if (count > 0) { expect... }: 127件 → 要素がなければ検証ゼロでPASS
- typeof-onlyアサーション: 4件 → 型だけ見て値を未検証
- データ依存テストのskip: タスク/ゴールが存在しない→skip → 永久にテストされない

**Phase 0: テストヘルパー作成（データ注入＋APIモック）**
テスト開始前にデータをセットアップするヘルパーを作成:
```typescript
// tests/e2e/helpers/test-data.ts
export async function injectTasks(page: Page, tasks: any[]) {
  await page.evaluate((t) => {
    localStorage.setItem('today_tasks', JSON.stringify(t));
  }, tasks);
  await page.reload({ waitUntil: 'networkidle' });
}

export async function injectGoals(page: Page, goals: any[]) {
  await page.evaluate((g) => {
    localStorage.setItem('goals', JSON.stringify(g));
  }, goals);
  await page.reload({ waitUntil: 'networkidle' });
}

export async function mockChatAPI(page: Page, response: string) {
  await page.route('**/api/chat/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: `data: {"type":"content","text":"${response}"}\n\ndata: [DONE]\n\n`
    });
  });
}

export async function mockTaskAPI(page: Page) {
  await page.route('**/api/tasks**', route => {
    route.fulfill({
      status: 200,
      body: JSON.stringify([
        { id: '1', name: 'テストタスク1', done: false, sort_order: 0 },
        { id: '2', name: 'テストタスク2', done: true, sort_order: 1 },
      ])
    });
  });
}
```
これにより:
- タスクCRUDテスト → injectTasks()でデータ注入してから検証。skip不要
- チャットテスト → mockChatAPI()でAI応答を模擬。skip不要
- ゴールテスト → injectGoals()でデータ注入。skip不要

**Phase 1: アンチパターン修正（skip禁止。データ注入/APIモックで解決）**
docs/test_package_v1.md「テストSKIPルール」「必須/オプション分類表」を読んでから修正:
1. `expect(true)` → Phase 0のヘルパーでデータ注入 or APIモックして**実際に検証**
2. `.catch(() => {})` → mockChatAPI()でAPIモックして`.catch`を外す。エラーにならない
3. `.catch(() => false)` + if分岐 → 必須要素は.catchを外して`await expect(el).toBeVisible()`。データ依存はinjectTasks()で解決
4. `if (count > 0) { expect }` → 必須要素はif文を外して直接expect。データ依存要素はinjectTasks()/injectGoals()で事前にデータ注入
5. `expect(typeof X).toBe('boolean')` → 値の実際の検証に変更
6. **test.skip()を使ってよいケース（3つだけ）:**
   - ストリーミングの実データ検証（SSEモックでは再現困難な場合のみ）
   - Stripe決済の実行（本番課金が発生するため）
   - iOS固有の挙動（Chromiumでは再現不可能）
   それ以外のtest.skip()は禁止。データ注入 or APIモックで解決すること

**Phase 2: 全テスト再実行（スイートごとに分割。フォアグラウンドのみ）**
```bash
npx vite preview --port 4173 &
for spec in tests/e2e/specs/test*.spec.ts; do
  echo "=== $spec ==="
  FRONTEND_BASE=http://localhost:4173 npx playwright test "$spec" --project=mobile --reporter=list --timeout=30000 2>&1
done
```
FAILがあれば修正→該当スイート再テスト→全スイート回帰確認

**Phase 3: HTMLレポート生成**
```bash
FRONTEND_BASE=http://localhost:4173 npx playwright test --project=mobile --reporter=html --timeout=60000
cp -r playwright-report/* tests/e2e/report/
```

**完了コマンド（全てPASSで完了）:**
```bash
# cmd1: expect(true)が0件
grep -rn 'expect(true)' tests/e2e/specs/test*.spec.ts | wc -l  # 期待: 0

# cmd2: .catch(() => {})が5件以下
grep -rn '\.catch.*=>.*{})' tests/e2e/specs/test*.spec.ts | wc -l  # 期待: 5以下

# cmd3: test.skip()が全テストの5%以下
SKIPS=$(grep -rn 'test.skip' tests/e2e/specs/test*.spec.ts | wc -l | tr -d ' ')
TOTAL=0; for f in tests/e2e/specs/test*.spec.ts; do C=$(grep -c "test(" "$f"); TOTAL=$((TOTAL+C)); done
echo "skip: $SKIPS / $TOTAL = $((SKIPS*100/TOTAL))%"  # 期待: 5%以下

# cmd4: テスト全件実行結果（0 failed）
FRONTEND_BASE=http://localhost:4173 npx playwright test --project=mobile 2>&1 | tail -5

# cmd5: HTMLレポート存在
ls tests/e2e/report/index.html

# cmd6: canopy PASS
bash tests/smoke/canopy.sh 2>&1 | tail -1
```

**FAIL条件:**
- cmd1: expect(true) > 0
- cmd2: .catch(() => {}) > 5
- cmd3: test.skip() > 5%
- cmd4: failed > 0
- cmd5: HTMLレポートなし
- cmd6: canopy FAIL

**完了報告フォーマット（3区分必須）:**
```
TEST-REFACTOR: XX PASS / YY FAIL / ZZ SKIP / 合計WW
  修正したアンチパターン: expect(true) N件、catch N件、if条件 N件
  test01-ux: XX PASS / YY SKIP
  test01-checklist: XX PASS / YY SKIP
  test03〜08: 各スイートの結果
```

---

### TEST-FULL: 総合テスト403項目＋全FAIL修正（テスト配布前の品質保証）
> リスク: 🟡中
> 参照: docs/ux_user_test_v1.md, docs/ux_checklist_v1.md, docs/test_package_v1.md
> 対象ファイル: tests/e2e/specs/test*.spec.ts, frontend/**, src/**（FAIL修正時）
> 背景: ふとし実機確認で多数バグ発見（タスク追加不可、UIかぶり、リスト非表示）。テスト配布25名に耐える品質を保証

**目的:** 3つの仕様書の全403項目をPlaywrightテスト化→実行→全FAILを修正→0 failedまでループ

**Playwright環境（テスト前に実行）:**
```bash
cd /Users/futoshi/Desktop/goal-ai-worker
npm install -D playwright @playwright/test
npx playwright install chromium
```

**プリフライト（テストケース作成前に必ず実行・結果をこのファイルに記録）:**
```bash
UT=$(grep -c '^\- \[ \]' docs/ux_user_test_v1.md)
CL=$(grep -c '^### [A-Z]-[0-9]' docs/ux_checklist_v1.md)
TP=$(grep -c '^\- \[ \]' docs/test_package_v1.md)
echo "UT=$UT CL=$CL TP=$TP 合計=$(($UT+$CL+$TP))"
# 期待: UT=143, CL=130, TP=154, 合計=427
```
→ プリフライト結果: UT=___, CL=___, TP=___, 合計=___（Codeが埋める）

**テスト実行環境（本番URL禁止）:**
```bash
npx vite preview --port 4173 &
FRONTEND_BASE=http://localhost:4173
```

**Phase 1: specファイル作成（1:1対応。7ファイル）**
| spec | ソース | カウントコマンド |
|---|---|---|
| test01a-user-ops.spec.ts | ux_user_test_v1.md | `grep -c '^\- \[ \]'` |
| test01b-checklist.spec.ts | ux_checklist_v1.md | `grep -c '^### [A-Z]-[0-9]'` |
| test03-layout.spec.ts | test_package_v1.md §3 | `grep -c '^\- \[ \]'` (§3のみ) |
| test04-data.spec.ts | test_package_v1.md §4 | 同上(§4のみ) |
| test05-auth.spec.ts | test_package_v1.md §5 | 同上(§5のみ) |
| test06-errors.spec.ts | test_package_v1.md §6 | 同上(§6のみ) |
| test07-billing.spec.ts | test_package_v1.md §7 | 同上(§7のみ) |
| test08-edge.spec.ts | test_package_v1.md §8 | 同上(§8のみ) |

作成後のカウント一致確認（Phase 2に進む前に必須）：
```bash
TOTAL=0
for f in tests/e2e/specs/test*.spec.ts; do
  C=$(grep -c "test(" "$f")
  echo "$f: $C tests"
  TOTAL=$((TOTAL+C))
done
echo "合計: $TOTAL tests（期待: 403以上）"
```

**Phase 2: テスト実行→FAILレポート生成**
```bash
FRONTEND_BASE=http://localhost:4173 npx playwright test \
  --project=mobile \
  --reporter=html,list \
  --timeout=60000 2>&1 | tee tests/e2e/report/test-full-run1.log
```

**Phase 3: FAIL修正→再テスト→0 failedまでループ**
- FAILした項目のコード修正
- 修正後に該当テストのみ再実行（`--grep "テスト名"`）
- 全修正後にフルテスト再実行
- 0 failedになるまで繰り返し（最大3ループ。3ループで0にならない場合HOLD）

**完了コマンド（全てPASSで完了）:**
```bash
# cmd1: 全specのテストケース合計 ≥ 403
TOTAL=0; for f in tests/e2e/specs/test*.spec.ts; do C=$(grep -c "test(" "$f"); TOTAL=$((TOTAL+C)); done
[ "$TOTAL" -ge 427 ] && echo "PASS: $TOTAL >= 427" || echo "FAIL: $TOTAL < 427"

# cmd2: テスト全件PASS
FRONTEND_BASE=http://localhost:4173 npx playwright test --project=mobile 2>&1 | grep "0 failed"

# cmd3: スクリーンショット存在（各テストスイートから最低1枚）
for d in test01 test03 test04 test05 test06 test07 test08; do
  ls tests/e2e/screenshots/$d/*.png 2>/dev/null | wc -l
done

# cmd4: HTMLレポート存在
ls tests/e2e/report/index.html
```

**FAIL条件:**
- cmd1: テストケース合計 < 427
- cmd2: failed > 0
- cmd3: いずれかのスイートでスクショ0枚
- cmd4: HTMLレポートなし
- 完了報告に分母がない
- try/catchでSKIPした項目をPASSに含めている

**完了報告フォーマット（3区分: PASS/FAIL/SKIP）:**
```
TEST-FULL: XX PASS / YY FAIL / ZZ SKIP / 合計427
  test01a-user-ops: XX/143 PASS, YY FAIL, ZZ SKIP
  test01b-checklist: XX/130 PASS, YY FAIL, ZZ SKIP
  test03-layout: XX/N PASS, YY FAIL, ZZ SKIP
  test04-data: XX/N PASS, YY FAIL, ZZ SKIP
  test05-auth: XX/N PASS, YY FAIL, ZZ SKIP
  test06-errors: XX/N PASS, YY FAIL, ZZ SKIP
  test07-billing: XX/N PASS, YY FAIL, ZZ SKIP
  test08-edge: XX/N PASS, YY FAIL, ZZ SKIP
修正ファイル: git diff --stat
HTMLレポート: tests/e2e/report/index.html
```

---

### DEV-01: ※TEST-FULL Phase 3に統合済み
> TEST-FULLのFAIL修正で以下が全てカバーされる:
> BUG-02（TALK UI統一）、BUG-03（ルーティング不具合）、タスク追加UX、日記仕様、チェックリスト残修正
> 各バグの詳細仕様はdocs/ux_user_test_v1.md + docs/test_package_v1.mdに記載
> TEST-FULLが0 failedになった時点でDEV-01も完了

---

### DEV-02: 開発体制改善v3（Code側ツール＋Claude新機能導入）
> リスク: 🟡中
> 推定: 1時間
> 参照: docs/dev_improvement_v2.md, docs/dev_improvement_v3.md, docs/z_index_map.md, docs/test_package_v1.md
> 対象ファイル: .claude/settings.json, .claude/hooks/*.sh, .claude/commands/*.md, package.json, tests/e2e/playwright.config.ts, tests/e2e/specs/*.spec.ts

**目的:** フック/パーミッション/テスト環境を整備し、品質ゲートを機械的に強制する

**Phase 0: テストアンチパターン修正（canopy G5-v4対応。最優先）**
- expect(true) 4件 → test.skip(true, '理由')に書き換え
- 空catchブロック 12件 → catch内にtest.skip()追加 or 適切なエラー処理
- typeof-onlyアサーション 4件 → 値の検証に変更 or test.skip()
- 修正パターンはdocs/test_package_v1.md「テストSKIPルール」参照
- **if (count > 0) 条件分岐 127件:** 全件は対象外。優先修正のみ:
  - 必須要素（ボトムタブ、ハンバーガー、サイドバー、タスクリスト）のif囲みを外す
  - オプション要素（AI応答、プロフィールチップ）はtest.skip()パターンに変更
  - 判断基準はdocs/test_package_v1.md「必須/オプション分類表」参照
```bash
# 完了コマンド:
grep -rn 'expect(true)' tests/e2e/specs/test*.spec.ts | wc -l  # 期待: 0
grep -rn '\.catch.*=>.*{})' tests/e2e/specs/test*.spec.ts | wc -l  # 期待: 5以下
FRONTEND_BASE=http://localhost:4173 npx playwright test --project=mobile 2>&1 | grep "0 failed"
```

**Phase 1: フック検証（Claude.aiが.claude/settings.json + hooks/を作成済み）**
- .claude/settings.json: 6イベント（PreToolUse/PostToolUse/SessionStart/SessionEnd/UserPromptSubmit/Stop）
- .claude/hooks/: 6スクリプト作成済み（post-test-antipattern.sh追加済み）
- Codeは各フックの動作を検証し、必要に応じて修正

**Phase 2: Playwright環境安定化**
- package.jsonにpostinstall追加: `"postinstall": "npx playwright install chromium"`
- @playwright/testとplaywrightのバージョンを一致させてpin
- playwright.config.tsにマルチviewport追加（SE 320px / Plus 414px / iPad 768px）

**Phase 3: セッション運用**
- --continue標準化の運用手順をCLAUDE.mdに記載
- /compactの使用タイミングガイド

**完了コマンド:**
```bash
# フック設定が存在
ls .claude/settings.json .claude/hooks/pre-deploy-gate.sh .claude/hooks/session-start-context.sh
# postinstall設定
grep -q "postinstall" package.json
# マルチviewport
grep -c "mobile-se\|mobile-plus\|tablet" tests/e2e/playwright.config.ts | awk '{if($1>=3) exit 0; else exit 1}'
```

**完了コマンド:**
```bash
ls .claude/settings.json .claude/commands/canopy-deploy.md  # 両方存在
grep "postinstall" package.json  # playwright install含む
```

---

### UX-01: UX全面刷新「君の人生をより素敵に」
> リスク: 🔴高
> 参照: docs/ux_redesign_v2.md（452行。全仕様はここに集約）
> 方針: テスト配布より「自分が毎日使いたいツール」を優先。Phase A→B→C→D順

---

### UX-01-A8: ME identity DB + API（Phase A最初。全体の基盤）
> リスク: 🟡中
> 推定: 1.5時間
> 参照: docs/ux_redesign_v2.md §A-8
> 対象ファイル: docs/sql/user_identity.sql（新規）, src/routes/me.js（新規）, src/index.js

**目的:** MEの自己定義データ（vision/identity/mindset_preset）を保存・取得するDB+APIを作る。以降のA-6,A-1,A-2が全てこのデータに依存

**Supabase user_identityテーブル:**
```sql
CREATE TABLE IF NOT EXISTS user_identity (
  user_id UUID PRIMARY KEY,
  vision TEXT,
  identity JSONB NOT NULL DEFAULT '{}',
  mindset_preset TEXT NOT NULL DEFAULT 'futoshi',
  qol_proposals JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_identity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON user_identity FOR ALL USING (true) WITH CHECK (true);
```

**APIエンドポイント（src/routes/me.js新規）:**
- `GET /api/me/identity` — user_idでuser_identityを取得。なければデフォルト値返却
- `PUT /api/me/identity` — vision/identity/mindset_presetを更新

**プリフライト:**
```bash
# Supabase接続確認
grep -c 'SUPABASE_URL' src/index.js  # 期待: 1以上
# 既存のmeルートがないこと
ls src/routes/me.js 2>/dev/null && echo "EXISTS" || echo "NEW"
```

**完了コマンド:**
```bash
# cmd1: SQLファイル存在
ls docs/sql/user_identity.sql

# cmd2: APIルート存在+登録
grep -c 'me.js' src/index.js  # 期待: 1以上
grep -c 'identity' src/routes/me.js  # 期待: 2以上（GET+PUT）

# cmd3: canopy PASS
bash tests/smoke/canopy.sh 2>&1 | tail -1

# cmd4: curlでAPI動作確認（デプロイ後）
curl -s -o /dev/null -w "%{http_code}" https://goal-ai-worker.goalai-futoshi.workers.dev/api/me/identity
# 期待: 401（認証必須）
```

**FAIL条件:** SQLファイルなし / APIルート未登録 / canopy FAIL / エンドポイント未応答

---

### UX-01-A6: マインドセットプリセット v1（ふとし固定）
> リスク: 🟡中
> 推定: 1時間
> 参照: docs/ux_redesign_v2.md §A-6
> 対象ファイル: src/services/prompt.js, src/routes/me.js, frontend/js/profile.js

**目的:** ふとしのマインドセットをシステムプロンプトに注入。全TALK応答がこの価値観に基づく。ME画面にプリセット表示（v1は固定、切替UIは箱だけ）

**システムプロンプト注入内容:**
```
[MINDSET_PRESET: futoshi]
価値観:
- 周りを幸せにすればそこにお金は生まれ集まる
- 人は感情が集まるところに集まる
- 人の人生を幸せになるようにコーディネートすることが理想
- 行動力とフットワークの軽さを重視する
- 薄っぺらい自慢は価値がない。本質的な成長を追求する
- 「知らないとやろうとも思わない」を防止する。選択肢を広げる
判断基準: 「それは相手を幸せにするか？」
[/MINDSET_PRESET]
```

**実装:** buildServerSystemPromptにuser_identity.mindset_presetを参照して注入

**完了コマンド:**
```bash
# cmd1: プリセット定義がprompt.jsに存在
grep -c 'MINDSET_PRESET\|mindset_preset\|futoshi' src/services/prompt.js  # 期待: 2以上
# cmd2: buildServerSystemPromptがidentityを参照
grep -c 'identity\|mindset' src/services/prompt.js  # 期待: 1以上
# cmd3: canopy PASS
bash tests/smoke/canopy.sh 2>&1 | tail -1
```

**FAIL条件:** プリセット定義なし / prompt.jsにidentity参照なし / canopy FAIL

---

### UX-01-A1: TALK意図分類エンジン
> リスク: 🟡中
> 推定: 1.5時間
> 参照: docs/ux_redesign_v2.md §A-1
> 対象ファイル: src/services/prompt.js, src/routes/chat.js, frontend/js/chat.js

**目的:** ユーザーのTALK入力を5種（GOAL_CREATE/TASK_CREATE/QUESTION/STATUS_UPDATE/LIFE_DESIGN）に分類し、種別に応じたアクションを実行するエンジン

**実装:**
1. システムプロンプトに意図分類指示を追加（[INTENT:xxx]タグ出力）
2. Worker側でAI応答から[INTENT:xxx]タグを検出
3. GOAL_CREATE検出時→[GOAL_PROPOSAL]タグの解析→Supabase goals+tasksに保存
4. フロントエンドでGOAL_PROPOSALをカード表示→ユーザー承認→TODAY反映

**完了コマンド:**
```bash
# cmd1: 意図分類の指示がプロンプトに存在
grep -c 'INTENT\|GOAL_CREATE\|TASK_CREATE\|STATUS_UPDATE' src/services/prompt.js  # 期待: 3以上
# cmd2: Worker側のタグ検出処理
grep -c 'INTENT\|GOAL_PROPOSAL' src/routes/chat.js  # 期待: 2以上
# cmd3: フロントエンドのカード表示
grep -c 'GOAL_PROPOSAL\|goal-proposal' frontend/js/chat.js  # 期待: 1以上
# cmd4: canopy PASS
bash tests/smoke/canopy.sh 2>&1 | tail -1
```

**FAIL条件:** 意図分類なし / タグ検出なし / カード表示なし / canopy FAIL

---

### UX-01-A2: GOAL_CREATEフロー（会話→ゴール→タスク→スケジュール自動展開）
> リスク: 🟡中
> 推定: 2時間
> 参照: docs/ux_redesign_v2.md §A-2, §A-3
> 対象ファイル: src/routes/chat.js, src/routes/goals.js, frontend/js/chat.js, frontend/js/goals.js

**目的:** 「ICL受けたい」→ AIが深掘り→ゴール提案→タスク分解→スケジュール化→TODO反映を1つの会話内で完結。STATUS_UPDATE（「行ってきた」→進捗更新→次タスク提案）も含む

**フロー:**
```
ユーザー「ICL受けたい」
→ AI: [INTENT:GOAL_CREATE] + 深掘り1-3往復
→ AI: [GOAL_PROPOSAL] name/why/deadline/related_goals/tasks
→ フロント: 提案カード表示（承認/修正/却下）
→ 承認 → Supabase goals+tasks保存 → TODAY画面にタスク反映
```

**完了コマンド:**
```bash
# cmd1: GOAL_PROPOSAL解析ロジック
grep -c 'GOAL_PROPOSAL' src/routes/chat.js  # 期待: 2以上
# cmd2: ゴール+タスク同時作成API
grep -c 'tasks' src/routes/goals.js  # 期待: 3以上
# cmd3: フロントの提案カードUI
grep -c 'goal-proposal\|GoalProposal\|proposal-card' frontend/js/chat.js  # 期待: 1以上
# cmd4: canopy PASS
bash tests/smoke/canopy.sh 2>&1 | tail -1
```

**FAIL条件:** 提案タグ解析なし / ゴール+タスク同時作成不可 / カードUIなし / canopy FAIL

---

### UX-01-A5: ゴール間参照（リンク機能）
> リスク: 🟡中
> 推定: 1.5時間
> 参照: docs/ux_redesign_v2.md §A-5
> 対象ファイル: docs/sql/goal_links.sql（新規）, src/routes/goals.js, frontend/js/goals.js

**目的:** ゴール間にリンクを張る。手動リンク + AIがGOAL_CREATE時/TASK_COMPLETE時に自動提案

**Supabase goal_linksテーブル:**
```sql
CREATE TABLE IF NOT EXISTS goal_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id_from UUID NOT NULL,
  goal_id_to UUID NOT NULL,
  link_type TEXT NOT NULL DEFAULT 'related',
  created_by TEXT NOT NULL DEFAULT 'ai',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**APIエンドポイント:**
- `POST /api/goals/link` — リンク作成
- `GET /api/goals/:id/links` — 関連ゴール取得

**完了コマンド:**
```bash
# cmd1: SQLファイル存在
ls docs/sql/goal_links.sql
# cmd2: リンクAPI存在
grep -c 'link' src/routes/goals.js  # 期待: 3以上
# cmd3: GOAL_PROPOSAL内のrelated_goals解析
grep -c 'related_goals\|goal_links' src/routes/chat.js  # 期待: 1以上
# cmd4: canopy PASS
bash tests/smoke/canopy.sh 2>&1 | tail -1
```

**FAIL条件:** SQLなし / リンクAPIなし / related_goals未解析 / canopy FAIL

---

### G5: 待機中アニメーション改善（再実装。過去2回偽完了）
> リスク: 🟢低
> 参照: （仕様は本セクション内に記載）
> 対象ファイル: frontend/js/chat.js, frontend/js/api.js, frontend/style.css

**目的:** AI応答待ちの体感時間短縮。フェーズ別テキスト＋タイピング演出

**仕様:**
- ルーティング中（>1秒経過時）: 「どのAIが適任か相談中...」表示
- quickRoute確定時: 判断中テキストスキップ→即AI名表示
- AI応答待ち: 「ChatGPT/Claude/Geminiが考えています...」表示
- ストリーム開始前: `・・・`表示（点滅なし）
- 最初のtoken到着: `_`カーソル点滅（500ms間隔）
- ストリーム完了: カーソル消去

**完了コマンド（全てPASSで完了）:**
```bash
# コードが存在する（必要条件。十分条件ではない）
grep -c "相談中" frontend/js/chat.js  # 期待: 1以上
grep -c "考えています" frontend/js/chat.js  # 期待: 1以上
grep -c "blink" frontend/style.css  # 期待: 1以上

# Playwrightでメッセージ送信→待機テキスト表示を確認（十分条件）
FRONTEND_BASE=http://localhost:4173 npx playwright test --grep "待機アニメ" 2>&1 | grep "0 failed"

# スクリーンショット存在（動作確認の証拠）
ls tests/e2e/screenshots/g5/*.png | wc -l  # 期待: 2以上（待機中+ストリーム中）
```

**FAIL条件:**
- grepでコード存在を確認しただけでスクショがない
- Playwrightテストがない or FAILしている
- 「完了」報告にスクショパスが含まれていない

---

### BUG-01b: iOSキーボード問題（HOLD: 根本原因未特定）
> リスク: 🟡中
> 状態: HOLD（修正試行3回制限に到達。Phase 1-8で9回試行→全失敗）
> 詳細な失敗履歴: instructions/results/session_history.md

**症状:** キーボード表示時にページ上方シフト＋スクロールで入力ボックスがキーボード裏に隠れる
**環境:** iOS Safari全WebKitブラウザ。Android/デスクトップでは発生しない
**最終状態:** v3.11.34。overflow:clip + preventScroll + visualViewport.resize。動作はするが残課題あり
**次のアクション:** テスト配布後のユーザーFBで判断。または新アプローチ（CSS env(keyboard-inset-height)等）をClaude.aiが設計してからCode実行

---

## 保留事項

### B4/B5 KVキャッシュ実装時の必須確認（ふとし指示 2026-03-27）
- profile KV: 更新時にKV.delete必須。ゴール変更時もinvalidate
- userId KV: token_idは不変→永続キャッシュOK

### G6 未実装施策（次フェーズ）
- A3: max_tokens段階削減（Stage B動作確認後）
- A20: usage_tracking KVバッファ化
- B20: /api/route軽量エンドポイント
- G6-E: 信頼度+代替AI提案（mockup待ち）
- G6-D: フィードバック学習（Eと一体）

### 提案ログ（第7回自律調査 2026-04-05 Phase A完了後）
| # | 項目 | リスク | 状態 | 出典 |
|---|------|--------|------|------|
| P11 | UX-01-B1: ME画面の構造化ヒアリングセッション | 🟡 | 未実施 | ux_redesign_v2 §B-1 |
| P12 | UX-01-B2: ヒアリング結果→MEプロフィール自動反映 | 🟡 | 未実施 | ux_redesign_v2 §B-2 |
| P13 | UX-01-B3: ME属性→TALKのAI応答に反映 | 🟡 | 未実施 | ux_redesign_v2 §B-3 |
| P14 | C2基準フロー: Phase A成果物のbuild+deploy | 🟢 | 要実行 | CLAUDE.md鉄則2 |

**P14の判断根拠:** Phase Aの5ミッション実装が完了。C2基準フローに従いbuild→canopy→deploy→tag→pushが必要。ただしP11-P13のPhase BはClaude.aiがキューに追加する必要あり。

### 提案ログ（第6回自律調査 2026-04-03）
| # | 項目 | リスク | 状態 | 出典 |
|---|------|--------|------|------|
| P1 | initTabSwipe未接続 | 🟢 | 未実施 | 前回調査 |
| P2 | Analytics月別チャート実データ | 🟡 | 未実施 | 前回調査 |
| P3 | タスク溜まり警告 | 🟢 | 未実施 | 前回調査 |
| P4 | AI理解メモ4カテゴリアコーディオン | 🟡 | mockup必要 | 前回調査 |
| P5 | プロフィール理解度スクロール自動閉じ | 🟢 | 実装済み確認 | profile.js:1382 |
| P6 | AI理解メモ更新トースト（バックエンドSSE未送信） | 🟢 | 未実施 | reference_v2 #14 |
| P7 | FBキーボード見切れ対応（グローバルハンドラ化） | 🟢 | 未実施 | reference_v2 #7 |
| P8 | GET /api/et/status エンドポイント | 🟢 | 未実施 | reference_v2 |
| P9 | POST /api/addon/purchase エンドポイント | 🟠 | mockup必要 | reference_v2 |
| P10 | プラン選択2ステップUI（カルーセル+比較表） | 🟠 | mockup必要 | spec_v3 #08d |

---

## 完了済み（詳細は instructions/results/session_history.md）

- V4 ✅ v4.0.0-v4.0.4デプロイ済み
- G1 ✅ ヘッダーアイコン拡大
- G2 ✅ チャット横線削除
- G3 ✅ ルーティングバグ修正
- G6 ✅ コスト削減+速度改善バッチ（10施策）
- A1-A5, B1-B5 ✅ 全画面mockup照合+実装
- C16 Stage A ✅ 全8画面PASS
- 開発体制v1 ✅ 4Phase策定
- 開発体制v2 ✅ 30項目改善策定（本セッション）
- TEST-FULL ✅ 438 PASS / 0 FAIL / 0 SKIP（v4.0.4, 2026-04-03）
  - test01-ux: 144/143 PASS
  - test01-checklist: 132/130 PASS
  - test03-layout: 44/44 PASS
  - test04-data: 34/34 PASS
  - test05-auth: 18/18 PASS
  - test06-errors: 20/20 PASS
  - test07-billing: 14/14 PASS
  - test08-edge: 24/24 PASS
  - baseline+design+features: 8 PASS
  - HTMLレポート: tests/e2e/report/index.html
- DEV-02 ✅ 開発体制改善v3完了（2026-04-03）
  - フック6種設定・動作確認済み（pre-deploy-gate, stop-test-check実動作確認）
  - postinstall追加、Playwright 1.59.1 pin
  - マルチviewport追加（mobile-se 320px, mobile-plus 414px, tablet 768px）
- G5 ✅ 待機アニメーション改善（v4.0.5, 2026-04-03）
  - 3フェーズ実装: ・・・→相談中(1s後)→{AI名}が考えています→カーソル点滅→消去
  - Playwrightテスト4件 + スクショ5枚
- TEST-REFACTOR ✅ テストアンチパターン修正（2026-04-03）
  - 439 PASS / 0 FAIL / 14 SKIP / 合計453
  - 修正: expect(true) 4→0件、|| true 12→0件、catch→false 15→4件（許容範囲）、if(count>0) 26件修正
  - test01-ux: 139 PASS / 1 SKIP / 3 flaky
  - test01-checklist: 129 PASS / 1 SKIP
  - test03-layout: 39 PASS / 5 SKIP
  - test04-data: 28 PASS / 6 SKIP
  - test05-auth: 18 PASS
  - test06-errors: 20 PASS
  - test07-billing: 12 PASS / 2 SKIP
  - test08-edge: 24 PASS
  - test.skip率: 19/440 = 4.3%（5%以下）
  - canopy PASS、HTMLレポート: tests/e2e/report/index.html
- TEST-E2E ⏸ 本番API E2Eテスト中断（v4.0.6, 2026-04-03）
  - 67 PASS / 2 FAIL / 10 SKIP / 7 did not run / 合計86
  - 修正済み: タスク追加バグ（ALL_GOALS空時デフォルトゴール作成）、saveGoals未定義→API直接呼出
  - 残FAIL: E2E-02 Task appears in TODAY list（各テスト独立コンテキストでタスクデータなし）
  - E2E-01〜18のうち14セクションPASS
  - スクリーンショット74枚、HTMLレポート: tests/e2e/report/index.html
  - v4.0.6デプロイ済み（タスク追加修正）
- TEST-DESIGN ⏸ デザイン品質テスト HOLD（2026-04-03）
  - 46 PASS / 9 FAIL / 合計55
  - Cat1 タップターゲット: 9/9 PASS ✅（hamburger,toolbar btn 44px化、CSS global min-size追加）
  - Cat2 フォントサイズ: 0/9 PASS ❌（317箇所の8-11px要素。一括修正はレイアウト崩壊リスク）
  - Cat2 行間: 9/9 PASS ✅
  - Cat2 コントラスト: 1/1 PASS ✅
  - Cat3 レイアウト: 27/27 PASS ✅ スクショ27枚
  - 方針: Cat1+Cat3 PASSで今回完了扱い。font-size 9 FAILは基準12px維持のまま既知負債としてUX-01で対処。テストは残す
  - 修正済み: #hamburger-btn, .mode-chip, .nav-section, toolbar buttons → 44px/12px化
- UX-01-A8 ✅ ME identity DB + API（2026-04-05）
  - docs/sql/user_identity.sql 作成（user_id, vision, identity, mindset_preset, qol_proposals）
  - src/routes/me.js 新規（GET/PUT /api/me/identity）
  - index.jsにルート登録、canopy PASS
- UX-01-A6 ✅ マインドセットプリセット v1（2026-04-05）
  - MINDSET_PRESETS定義（futoshi固定）をprompt.jsに追加
  - buildServerSystemPromptでuser_identity.mindset_presetを参照→システムプロンプトに注入
  - user_identityとusersを並列fetch（Promise.all）
- UX-01-A1 ✅ TALK意図分類エンジン（2026-04-05）
  - システムプロンプトに5種意図分類指示+[INTENT:xxx]タグ出力+[GOAL_PROPOSAL]構造化タグ指示追加
  - Worker側: 非ストリーム応答でINTENT/GOAL_PROPOSALタグ検出ログ
  - フロント: processIntentTags()でタグ検出・除去、parseGoalProposal()で構造化解析、showGoalProposalCard()でカードUI表示
- UX-01-A2 ✅ GOAL_CREATEフロー（2026-04-05）
  - A1で実装済みのGOAL_PROPOSALカード→承認→ゴール+タスク作成→TODAY反映フロー
  - acceptGoalProposal(): apiCreateGoal→phases付きapiUpdateGoal→ALL_GOALS追加→renderTodayScreen
- UX-01-A5 ✅ ゴール間参照（2026-04-05）
  - docs/sql/goal_links.sql作成（goal_id_from, goal_id_to, link_type, created_by）
  - POST /api/goals/link, GET /api/goals/:id/links API追加
  - parseGoalProposalにrelated_goals解析追加
  - 変更: src/routes/me.js(新), docs/sql/*.sql(新2), src/index.js, src/routes/goals.js, src/routes/chat.js, src/services/prompt.js, frontend/js/chat.js
