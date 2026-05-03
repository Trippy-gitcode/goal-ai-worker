# ARCH00-AT1-STRESS-ROOT-CAUSE-FIX-V1: COMPLETED

## Summary

PC Chrome (1280x720) で arch-00 spec 4 件中 1 件 (AT-1 TODAY 画面表示) が fail、 残 3 件 (AT-2 / AT-3 / Stress) は PASS の状態を、 spec 改修 1 行で 4/4 PASS 化。 当初 mission 想定 (AT-1 + Stress 2 件 fail) と 実走行で 検出した fail 件数 (AT-1 1 件のみ) が異なるため、 真 走行結果に基づき 1 件 fix で 全 4 件 PASS を達成。

---

## what

- arch-00.spec.ts AT-1 TODAY 画面表示 の pc-chrome fail を 真 fix (spec 1 行)
- 真の動作 verify: pc-chrome で 4/4 PASS、 全 4 persona (iphone-safari + android-chrome + pc-chrome + ipad) で 16/16 PASS
- 真 PASS 安定性 verify: pc-chrome 連続 3 回実行で 4/4 安定 PASS (flake = 0)

---

## root cause

**spec stale (= test code bug)**: arch-00.spec.ts:42 が `#preact-today-container` を 期待するが、 frontend/components/preact-bridge.js の `mountPreactToday()` (ARCH-02 refactor) は **`#today-timeline`** に直接 mount する仕様に変更されており、 `#preact-today-container` は frontend どこにも存在しない (grep `preact-today-container` /frontend = 0 hit)。

詳細:

- preact-bridge.js Em() (= mountPreactToday) は `document.getElementById('today-timeline')` を取得し、 そこに `render(h(Today, {}), _todayContainer)` で 直接 mount。
- Today.jsx は wrapper `<div id="preact-today-root">` を返す → これが `#today-timeline` の child として描画される。
- index.html line 293 に `<div id="today-timeline" ...></div>` 存在 (mount target)。
- 但し index.html / preact-bridge.js / Today.jsx いずれにも `id="preact-today-container"` を持つ要素は **存在しない** → spec の `count() > 0` assert が必ず fail。
- AT-2 / AT-3 / Stress は `#preact-today-root` のみ参照するため PASS。 AT-1 のみが `#preact-today-container` を参照していたため fail。

mission 想定の "Stress 5回連続切替 fail" は 当該実走行 (pc-chrome × 連続 3 回) で **再現せず**、 Stress は 安定 PASS (avg 24-26s)。 mission 期待の 2 件 fail = AT-1 のみ 1 件 fail に修正、 1 件 fix で 4/4 PASS 達成。

---

## 即時 mechanical fix

| file:line | 修正内容 |
|---|---|
| `tests/e2e/specs/arch-00.spec.ts:42` | `#preact-today-container` → `#today-timeline` (mount host が ARCH-02 refactor で変更されたため、 spec の参照 ID を post-ARCH-02 構造に整合) |
| `tests/e2e/specs/arch-00.spec.ts:41` | コメント `// Preactコンテナが存在` → `// ARCH-02: Preact Today は #today-timeline 要素に直接マウントされる` (将来 reader が 経緯を把握できるよう、 ARCH-02 refactor の事実と 旧 ID 削除を明記) |
| `tests/e2e/specs/arch-00.spec.ts:42` (variable rename) | `preactRoot` → `preactMountHost` (semantic 名 = mount host を表す変数、 root と混同しない) |

frontend / worker / build 何も触らず、 spec test 1 件のみで修正完結 (= test code bug、 frontend code は正常)。

---

## 構造的 future fix + 次期 app guarantee

### 1. 構造的問題の本質

ARCH-02 refactor 時に、 frontend の DOM ID 命名 (`#preact-today-container` → `#today-timeline`) が変更された が、 既存 spec の参照 ID 更新が 漏れた。 spec が 偽 PASS (= 当該 spec 走行 0 = CI に検出されない) の状態で 数日放置された 可能性 (= 4 persona 並列 verify 配備 = 2026-05-03 まで PC viewport で 当該 spec が走行していなかった)。

### 2. 構造的 future fix ticket 提案

