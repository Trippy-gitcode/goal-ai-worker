# GOAL AI — プロジェクトダッシュボード
> セッション引き継ぎの唯一の情報源。300行以内を維持。
> 仕様参照: docs/goal_ai_project_v6_4.md / docs/goal_ai_reference_v2.md
> ミッション定義: templates/mission_template_v2.md準拠
> 完了済み詳細: instructions/results/session_history.md

---

## 5行サマリー
- **Version:** v4.0.4（デプロイ済み 2026-04-03）
- **Next:** UX-01（UX全面刷新）— 🔴高リスク、ふとし承認必須
- **Last done:** DEV-02完了（フック6種+Playwright環境安定化+マルチviewport）
- **Open issues:** UX-01はmockup作成→ふとし承認が必要
- **方針変更:** ミッション完了条件を全てbashコマンドで表現する体制に移行（dev_improvement_v2.md）

## 現在地
- **バージョン:** v4.0.4
- **チェーン:** ~~TEST-FULL~~ → ~~DEV-02~~ → UX-01 → G5
- **次のミッション:** UX-01

---

## ミッションキュー（上から順に実行）

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
```bash
# 完了コマンド: expect(true)が0件
grep -rn 'expect(true)' tests/e2e/specs/test*.spec.ts | wc -l  # 期待: 0
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

### UX-01: UX全面刷新（ボトムタブ＋秘書AI）
> リスク: 🔴高
> 参照: docs/ux_redesign_v1.md
> 対象ファイル: frontend/index.html, frontend/style.css, frontend/js/*.js, docs/mockups/*.html

**目的:** ボトムタブ4画面（TODAY/TALK/GOALS/ME）＋サイドバー維持。秘書AI5機能実装

**Step 1: mockup作成（全画面）→ Stage 0承認**
**Step 2: フロントエンド実装**
**Step 3: 秘書AI行動ロジック**
**Step 4: 品質チェック全件検証**

**完了コマンド:**
```bash
# mockup存在
ls docs/mockups/today_*.html docs/mockups/talk_*.html | wc -l  # 期待: 2以上
# Stage A PASS
node scripts/c16_stage_a.js 2>&1 | grep "PASS"
# 全テストPASS
FRONTEND_BASE=http://localhost:4173 npx playwright test --project=mobile 2>&1 | grep "0 failed"
```

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

### 提案ログ（第5回自律調査 2026-03-30）
| # | 項目 | リスク | 状態 |
|---|------|--------|------|
| P1 | initTabSwipe未接続 | 🟢 | 未実施 |
| P2 | Analytics月別チャート実データ | 🟡 | 未実施 |
| P3 | タスク溜まり警告 | 🟢 | 未実施 |
| P4 | AI理解メモ4カテゴリアコーディオン | 🟡 | mockup必要 |
| P5 | プロフィール理解度スクロール自動閉じ | 🟢 | 未実施 |

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
