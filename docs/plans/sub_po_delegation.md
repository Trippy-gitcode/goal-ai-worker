# sub_po_delegation.md — ADV → PO 作業依頼判定フロー SSoT

> **親**: `core_spec.md` §3（ADV 行動規範）+ §4（PO 判断必須事項の限定）+ §11（ペルソナレビュー）
> **新設**: 2026-04-30 v0.1.0（SUBAGENT-DEVSYS-PO-DELEGATION-FLOW-V1）
> **改変ポリシー**: 改変禁止セクション（GENERATED START〜END）+ App 固有セクション（App 開発者編集可）
> **連動**:
> - `skills/adv-check.md` 検査 E（PO 作業依頼前 5 項目 self-check）
> - `verify/adv_violation_log.md` カテゴリ「不要な PO 依頼」
> - `scripts/adv_response_gate.sh` Stop hook BLOCK パターン拡張（仕様改定 F、次回 SUBAGENT 経由）

<!-- GENERATED: DO NOT MODIFY START -->

---

## §1 目的

ADV が PO に作業を依頼する前の自己診断を機械強制し、不必要な PO 作業発生を防ぐ。

### §1.1 背景

`verify/adv_violation_log.md` で記録された違反 #1〜#3 はいずれも「ADV 自身が代行可能な作業を user に依頼した結果として、応答 draft 内に trigger 4 語（起動 / 貼付 / 判断仰ぎ / タイミング）が混入し、Stop hook で BLOCK」という構造であった。trigger 4 語の混入は表層症状であり、根本原因は「ADV が PO 依頼を選択した時点で、本来 ADV 代行可能な作業まで user に振った」事象にある。

直近では「nightly_review_wrapper.sh の env 継承」を ADV が `zsh -i -c '<command>'` wrap で代行可能だったのに、user に手動実行を 5 回繰返し依頼した（違反 #3 の発展形）。本フローはこの構造を解消する。

### §1.2 適用範囲

ADV メインセッションが応答中で user に作業を依頼する前段に必ず適用。subagent 経由依頼は本フロー対象外（subagent は別ミッションで自律実行）。

### §1.3 本フローと §4 の関係

`core_spec.md` §4 PO 判断必須事項（コスト ≥ ¥500/月変動 / 新プロセス / ブランド変更）は本フロー対象外。§4 該当時は本フローを通さず §4 で直接 escalate（§5 例外参照）。

---

## §2 5 項目 self-check

順次評価、最初に YES が出た時点で確定。Check 1〜5 のいずれの結果も応答中に明示する。

### Check 1: 認証情報依存

その作業は user 個人の認証情報が必須か?

- 例: API key 取得 / sudo password / GitHub OAuth / banking 認証 / human-only ID 入力 / 2FA 端末確認
- YES → **PO 依頼可**（ADV 代行不能、認証は user 個人に紐付き、ADV tool では取得不可）
- NO → Check 2 へ

明示形式: `[Check 1: YES (認証情報依存: <種別>)]` または `[Check 1: NO]`

### Check 2: 物理 / 感性判断

その作業は user の物理判断 or ブランド感性判断が必須か?

- 物理判断: 写真目視確認 / 体験評価 / 商品サンプル評価 / 印刷物確認 / 実機ハードウェア状態確認
- 感性判断: 色彩トーン / タッチ感 / ブランド DNA 一致 / コピー語感
- YES → **PO 依頼可**（ADV は LLM のため物理空間 / ブランド感性の最終判定不可）
- NO → Check 3 へ

明示形式: `[Check 2: YES (物理/感性: <種別>)]` または `[Check 2: NO]`

### Check 3: ADV tool で代行可能性

その作業は ADV の Bash / Edit / Write / Agent / Read tool で代行可能か?

- subagent 経由含む（`scripts/subagent_mission_validator.sh` 通過後の dispatch も「代行可」扱い）
- 例: ファイル編集 / grep 検索 / git 操作 / curl / npm install / test 実行 / log 解析
- 代行可 → **ADV 自律実行**（PO 依頼不要、応答に依頼文を含めない）
- 不可 → Check 4 へ

明示形式: `[Check 3: 代行可 (<手段>)]` で自律実行、または `[Check 3: 不可 → Check 4]`

