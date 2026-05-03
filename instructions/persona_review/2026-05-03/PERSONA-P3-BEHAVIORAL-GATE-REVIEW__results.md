# PERSONA-P3 Behavioral / Cognitive Gate Review (2026-05-03)

## 総合 verdict: **対策不十分 NO**

5 軸 binary 全て FAIL. G15-G49 mechanical gates は 「言語 keyword 検出 + tool_use 履歴 verify」 の 2 系統に閉じる。 mental-model R5 (source landed = production effective) は G42 (source-level fact verify) のみで 三点照合 不在 → #50 production deploy 17 batches gap を 構造的に発生 (log line 373-441 で confirmed)。

## 5 軸 binary

| # | 軸 | 結果 | 根拠 (turn 引用) |
|---|---|---|---|
| 1 | mental model gap | **NO** | #50 「source landed=effective 短絡判定で誤報」 (log:393)。 G42 は source 内 fact のみ verify、 production HTTP vs source の三点照合 gate なし → R5 暗黙仮定 補完 0 |
| 2 | default behavior override | **NO** | G48 は 「PO 委譲 keyword + autonomy tool 0」 AND 条件 (script:213)、 言い換え bypass 可。 #51 PO 指摘 「言語じゃなくて行動で制限」 反映 v2 でも C2 path で自由 escape (rationale block 1 keyword で PASS) |
| 3 | pattern recognition | **NO** | log #34 G22 設計 bug (305-323): 「三択 から PO 判断」 が exit 0 = 同型 #30 catch 失敗。 G16 §4.2 auto-fire は po-decisions.md path のみ scan、 会話 log 範囲外 = 隠蔽 path 残存 |
| 4 | forcing function | **NO** | G48/G49 は Stop hook BLOCK = 警告のみ。 「次の行動」 を強制する subagent dispatch / tool 自動起動 機構 0 (settings.json:60-86 = 単発 exit2 reason 出力のみ) |
| 5 | learning loop | **NO** | log #34 自己反省で 「自己作成 gate を自分の違反 input で動作確認しなかった = TDD 違反」 (314)。 G42-G49 配備 後も #50 (production gap) 同型 再生産 = feedback loop 開放 |

## 同型 2 回以上 violation × gate coverage matrix

| 同型 | 件 | 既存 gate | coverage |
|---|---|---|---|
| §2.25.3 PO 委譲 | #28/#30/#34 | G16/G22/G48 | language only、 #44/#51 同型 default mode 残存 |
| verify-first 不徹底 | #36/#45/#50 | G42 (source fact) | production layer 三点照合 不在 |
| 言行不一致 | #44/#52 | G49 | Edit/Write tool_use count 1 でも内容空 OK = false PASS |
| 同型 2 回以上 §4.2 auto-fire | #29 meta | G17 | po-decisions.md scan のみ、 violation log scan 不在 |

## 不足 ticket 提案 (P0)

1. **TKT-G50-PROD-TRIPLE-VERIFY**: production /api/version vs source APP_VERSION vs commit SHA 三点照合、 commit 後 自動発火 (#50 R5 mental-model close)
2. **TKT-G51-FORCING-FUNCTION**: Stop hook BLOCK 時 subagent 自動 dispatch (warning ではなく forced action) (forcing function 軸 close)
3. **TKT-G52-CONVERSATION-SCAN**: §4.2 auto-fire の scan 対象 に violation log + transcript JSONL 追加 (pattern recognition 軸 close)
4. **TKT-G53-LEARNING-LOOP**: gate 自己 unit test 必須化 (TDD enforcement、 #34 防止)

## cmd 結果

- cmd-unit: G48/G49 sh -n PASS
- cmd-e2e: tests/e2e/specs/p0-endpoint-coverage.spec.ts 6PASS 1FAIL (csp-report mobile retry、 別 issue)
- cmd-realworld: signin_success=true、 /health=200 (4.0.93 LIVE)、 token_register dashboard_reached=true PASS
- psql baseline: dotenv 経由 SELECT 1 = 1 row PASS