#### TKT-ARCH-SPEC-DRIFT-DETECTOR-V1
- **問題**: refactor で frontend DOM ID が変わっても、 spec が古い ID を参照し続け、 CI で 走行しない viewport (mobile-first responsive で PC tab hidden 等) では 検出ゼロ。
- **fix**: 4 persona 並列 verify を CI step として 必須化 (現 `.github/workflows/*` の E2E step 厳しいモード = batch 46 復帰済 commit 281d5463)、 加えて `tests/e2e/scripts/spec-id-audit.sh` 導入: spec 内 `page.locator('#xxx')` で参照する ID が frontend/index.html or frontend/components/*.jsx に 実在するか grep verify、 0 hit なら BLOCK。
- **owner**: dev-system / pre-commit hook 追加 + GA workflow 統合
- **estimated**: 1 sub-agent (cmd-unit + cmd-e2e + ci 統合)、 0.5 day

#### TKT-ARCH-PREACT-MOUNT-CONVENTION-V1
- **問題**: preact-bridge.js が screen 別に異なる mount strategy (today = `#today-timeline` 直接 vs talk/goal-hub/myself = `#preact-XXX-host` 動的 inject) を取っており、 spec writer が どの ID を参照すべきか 不明瞭。
- **fix**: mount convention を統一 (例: 全 screen で `#preact-{name}-host` を frontend HTML に static 配置し、 そこに mount する)。 統一後 spec も `#preact-today-host` 1 種で表現可能、 ARCH refactor が 次回起きても spec drift しにくい構造に。
- **owner**: frontend / `frontend/components/preact-bridge.js` + `frontend/index.html` 双方修正
- **estimated**: 1 sub-agent (今回 scope 外、 next batch)

### 3. 次期 app guarantee (dev-system templates 反映)

dev-system 側で `templates/tests/e2e/playwright.config.template.ts` に 4 persona project (iphone-safari + android-chrome + pc-chrome + ipad) を 標準配備済 (commit 8ac1d4d0 で Lais 側に 配備済、 dev-system templates は 今後 持ち上げ予定)。 これにより、 新規 app 生成時から 全 viewport で 全 spec を 走らせる前提で開発が進み、 mobile-first responsive で PC viewport 偽 PASS する事故を 構造的に防止。

加えて dev-system に **spec-id-audit.sh** を `templates/scripts/spec_id_audit.sh.template` として配備すれば、 新規 app 生成時から CI で spec drift を検出できる。

---

## 完了条件 verify

| 区分 | 条件 | 結果 |
|---|---|---|
| **report 配置** | `instructions/persona_review/2026-05-04/ARCH00-AT1-STRESS-FIX__results.md` `test -f` exit 0 | PASS (本ファイル) |
| **cmd-unit** | 改修 file の syntax check | TS spec ファイル (node --check 不適用)、 playwright runner で AST parse + execute = PASS で代替 verify |
| **cmd-e2e** | `npx playwright test arch-00.spec.ts --project=pc-chrome --reporter=list` で AT-1 + Stress 真 PASS | **PASS** (4/4 PC Chrome PASS、 連続 3 回 安定) |
| **cmd-realworld signin_success=true** | production frontend 200 + worker /health 200 + token 検証 | PASS (frontend / 200、 worker /health 200、 test token validate plan=max) |
| **psql baseline** | `/opt/homebrew/opt/libpq/bin/psql "$SUPABASE_DB_URL" -c "SELECT 1;"` exit 0 | PASS (1 row、 .dev.vars の SUPABASE_DB_URL 経由) |
| **commit + push** | `git commit + git push origin main` 成功 | (本 report 完成後 実施) |
| **frontend deploy** | 改修した場合 wrangler pages deploy | **NA (frontend 未改修、 spec 1 件のみ)** |

---

## cmd-e2e: pc-chrome 走行結果 (real)

```
$ npx playwright test tests/e2e/specs/arch-00.spec.ts --project=pc-chrome --reporter=list

Running 4 tests using 4 workers

  ✓  1 [pc-chrome] › tests/e2e/specs/arch-00.spec.ts:37:7 › ARCH-00: Preact技術検証 › AT-1: TODAY画面表示（Preact） (8.6s)
  ✓  4 [pc-chrome] › tests/e2e/specs/arch-00.spec.ts:76:7 › ARCH-00: Preact技術検証 › AT-3: TODAY→TALK切替後TALKが正常表示 (9.9s)
  ✓  2 [pc-chrome] › tests/e2e/specs/arch-00.spec.ts:55:7 › ARCH-00: Preact技術検証 › AT-2: タブ往復3回（状態漏れなし） (16.7s)
  ✓  3 [pc-chrome] › tests/e2e/specs/arch-00.spec.ts:92:7 › ARCH-00: Preact技術検証 › Stress: 5回連続切替で最後も正常 (25.9s)

  4 passed (26.4s)
```

## cmd-e2e: 4 persona 並列 走行結果 (real, 補足 verify)

```
$ npx playwright test tests/e2e/specs/arch-00.spec.ts --reporter=list

Running 16 tests using 5 workers

  ✓ iphone-safari × 4 件 PASS (AT-1 4.5s / AT-2 12.4s / AT-3 5.3s / Stress 20.9s)
  ✓ android-chrome × 4 件 PASS (AT-1 3.9s / AT-2 11.2s / AT-3 5.0s / Stress 23.5s)
  ✓ pc-chrome × 4 件 PASS (AT-1 9.6s / AT-2 14.6s / AT-3 8.9s / Stress 24.6s)
  ✓ ipad × 4 件 PASS (AT-1 7.9s / AT-2 14.9s / AT-3 7.6s / Stress 23.2s)

  16 passed (53.7s)
```

## stability verify (pc-chrome × 連続 3 回)

```
=== run 1 === 4 passed (26.0s)
=== run 2 === 4 passed (25.2s)
=== run 3 === 4 passed (24.1s)
```

flake 率 = 0/12 (0%)、 真 PASS 安定。

---

## 関連 commit / artifact

- 本 fix commit: (push 後追記)
- 関連 commit: 54b68f07 fix: PC #btab-today hidden 真 bug fix (E2E 4 persona 並列 検出 1 件目) — bottom-tabs hide @media rule 削除 (前提 fix)
- 関連 commit: 8ac1d4d0 e2e: 4 persona parallel exec (a11y removed per PO v2) — playwright config 4 project 配備
- 関連 commit: 281d5463 fix(ci): E2E step 厳しいモード 復帰 (batch 46 緩い化 = 判断ミス 撤回)

## token 真検証

- /api/token/validate test_token (`goal_test_7BDSzrA2f3pzQN0z2yNGYSKS`) = `{"valid":true,"plan":"max",...}` PASS
- /api/token/register = 500 "Registration error" — **既存 production 障害** (本 fix scope 外、 別 ticket で 切り出し推奨。 syncUserToSupabase or KV write の 例外と推定。 frontend playwright cookie injection は test_token 直挿入で auth bypass、 本 fix path には 無影響)