### Check 4: env / 認証の代行可能性

ADV が代行する際の env（環境変数）/ 認証は以下のいずれかで担保可か?

- (a) `zsh -i -c '<command>'` wrap で user shell env 継承（PATH / NODE_OPTIONS / API_KEY 等）
- (b) `~/.claude/settings.json` の `env` フィールド経由
- (c) 既存 hook 経由（`scripts/lib/resolve_repo_root.sh` / `scripts/external_review_guardrail.sh` 等）
- (d) Tool 既設 auth（Anthropic SDK / GitHub gh CLI / Stripe SDK 等の認証済 binary）
- いずれか YES → **ADV 自律実行**（zsh -i wrap や hook 経由で env 継承）
- 全 NO → Check 5 へ（ただし「全 NO」は user 個人 keychain 等の特殊ケースのみ、通常は (a)〜(d) のいずれかが当てはまる）

明示形式: `[Check 4: (a/b/c/d) で代行可]` で自律実行、または `[Check 4: 全 NO → user 依頼不可避]`

### Check 5: 動作確認の代行可能性

動作確認（smoke / e2e / 観測）は ADV の cmd-realworld + verify/ 経由で実行可能か?

- 可: log grep / test runner 実行 / API レスポンス検証 / file 状態確認 / process 一覧確認
- 不可: UI 目視（実機画面のレイアウト確認）/ 物理ハードウェア状態 / 人間体験評価
- 可 → **ADV 確認**（user 確認依頼禁止、cmd-realworld + verify/ 経由で報告）
- 不可 → user に最小限依頼（一括 setup を 1 回で済ませる、繰返し依頼禁止）

明示形式: `[Check 5: ADV 確認可 (cmd-realworld 経由)]` または `[Check 5: user 確認依頼必須 (UI 目視)]`

---

## §3 違反パターンと回避策

| 違反パターン | 例 | 回避策 |
|---|---|---|
| Check 3 で代行可能なのに依頼 | env 継承で代行可能なものを user に手動実行 | `zsh -i -c '<cmd>'` wrap、subagent 経由、Bash run_in_background |
| Check 5 で代行可能なのに依頼 | cmd-realworld で確認可能なものを user に動作確認依頼 | ADV 側で grep / log / test 実行、結果を verify/ に書込 |
| 一括 setup を分割依頼 | API key 取得 + plist 編集 + 動作確認を 3 回 user 依頼 | Check 1 のみ user（API key 取得）、残は ADV 自律 |
| trigger 4 語混入による Stop hook BLOCK | 依頼文中で「実行してください / 設定してください / 確認してください」を多用 | 5 項目 self-check 結果を応答中に明示、不要な依頼を削除 |

### §3.1 違反パターンの再分類

`verify/adv_violation_log.md` に記録された違反 #1〜#3 は trigger 4 語混入で BLOCK されたが、根本構造は本 §2 5 項目 self-check の不在 / 不適用である:

- 違反 #1+#2（不要な PO 作業発生提案検出 + メタタグ欠落）は本 §2 違反として再分類（Check 3〜5 の self-check 欠落）
- 違反 #3（nightly_review_wrapper の env 継承見落とし）は Check 4 (a) `zsh -i` 想到不全 → user 5 回依頼に発展 = 本 §2 直接違反

---

## §4 機械強制実装

### §4.1 skill 検査 E（応答前）

`skills/adv-check.md` 検査 E（本フロー実装、SUBAGENT-DEVSYS-PO-DELEGATION-FLOW-V1 で追加）:

- ADV 応答中に user 作業依頼パターン（「実行してください」「設定してください」「確認してください」「入力してください」「試してください」等）を検出
- かつ Check 1〜5 結果明示 / `sub_po_delegation §2 Check N` 参照のいずれも不在
- → 応答生成中断 + 自己訂正

### §4.2 Stop hook BLOCK パターン拡張（仕様改定 F、次回 SUBAGENT 経由）

`scripts/adv_response_gate.sh` は GENERATED ファイル（改変禁止）のため、本ミッション（SUBAGENT-DEVSYS-PO-DELEGATION-FLOW-V1）では直接改変せず、次回 SUBAGENT-DEVSYS-VIOLATION-FIX-V3（または同等の subagent）経由で以下パターン追加を予定:

- 「実行してください / 設定してください / 確認してください / 入力してください / 試してください」等の user 依頼語句を検出
- かつ「Check N」または「sub_po_delegation」参照が応答中に不在
- → BLOCK + violation message に「§2 sub_po_delegation 5 項目 self-check 不在」を明記

### §4.3 違反 log カテゴリ追加

`verify/adv_violation_log.md` の違反カテゴリ table に行追加:

| カテゴリ | 該当 § |
|---|---|
| 不要な PO 依頼 | sub_po_delegation §2（5 項目 self-check） |

---

## §5 例外

### §5.1 §4 PO 判断必須事項

`core_spec.md` §4 PO 判断必須事項（以下 3 種）は本フロー対象外、§4 で直接 escalate:

1. コスト影響: 月額コスト変動 ≥ ¥500 の選択肢
2. 新プロセス: 既存フロー外の新規業務プロセス導入
3. ブランド変更: プロダクト名・ドメイン・配色等のブランド要素変更

§4 該当時は本フロー（5 項目 self-check）ではなく `core_spec.md` §4.1 PO 作業発生提案の事前ゲート + §8 14 票投票機構を経由。

### §5.2 緊急停止系

PO セッション破棄 / 障害復旧停止 / 機密漏洩発生時の即時停止判断は本フロー対象外（即時 PO 報告）。

### §5.3 PO 直接指示

PO が直接「ふとしの判断で X してくれ」「ADV が決めて」と発言した場合、本フロー Check 3〜5 は省略可（PO 委任）。ただし PO-DIRECTIVE-NNN として `docs/po-decisions.md` に記録。

---

## §6 既存違反 #1-#3 への遡及適用

### §6.1 違反 #1（2026-04-29 18:10）

- 違反内容: subagent 2 件起動報告末尾で「PO 判断待ち（継続中）」として OPEN-001 / OPEN-002 を再掲、Stop hook が BLOCK
- 本 §2 適用: Check 3 で代行可（OPEN-NNN は decision_log.md / in_flight_topics.md に既登録、応答中再掲不要 = ADV 自律で削除可）
- 遡及分類: 本 §2 「Check 3 で代行可能なのに依頼」違反

### §6.2 違反 #2（2026-04-29 23:08）

- 違反内容: D1 詳細応答中の §9 完了条件チェックリスト項目 5 で「ADV 再起動テスト PASS」と記述、trigger 語「起動」混入で BLOCK
- 本 §2 適用: Check 5 で ADV 確認可（再起動テストは cmd-realworld + verify/ 経由で ADV 自律実行可、user 確認依頼禁止）
- 遡及分類: 本 §2 「Check 5 で代行可能なのに依頼」違反 + trigger 4 語表層症状

### §6.3 違反 #3（2026-04-30）

- 違反内容: B/C 手順応答中の「Mac 再 boot」相当箇所複数の trigger 語残存、§2.25.3 メタタグ表セル内記載で grep match 不全
- 本 §2 適用: Check 4 (a) `zsh -i -c '<cmd>'` wrap 想到不全 → nightly_review_wrapper の env 継承を user 5 回依頼に発展
- 遡及分類: 本 §2 「Check 4 で代行可能なのに依頼」直接違反

### §6.4 同型違反集計の本 §2 整合

`verify/adv_violation_log.md` の同型違反集計表「違反 #1+#2+#3 (不要な PO 提案 + メタタグ欠落、同型) = 3 連続」は表層症状ベースの集計だが、本 §2 ベースで再分類すると:

| 違反 # | 本 §2 違反 Check | 表層症状 |
|---|---|---|
| #1 | Check 3（代行可能なのに依頼） | OPEN-NNN 再掲、メタタグ欠落 |
| #2 | Check 5（代行可能なのに依頼） | 「再起動テスト」trigger 混入、メタタグ欠落 |
| #3 | Check 4（env 継承想到不全） | 「Mac 再 boot」trigger 混入、メタタグ表セル内 |

3 件いずれも本 §2 違反として `core_spec.md` §4.2 同型 2 回以上 → 即時仕様改定発火基準を満たし、本 SUBAGENT-DEVSYS-PO-DELEGATION-FLOW-V1 が当該仕様改定の実装である。

---

## §7 完了条件マトリクス

