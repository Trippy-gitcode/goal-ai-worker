# Pre-Review 2R 確認レポート（CRIT-1/2/3 修正後）

> 実施: Code G_47 / 2026-04-21
> 1R 結果: `dev_system_v34_pre_r3_summary.md`（CRITICAL 3件検出）
> 修正実施: PO 承認（session_progress.md L97 更新、3ペルソナ合議で自律修正可）
> 対象: lais/verify/dev_system_v34_package.md（2,575 → 2,577行）

---

## 修正差分

| # | CRITICAL | 修正箇所 | 修正内容 | 行数差分 |
|---|---|---|---|---:|
| CRIT-1 | §21 heading level | L1638 | `#### §21.` → `## §21.` | 0 |
| CRIT-2 | deploy.sh pipe masking | §2.2 L479-486 | パイプ `\| tee` 廃止、一時ログ追記 + `\|\| DEPLOY_EXIT=$?` で exit status 保証 | +2（コメント追加）|
| CRIT-3 | proposal_log_lint STALE_DATA | §2.9 L1215-1221 | rm を STALE_COUNT 集計後に移動 + FAIL path でも rm | 0 |
| **合計** | | | | **+2** |

**最終行数: 2,577行**（元 2,575 + 2）

---

## CRIT-1 修正検証

### Before
```markdown
#### §21. 共通規範集（起動時要約版）
```

### After
```markdown
## §21. 共通規範集（起動時要約版）
```

### 確認
- `grep -n "^## §21\|#### §21"` → `1640:## §21. 共通規範集（起動時要約版）` のみ
- `#### §21` は完全消去。`## §21` を1件出現
- §4.8 Step 2 の指示 `改行を2行挿入して「## §21. 共通規範集（起動時要約版）」見出しを追加` と整合
- §C0-C6 の `### §C0` (h3) と自然な階層関係（h2 → h3 → h4）に戻った

---

## CRIT-2 修正検証

### Before
```sh
# --- Step 8: デプロイ実行（既存 §2.8 同等）---
if [ -n "$FRONTEND_CMD" ]; then eval "$FRONTEND_CMD" 2>&1 | tee -a logs/deploy_stdout.log; fi
if [ -n "$BACKEND_CMD" ]; then eval "$BACKEND_CMD" 2>&1 | tee -a logs/deploy_stdout.log; fi
DEPLOY_EXIT=$?
```

### After
```sh
# --- Step 8: デプロイ実行（既存 §2.8 同等、POSIX sh で exit status 保証）---
# パイプ経由（| tee）は POSIX sh で pipefail 非対応のため終了ステータスが埋もれる。
# 一時ログ追記 + 明示的な || DEPLOY_EXIT=$? で失敗を捕捉（§3.7 POSIX 規約準拠）。
DEPLOY_EXIT=0
if [ -n "$FRONTEND_CMD" ]; then eval "$FRONTEND_CMD" >>logs/deploy_stdout.log 2>&1 || DEPLOY_EXIT=$?; fi
if [ -n "$BACKEND_CMD" ] && [ "$DEPLOY_EXIT" = 0 ]; then eval "$BACKEND_CMD" >>logs/deploy_stdout.log 2>&1 || DEPLOY_EXIT=$?; fi
```

### 確認
- `grep -n "eval.*| tee"` → 空出力。パイプ経由の tee は完全消去
- `>>logs/deploy_stdout.log 2>&1` で stdout/stderr 両方を追記（tee と同等の logging 効果を保持）
- `|| DEPLOY_EXIT=$?` で失敗時に exit status を明示的に捕捉
- フロントエンド失敗時にバックエンドをスキップ（`[ "$DEPLOY_EXIT" = 0 ]` ガード追加）= 失敗の早期検出
- §3.7 POSIX 互換規約準拠（pipefail 未使用、bash 拡張なし）

---

## CRIT-3 修正検証

### Before（L1214-1221）
```sh
' "$PROGRESS" > "${PROGRESS}.tmp" && mv "${PROGRESS}.tmp" "$PROGRESS"
rm -f "$STALE_DATA"

# STALE_COUNT は awk の END ブロックで出力（別 pass）
STALE_COUNT=$(awk '{if ($2+0 > 7) c++} END{print c+0}' FS=: "$STALE_DATA" 2>/dev/null || echo 0)
echo "proposal_log_lint: $STALE_COUNT 件が 7日以上滞留"
[ "$STALE_COUNT" -le 10 ] || { echo "FAIL: G12 stale proposals > 10"; exit 1; }
```

### After
```sh
' "$PROGRESS" > "${PROGRESS}.tmp" && mv "${PROGRESS}.tmp" "$PROGRESS"

# STALE_COUNT 集計（STALE_DATA はまだ残存。rm は FAIL/成功 双方のパスで最後に実行）
STALE_COUNT=$(awk '{if ($2+0 > 7) c++} END{print c+0}' FS=: "$STALE_DATA" 2>/dev/null || echo 0)
echo "proposal_log_lint: $STALE_COUNT 件が 7日以上滞留"
[ "$STALE_COUNT" -le 10 ] || { rm -f "$STALE_DATA"; echo "FAIL: G12 stale proposals > 10"; exit 1; }
rm -f "$STALE_DATA"
```