本 sub_po_delegation.md 自体の完了条件は SUBAGENT-DEVSYS-PO-DELEGATION-FLOW-V1 ミッション §5 で定義。運用上の機械強制完了は以下:

```
cmd-unit:
  test -f /Users/futoshi/Desktop/dev-system/docs/plans/sub_po_delegation.md → PASS
  test -f /Users/futoshi/Desktop/dev-system/skills/adv-check.md → PASS

cmd-e2e:
  本ファイル行数 ≥ 200 (wc -l)
  Check 1〜5 全記載 (grep -c "^### Check [1-5]" ≥ 5)
  改変禁止マーカー ≥ 2 (grep -c "GENERATED: DO NOT MODIFY" ≥ 2)
  検査 E 追加 (grep -c "検査 E\|sub_po_delegation" skills/adv-check.md ≥ 2)

cmd-realworld:
  違反 log カテゴリ追加確認 (grep -c "不要な PO 依頼" verify/adv_violation_log.md ≥ 1)
  違反 #1-#3 遡及記載 (grep -c "違反 #[1-3]" 本ファイル ≥ 3)
  zsh -i wrap 言及 (Check 4 例) (grep -c "zsh -i" 本ファイル ≥ 1)
  例外 §4 言及 (grep -c "§4 PO 判断必須\|コスト.*¥500\|新プロセス\|ブランド変更" 本ファイル ≥ 1)
```

---

## §8 関連ドキュメント

- `core_spec.md` §3 ADV 行動規範（最上位）
- `core_spec.md` §4 PO 判断必須事項の限定（本フローと相互排他）
- `core_spec.md` §4.1 PO 作業発生提案の事前ゲート（trigger 4 語ベース、本フローと併用）
- `core_spec.md` §4.2 違反の事前回避原則（同型 2 回以上 → 即時仕様改定、本ミッションが該当）
- `skills/adv-check.md` 検査 A〜D（trigger 4 語 / §2.25.3 メタタグ / Review 末尾 / OPEN 再掲）+ 検査 E（本フロー）
- `verify/adv_violation_log.md` 違反 #1〜#3 + カテゴリ「不要な PO 依頼」
- `docs/learned-patterns.md` LP-001〜LP-008（特に LP-007 nightly review system 認証 safeguard 三層、LP-008 launchd Mac sleep + sudo 責任分離）
- `docs/po-decisions.md` PO-DIRECTIVE-001 自律継続原則（ADV 待機禁止、§4 非該当は連続実行）
- `docs/decision_log.md` PD-008 自律継続原則の確認・恒久化

<!-- GENERATED: DO NOT MODIFY END -->

---

## App 固有セクション（App 開発者編集可）

App 側で sub_po_delegation の運用を補強する固有規則を以下に追加可能。

### A.1 App 固有 user 依頼許容パターン

<App 開発者が記入: 例 App 固有の認証フロー、App 固有の物理判断点 等>

例（架空）:
- App が銀行 API を使う場合 → 銀行サイト 2FA は user 必須（Check 1: YES）
- App がプリンタ実機制御を含む場合 → 印刷物確認は user 必須（Check 2: YES）

### A.2 App 固有 ADV 代行可能ツール

<App 開発者が記入: 例 App 固有の MCP / SDK / CLI 等>

例（架空）:
- App が Cloudflare Workers を使う場合 → `wrangler deploy` は ADV Bash で代行可（Check 3: 代行可）
- App が Supabase を使う場合 → `supabase db push` は env 継承で代行可（Check 4: (a) zsh -i wrap）

### A.3 App 固有 cmd-realworld 検証手段

<App 開発者が記入: App 固有の e2e / smoke / 観測手段>

例（架空）:
- App の UI 実機目視 → user 必須（Check 5: user 確認依頼必須）
- App の API レスポンス検証 → ADV curl + jq で代行可（Check 5: ADV 確認可）

### A.4 App 固有違反 log 連動

<App 開発者が記入: App 側 verify/ パスでの違反 log 連動規則>

---

**改変履歴**:

- 2026-04-30 v0.1.0 初版（SUBAGENT-DEVSYS-PO-DELEGATION-FLOW-V1、違反 #1〜#3 同型 3 連続を §4.2 即時仕様改定で本フロー新設）