### 確認
- STALE_COUNT 行: L1219（集計）
- rm 行: L1222（成功 path）+ L1221（FAIL path）
- awk は STALE_DATA がディスクに存在する状態で読取可能 → G12 が本来の意図通り動作
- FAIL 時も STALE_DATA が残らない（tmp ファイルリーク防止）
- ωcrit 修正意図『1回の awk で全行一括更新 + 正常な件数集計』が機能復活

---

## §10 構造検証（R2.2 修正後）

| 検証 | 結果 | 備考 |
|---|---|---|
| §10.1 章重複 | PASS（副作用あり）| §0-§10 各1回 + §21 1回追加。§21 は §4.1 template code block 内の illustration line で、本来の R2.2 章構造ではない。§10.1 regex は code block を除外しないため false positive を生む構造だが、本質的な重複なし |
| §10.2 サブ節重複 | PASS | `uniq -d` 空出力 |
| §10.7 sed -i 混入 | PASS | 14件マッチ、全て BEFORE 例示・ドキュメント参照（実装サンプル混入なし、修正前と同数）|
| 行数 | 2,577行 | +2（CRIT-2 コメント追加の明示的差分）|

### §10.1 の副作用について

§10.1 regex `/^## §[0-9]+/` は markdown code block 内部も match する。CRIT-1 で `#### §21` → `## §21` に修正した結果、§4.1 template 内の §21 illustration line も §10.1 の対象になる。

**これは R2.2 本体の構造問題ではない**:
- §21 template は dev_system_spec.md §21 に**挿入されるべき**見出しの illustration
- 元の `#### §21` は間違った heading level（§4.8 Step 2 と矛盾）で CRITICAL
- 修正後 `## §21` は正しい heading level で、dev_system_spec.md §1-§20 と同階層
- §10.1 check は code block 除外ロジックが欠如 → 将来の §10 改訂候補（LP 候補）

---

## Pre-Review 2R 指摘

**CRITICAL: 0件**
**HIGH: 1件（新規検出 1件 + 1R からの積み残し 4件）**
**MEDIUM: 0件（新規）**

### 新規 HIGH-2R-001: §10.1 code block 除外ロジック欠如
- **場所**: R2.2 §10.1 / L2516-2518
- **内容**: §10.1 の章重複チェック regex が markdown code block 内部を除外しないため、§4.1 §C0-C6 template 内の `## §21` illustration を章として検出する。副作用として CRIT-1 修正後に「章重複」ではないが「追加マッチ」が発生。
- **影響度**: LOW→HIGH（テスト誤報の可能性。CRITICAL には至らず、ドキュメント構造を正しく解釈できる読者なら区別可能）
- **修正提案**: §10.1 を `awk '!/^```/{code=0} /^```/{code=!code} !code && /^## §[0-9]+/{print NR": "$0}'` 風に code block 除外を追加。R2.2 本体の修正は不要（§10 自体の改善として別ミッション化）

### 積み残し HIGH（1R 未修正、R1 外部レビューで併走判定）
- DEVOPS-004: check_blocked_integrity mid 上書き（§2.6）
- DEVOPS-005: realworld_proof_check deploy.log timestamp no-op（§2.7）
- DEVOPS-006: check_test_pass OR 判定（§2.6）
- DEVOPS-007 ≡ SOLO-003: strike_override.json schema 未定義（§3.6）
- SOLO-002: ソロ運用 Hflow 詰み（§5.2 / §2.18）

---

## ENG 3ペルソナ判定（R1 進行判定）

**ADV判定**: Pre-Review 2R で CRITICAL 0 到達。新規 HIGH 1件（§10.1 副作用）は R2.2 本体問題ではなく §10 自体の改善論点、R1 前に修正する必要なし。HIGH 5件の積み残しは R1 外部レビューで再検出されるか確認、合意度に応じて R2 修正ラウンドで処理。R1 実行 OK。

**QA検証**: sub_review_flow §1.7 Pre-Review 最大 3R の 2R 時点で CRITICAL 0。R1 プロトコル発動条件成立。`scripts/ai_review.js --models gpt54,gemini --personas devops_engineer,solo_dev,qa_lead,tech_writer,ai_ops --input lais/verify/dev_system_v34_package.md --output lais/verify/ --prefix dev_system_v34_r3_raw --parallel` で 10 本並列実行。

**PO代理**: 品質最優先 + Plan J コスト枠内。R1 実行で想定 $2。triage 生成は Code G_47 最後のタスク。

**合意: R1 外部API実行 → triage 生成へ進む。**

---

## 次ステップ

1. `scripts/ai_review.js` で 10本並列実行（GPT-5.4 + Gemini × 5ペルソナ）
2. `lais/verify/dev_system_v34_r3_triage.md` 生成（CRITICAL/HIGH 集計 + 合意度 + Filter 1-7 適用前後）
3. ADV G_47 引き継ぎ準備（session_progress 報告）
