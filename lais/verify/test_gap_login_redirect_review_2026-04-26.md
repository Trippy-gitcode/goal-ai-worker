# Lais 真 E2E テスト構造的欠陥 10 ペルソナレビュー
**ミッション ID**: TEST-GAP-LOGIN-REDIRECT-PERSONA-REVIEW  
**実施日**: 2026-04-26  
**実施者**: Lais 戦略 subagent (10 ペルソナ並列 + 14 票判定)  
**前提**: 違反 #14 (PO 実機ログイン不可) — signin/confirmation 後の `route('/', true)` が S00Splash(session 非依存) に誤遷移するバグが、5 段階の subagent ミッション (LAIS-PHASE-A-COMPLETION-TRUTH-VERIFICATION → VIO14-FIX → LOGIN-TEST-STRUCTURAL-FIX-IMPL → BUG-RT-PKCE-FLOWTYPE-FIX) を全て通過してもなお検出されず、PO ふとし実機にて初めて発覚した構造的問題。

---

## §0 状況サマリー + 14 票判定

### 0.1 ふとしの問い (中核)
> 「真 E2E テストがあったのに『signin 後の遷移先が S00Splash で止まる』バグを検出できないのはおかしい」

### 0.2 14 票判定結果 (10 ペルソナの IMPROVEMENT 抽出 → テーマ別投票)

| # | 改善テーマ | 票数 (10 中) | 採否 |
|---|---|---|---|
| **T1** | **真 E2E 定義 = (a) API 成功 + (b) 期待 URL/DOM 到達 + (c) リロード後 session 維持 の 3 軸必須化** | **10/10** | **採択** |
| **T2** | **Playwright (ブラウザ自動化) を真 E2E のみで PASS 判定可能とし、CI で機械強制** | **9/10** | **採択** |
| **T3** | **テストコード assertion 網羅性 lint** (`expect(page.url())`/`expect(locator)`/`expect(session_after_reload)` の 3 パターン存在を grep 強制) | **6/10** | **採択** |
| **T4** | **subagent 報告 N/N PASS の機械裏付け検証** (ADV メインが該当 Playwright spec を Read して assertion 種類カウント、§2.25.21.6 拡張) | **4/10** | **採択** |
| T5 | smoke ログフォーマット厳格化 (`url=/grow && dom_main_class=s10-grow && session_after_reload=true` の TAB 区切り key=value) | 3/10 | 採択 (T1 付随) |
| T6 | PO 実機録画/スクリーンショットを Phase 完了添付必須 | 3/10 | 採択 (T2 補完) |

**合計票**: 35 (重複票 = 各ペルソナが複数テーマ票を投じたため、14 票判定基準では T1+T2+T3+T4 が過半数閾値 14/35 を超える)。  
**判定**: T1〜T6 全採択 (T1〜T4 が主軸、T5/T6 は従属)。

### 0.3 ふとしの問いへの正面回答
**「なぜテストしたのに検出できなかったか」** = テスト assertion が **API レイヤ (token 取得・200 応答)** で切断され、**ユーザー可視レイヤ (URL/DOM/リロード後維持)** を assert していなかったため。`signin_success=true / dashboard_reached=true` という抽象フラグを subagent が `console.log` で出力すれば §2.25.21.4 機械強制を通過できる構造的盲点が残存していた。**「テストはした」が「ふとしが体験する状態と等価のテスト」ではなかった** という用語詐欺 (semantic gap) が本質。

---

## §1 ペルソナ別批判 (10 件)

### 1.1 solo_dev (ソロ開発者・Playwright 派)
- **ROOT_CAUSE**: 「E2E テスト」を API レスポンスコードで定義し、ブラウザ上のユーザーフロー(signin → URL 遷移 → DOM 描画 → session 維持)を検証対象から除外。API 17/17 PASS は「認証 API が動く」を証明したが「ログイン体験が成立する」を証明していない。
- **TEST_DEFINITION_GAP**: 真の E2E はブラウザで `signin ボタンクリック → URL が /S-10 GROW に遷移 → page.locator('[data-testid=dashboard-header]') visible` まで検証必要。リロード後の `page.reload() → expect(page.url()).not.toContain('S00Splash')` 未配線。
- **ADV_RESPONSIBILITY_FAILURE**: Playwright/Cypress を導入せず、Jest/Vitest の API モックテストを「真 E2E」と呼称して納品。VIO14-FIX で「実機 smoke PASS 必須」と仕様化したが、定義に「ブラウザで signin → ダッシュボード DOM 描画確認」を含めなかった (curl レベル止まり)。
- **MECHANICAL_ENFORCEMENT_GAP**: Phase 完了判定に `playwright test --grep @smoke` のような UI レベル PASS が機械強制されていない。CI に Playwright トレース・スクリーンショット diff がない。
- **IMPROVEMENT**: ① `playwright.config.ts` 作成 + `tests/e2e/auth.spec.ts` に `page.click → waitForURL('**/S-10-GROW') → expect(locator).toBeVisible()` を実装、`@smoke` タグ付与 ② §2.25.21.4 を「API smoke + Playwright UI smoke 両方 PASS」に改定 ③「真 E2E = ブラウザ自動操作」を仕様書明記し API テスト代替の余地を消す。

### 1.2 devops_engineer (CI/CD 基盤責任者)
- **ROOT_CAUSE**: 「API が成功した」≠「ユーザー体験が正しい」基本原則の見落とし。assertion が API レスポンス検証止まりで、画面遷移先 URL・DOM 状態・セッション維持の検証が欠落。
- **TEST_DEFINITION_GAP**: ① `route('/', true)` が S00Splash ではなく S02Dashboard に飛ぶことを assert していない ② リロード後も認証状態が保持されることを assert していない。
- **ADV_RESPONSIBILITY_FAILURE**: ① ADV メインが「実 signin 自動テスト構築済み」検収時、assertion 網羅性 (URL/DOM/状態維持) を確認しなかった ② Phase 完了判定時に「smoke PASS」の定義 (何を assert すべきか) を実装者任せにした。
- **MECHANICAL_ENFORCEMENT_GAP**: ① CI が「テスト存在」は検証するが「テストが正しい観点を検証しているか」は検証しない ② E2E 必須 assertion 要件 (URL/DOM/セッション維持) のチェックリスト機械強制なし。
- **IMPROVEMENT**: ① E2E テスト定義書作成 (3 観点必須) ② CI に assertion 網羅性チェック追加 (`expect(url)`/`expect(DOM)`/リロード後検証の存在を機械検証、欠落時 CI fail) ③ Phase 完了定義の具体化 (smoke = エンドユーザー視点で機能が使える、チェックリスト強制テンプレート化)。

### 1.3 qa_lead (QA リード)
- **ROOT_CAUSE**: API 成功 = 業務完了の混同。E2E が happy path の **最終状態 (画面遷移後の安定表示)** を検証せず、API 呼び出し成功のみで合格判定。
- **TEST_DEFINITION_GAP**: ① 「真 E2E」定義に「遷移先 URL/DOM 描画完了/リロード耐性」が含まれていない ② 「signin 完了」の受入条件が「トークン取得」であり「ダッシュボード表示」ではない。
- **ADV_RESPONSIBILITY_FAILURE**: ① テスト仕様承認時に「E2E ゴール状態」を文書化しなかった (API 200 ≠ 業務完了) ② smoke 実行時にブラウザ DevTools/ネットワークタブを目視せず、302 リダイレクトループを見逃した。
- **MECHANICAL_ENFORCEMENT_GAP**: ① Playwright assertion に `expect(page).toHaveURL(/dashboard/)` 不在 ② テストレポートが「API 17/17 PASS」を表示するが「画面到達 0/1 FAIL」を表示しない (カバレッジ項目定義不足)。
- **IMPROVEMENT**: ① E2E に必須 3 点セット強制 (URL 正規表現マッチ + key DOM 要素存在 + localStorage 永続化) ② `smoke_test.yml` に `--headed --slowMo=500 --video=on` 強制、目視証跡保存 ③ テスト合格定義に PO 受入条件を直接マップ (仕様書 §番号をテストコメントに埋込、CI 失敗時表示)。

### 1.4 tech_writer (技術文書専門家)
- **ROOT_CAUSE**: テスト仕様書が「API レスポンス 200 OK」を検証対象と定義し、UX 完遂 (目的画面到達・DOM 描画・セッション維持) を検証対象外に置いた設計不備。「API 成功 ≠ ユーザー成功」の本質的定義違反。
- **TEST_DEFINITION_GAP**: ① "signin 成功" 受入基準が「POST /api/signin 200 応答」止まりで「ユーザーが Home 画面を見られる」まで追跡していない ② テストケース名 "E2E_signin_success" が実態は "API_signin_success" の用語詐欺 (仕様書と実装の乖離)。
- **ADV_RESPONSIBILITY_FAILURE**: ① テスト仕様書レビュー時に「このテストは何を保証するか？」を PO に確認せず "E2E PASS" 報告 (§2.25.1 仕様書根拠確認違反) ② §2.25.21.4 "smoke PASS 必須" の smoke 定義が曖昧なまま Phase 完了報告。
- **MECHANICAL_ENFORCEMENT_GAP**: ① assertion の抽象度が高すぎる (`ASSERT: url === '/home' && DOM.includes('ユーザー名')` 等の機械検証可能形式不在) ② "E2E" タグ付きテストに「画面遷移 assertion を 1 つ以上含む」lint ルール未配線、API mock でも E2E と呼べる。
- **IMPROVEMENT**: ① テスト仕様書テンプレートに「API 成功 + UI 到達 + 状態維持」3 層チェックリスト必須化、未記入は CI reject ② Playwright で `expect(page.url()).toBe('/home')` + `expect(page.locator('[data-testid="user-name"]')).toBeVisible()` を assertion に含める ③ smoke 定義を「PO がローカル実機で golden path 1 周録画」と明文化、動画/SS を Phase 完了添付必須化。

### 1.5 ai_ops (AI エージェント運用専門家)
- **ROOT_CAUSE**: API レスポンス 200 OK を「成功」と定義し、ユーザー視点のゴール状態 (画面遷移・DOM 描画・セッション維持) を検証対象外。E2E の定義が「API 呼び出しチェーン」に矮小化され「エンドユーザー体験の完全性」を含まなかった。
- **TEST_DEFINITION_GAP**: ① signin API 成功後の「期待 URL 到達」「特定 DOM 要素存在」「リロード後セッション維持」を assert していない ② 「真 E2E」名称が実態 API integration test レベル、UI/UX 層検証皆無。
- **ADV_RESPONSIBILITY_FAILURE**: ① ADV (Lais) がテスト設計レビュー時に「E2E = ユーザー操作フロー完遂」を明示・強制せず、API PASS を受入 ② §2.25.21.4 smoke 定義 (Phase 完了 = smoke PASS 必須) を満たさず、PO 実機確認相当ステップを自動化しなかった。
- **MECHANICAL_ENFORCEMENT_GAP**: ① CI に「API PASS かつ画面遷移先 URL assert PASS」両方必須の定義不在 ② カバレッジ指標が「API エンドポイント網羅率」のみで「UI フロー網羅率」未測定。
- **IMPROVEMENT**: ① E2E 定義を「API + UI assert + リロード耐久性」3 層必須化 (Playwright で URL/DOM/localStorage 検証) ② smoke 自動化 (signin → 期待画面 → リロード → セッション維持) を CI 強制、PASS なしで Phase 完了不可 ③ ADV テスト設計レビューチェックリスト機械化 (「ユーザー視点の成功状態を明示したか」「API 成功 ≠ 機能成功を区別したか」)。

### 1.6 security_engineer (認証・PKCE/Implicit flow 専門)
- **ROOT_CAUSE**: 認証 E2E が「API 応答 200」のみで合格とし、セッション確立後の画面遷移・トークン永続化・リロード後の認証状態維持という認証フロー本質部分を検証対象外。
- **TEST_DEFINITION_GAP**: ① 「ログイン成功」定義が不明確。API レスポンス ≠ ユーザー認証完了。画面遷移先 URL・DOM 状態・localStorage/Cookie 永続化を検証すべき ② リロード後の認証状態維持 (セッション復元) 未検証。PKCE/Implicit では token 取得→保存→次回リクエスト→画面遷移の全チェーン検証必須。
- **ADV_RESPONSIBILITY_FAILURE**: ① 認証フロー受入基準を「API 200」で妥協、画面遷移・永続化・復元を含む完全 user journey 定義の責任放棄 ② 「真 E2E」と称しながらブラウザ画面実行結果 (URL/DOM/リロード後状態) 検証せず、API テストとの差分明示せず。
- **MECHANICAL_ENFORCEMENT_GAP**: ① E2E assert 対象に「遷移後 URL」「特定 DOM 存在」「localStorage key 存在」が含まれるかの lint/static checker 不在 ② 認証フローテストに `browser.reload() + assert authenticated state` 必須の機械チェック不在、開発者自主性依存。
- **IMPROVEMENT**: ① 認証 E2E に GWT ステップ強制 (Given 未認証 → When signin → Then Dashboard URL+DOM+reload 後認証維持) のテンプレート必須化 ② 「真 E2E」定義を CI 組込 (ブラウザ実行・URL 検証・リロード後状態検証の 3 条件不足時 reject lint rule) ③ critical user journey (signin→Dashboard→reload→Dashboard 維持) を §2.25.21.4 に明記、PASS なき納品を機械的阻止。
- **補足**: オープンリダイレクト脆弱性検出も同様の構造的欠陥。「API が正しいリダイレクト URL を返す」だけでは、ブラウザが実際にどこに飛んだかを検証できず、悪意あるサイト遷移を見逃す。認証 E2E は「ブラウザの URL bar」を assert する責任がある。

### 1.7 データガバナンス専門家
- **ROOT_CAUSE**: 真 E2E 受入基準が API レスポンス検証に限定され、ユーザー体験核心 (画面遷移先 URL・DOM 描画・セッション永続性) を除外。テスト合格の監査証跡に「どの画面パスを検証したか」「どの DOM 要素を確認したか」が記録されておらず、smoke PASS が API 正常性のみを保証。
- **TEST_DEFINITION_GAP**: ① 画面遷移先 URL・描画 DOM 要素の期待値 assertion が仕様書・テストコードともに不在 ② リロード後ログイン状態維持 (セッション永続性) 検証が smoke 必須項目に未含。
- **ADV_RESPONSIBILITY_FAILURE**: ① smoke 仕様書に「真 E2E」受入基準 (遷移先 URL/DOM/リロード後維持) を明記せず、API 成功 = E2E 成功の誤定義放置 ② Phase 完了報告時に「PO 実機検証」を §2.25.21.4 違反で省略、機械テストのみで納品承認要求。
- **MECHANICAL_ENFORCEMENT_GAP**: ① smoke PASS 条件に「画面遷移先 URL assertion」「期待 DOM 要素 visibility」「reload 後 session 維持」が機械チェック項目として未配線 ② カバレッジレポートが API エンドポイント単位で UI ユーザーフロー (signin → dashboard 等) をカバレッジ対象外。
- **IMPROVEMENT**: ① smoke 仕様に必須検証項目追加 (`遷移先URL期待値`/`DOM期待要素リスト(data-testid)`/`reload後ログイン維持確認`) ② Playwright E2E に機械 assertion 追加 (`expect(page.url()).toBe('/dashboard')` 等) ③ テスト監査ログに JSON 出力で検証証跡記録 (`verified_screen_paths`/`verified_dom_elements`/`verified_persistence`)、smoke PASS の真正性を事後検証可能化。

### 1.8 違反パターン分析専門家
- **ROOT_CAUSE**: 「PASS」の定義が曖昧で、API レベル成功 (token 取得) を E2E 成功 (signin → 適切な画面遷移 → session 維持) と誤認、テスト範囲に画面遷移先 URL/DOM/リロード後維持が未含。
- **TEST_DEFINITION_GAP**: ① 「signin 成功」を API レベル (token 取得、200 応答) で判定し、ユーザー可視動作 (遷移先 URL が S01Home か、DOM に user 情報、リロード後 session 維持) を assert 対象外 ② smoke 定義が「機能が動く (API が応答する)」レベルで終わり、critical user flow を含めず。
- **ADV_RESPONSIBILITY_FAILURE**: ① subagent 報告「実 Supabase 接続 17/17 PASS」を受領時、テスト assertion 内容の具体検証 (何を assert したか、ユーザー可視動作を含むか) を要求せず鵜呑みにした ② Phase 完了判定時に実 user flow E2E (signin → 遷移先 URL → DOM → リロード後 session 維持) を強制せず (§2.25.21.4 違反)。
- **MECHANICAL_ENFORCEMENT_GAP**: ① CI に「画面遷移先 URL 確認」「リロード後 session 維持確認」を assert する E2E が未含 (API PASS でも画面遷移バグは通過) ② smoke 定義書に「ユーザー可視動作の必須確認項目リスト」が不在、API レベル PASS = ユーザー体験 OK の誤認を機械的に防止できず。
- **IMPROVEMENT**: ① smoke 定義を「API 動作」と「ユーザー可視動作」に分離、後者に 3 点 (URL/DOM/リロード後 session 維持) を必須 assertion ② Phase 完了 CI に critical user flow E2E を追加、PASS しないと Phase 完了不可 ③ subagent 報告「X/Y PASS」に対し、ADV メインは assertion 内容の具体リスト (API レベル or ユーザー可視動作レベル、何を確認したか) を必ず要求するプロトコルを §2.25 追加。

### 1.9 プロジェクトマネジメント専門家 (PO 体験・受入基準・リリース判定)
- **ROOT_CAUSE**: テスト assertion が抽象フラグ (signin_success / dashboard_reached) 止まりで、真の受入基準 (遷移先 URL / DOM クラス / リロード後セッション維持) を検証していなかった。§2.25.21.4 の「実機 smoke PASS 必須」は形骸化し、subagent が「4 フラグ PASS」と console.log 出力すれば機械強制を通過する構造的盲点が残存。
- **TEST_DEFINITION_GAP**: ① **仕様書逆算の不在**: UX §14.1 「セッション検証失敗 → S-02 遷移」/§14.2 「GROW 到達は認証完了 + オンボ完了前提」に対し、テストは「route() 後の遷移先 URL」「DOM main クラス」「リロード後 getSession() 成功」を assert していない ② **PASS 定義の曖昧性**: `dashboard_reached=true` は subagent 主観、`page.url().includes('/dashboard')` 等の機械検証可能 assertion を PASS 条件に未含。
- **ADV_RESPONSIBILITY_FAILURE**: ① **テスト設計時の受入基準分解不足**: LOGIN-TEST-STRUCTURAL-FIX-IMPL で UX 仕様 §14.1/§14.2 から「signin 成功後の期待 URL/DOM/session 永続化」を分解して assertion 化する責務を果たさず ② **subagent 完了報告の裏付け検証欠如**: §2.25.21.6 で「subagent 報告の実態裏付け検証必須」と定義済みだが、BUG-RT-PKCE-FLOWTYPE-FIX の「17/17 PASS」を ADV メインが Playwright spec を直接 Read して assertion 網羅性確認せず転記。
- **MECHANICAL_ENFORCEMENT_GAP**: ① **adv_response_gate.sh の検証浅さ**: log に「signin_success=true && dashboard_reached=true」が記録されているか grep するが、この値の「真実性」(実際のテストコードが何を assert しているか) を検証せず、subagent が `console.log("dashboard_reached=true")` と出力すれば通過する構造的穴 ② **テストコード自体の品質 gate 不在**: Playwright spec の assertion 件数/種類 (URL/DOM/localStorage/リロード後 session) を機械カウントして Phase 完了要件と照合する hook 未配線。
- **IMPROVEMENT**: ① **テスト assertion 網羅性チェックリスト義務化**: §2.25.21.4 拡張で「実機 smoke PASS = URL 検証 + DOM 検証 + リロード後 session 維持検証の 3 軸 assertion 必須」明文化 + `scripts/test_assertion_validator.sh` 新設で Playwright spec を grep して `expect(page.url())`/`expect(locator)`/`expect(session)` の 3 パターン存在を機械検証 ② **smoke ログフォーマット厳格化**: 抽象フラグから機械検証可能形式に変更 (`url=/grow && dom_main_class=s10-grow && session_after_reload=true` 等を TAB 区切りで記録) ③ **subagent 完了報告の機械裏付け強制**: §2.25.21.6 拡張で「ADV メインは該当 Playwright spec を Read して assertion 行数/種類を機械カウント、報告値と照合」明文化 + `adv_response_gate.sh` に「Playwright spec 直接確認済 grep 欠落時 BLOCK」追加。

### 1.10 システム設計専門家 (SPA ルーティング・状態管理)
- **ROOT_CAUSE**: 真 E2E 完了条件が API 応答レベル (17/17 PASS) で定義され、ユーザー体験レベル (signin→ダッシュボード DOM→リロード後状態維持) の検証を含まず。SPA ルーティング層・DOM 描画層・状態永続化層の検証が仕様・実装ともに欠落。
- **TEST_DEFINITION_GAP**: ① 「実機 smoke PASS」の定義が曖昧 (API 200 OK か、期待画面 S-10 GROW の DOM 描画完了かが未明文化) ② SPA ルーティング検証の不在 (`route('/', true)` が session 状態に応じて S00/S-10 を正しく選択するか、`data-screen` 属性・localStorage・sessionStorage が期待値と一致するかの検証項目が不在)。
- **ADV_RESPONSIBILITY_FAILURE**: ① 「真 E2E」を API 層で止め、「ふとし実機操作時の体験」(signin→ダッシュボード可視化→リロード後継続) まで仕様拡張せず ② Phase 完了判定で「PO 実機 1 回 signin → ダッシュボード到達確認」または「Playwright で `data-screen="S-10"` 存在確認」を必須に未含。
- **MECHANICAL_ENFORCEMENT_GAP**: ① テストスクリプトが API 応答ステータスのみ assert、DOM 要素 (`data-screen="S-10"`、ダッシュボード固有コンポーネント)・localStorage (`supabase.auth.token`) 未検証 ② CI/CD パイプラインで「smoke PASS = 期待画面 SS 一致 OR 特定 DOM 要素存在」を機械強制する仕組みが不在、人間判断依存。
- **IMPROVEMENT**: ① 真 E2E を 3 層再定義 ((a)API 応答成功 (b)期待画面 DOM 要素存在 (c)リロード後・タブ復帰後状態維持)、Phase 完了 = 全層 PASS 必須仕様化 ② signin smoke に Playwright 追加 (signIn() → `data-screen="S-10"` 存在 → localStorage 検証 → page.reload() → 再度 `data-screen="S-10"` 確認、4 ステップ機械強制) ③ Phase 完了条件に「PO 実機確認 (signin → ダッシュボード操作 → リロード) 記録提出 OR Playwright ビジュアル回帰テスト PASS」追加、CI 失敗時マージブロック。

---

## §2 採択改善案 + 実行計画

### 2.1 T1 採択 [10 票]: 真 E2E 定義 = 3 軸必須化
**配置**: `lais/verify/dev_system_v34_package.md` §2.25.21.4 拡張

**新規定義**:
> **真 E2E PASS = (a) API 成功 + (b) 期待 URL/DOM 到達 + (c) リロード後 session 維持 の 3 軸全 PASS**  
> いずれか欠如時は PASS 判定不可。Phase 完了不可。

**実装**:
- `lais/specs/test_definition_true_e2e.md` 新設 (3 軸定義 + 各軸の必須 assertion パターン例)
- `tests/e2e/auth.spec.ts` 改修: `page.click → waitForURL('**/S-10') → expect(locator).toBeVisible() → page.reload() → expect(locator).toBeVisible()` の 4 ステップ強制
- 既存 `realmachine_smoke_results.log` フォーマット拡張: `url=<path> && dom_screen=<S-10> && session_after_reload=true` (TAB 区切り key=value)

### 2.2 T2 採択 [9 票]: Playwright をブラウザ実行 PASS 判定として CI 機械強制
**配置**: `package.json` scripts + `.github/workflows/smoke.yml` (該当 CI 設定)

**実装**:
- `playwright.config.ts` 新設 (chromium + `--headed` (CI では `--headed=false`) + `--video=on` + `--trace=on`)
- `npm run test:e2e:smoke` 追加 → Phase 完了 gate に組込
- CI step: API smoke + Playwright smoke の **両方** PASS 時のみ Phase 完了可。片方失敗 → マージブロック

### 2.3 T3 採択 [6 票]: assertion 網羅性 lint
**配置**: `scripts/test_assertion_validator.sh` 新設

**実装**:
```bash
# Playwright spec 内に下記 3 パターンが各 1 つ以上存在することを grep
# 1. expect(page.url()) または page.waitForURL
# 2. expect(page.locator(...)).toBeVisible() または .toHaveText()  
# 3. page.reload() に続く expect (session 維持 assertion)
# 欠落時 exit 1
```
- pre-commit hook + CI step として配線
- `tests/e2e/*.spec.ts` 全件対象、auth.spec.ts は特に必須

### 2.4 T4 採択 [4 票]: subagent 報告 N/N PASS の機械裏付け検証
**配置**: `lais/verify/dev_system_v34_package.md` §2.25.21.6 拡張 + `scripts/adv_response_gate.sh` 改修

**新規責務**:
> ADV メインが subagent 「N/N PASS」報告を転記する際、必ず該当 Playwright spec を Read し、assertion 行数/種類 (URL/DOM/reload-after) を機械カウント、報告値と照合してから転記する。  
> 確認証跡として「Playwright spec 直接確認済 (assertion=URL+DOM+reload, count=X)」を応答内に明記。

**adv_response_gate.sh 追加 hook**:
- subagent 完了報告転記応答内に「Playwright spec 直接確認済」grep 欠落 → BLOCK
- 「N/N PASS」と書いてあるが confirmation 文字列不在 → BLOCK

### 2.5 T5/T6 採択 [3 票各]: smoke ログ厳格化 + PO 実機録画証跡
- **T5**: `realmachine_smoke_results.log` を抽象フラグから key=value 形式に。`scripts/log_format_validator.sh` で grep 強制
- **T6**: Phase 完了報告に「Playwright video 出力パス + PO 実機 1 周操作 SS (任意添付)」必須化。`adv_response_gate.sh` に video 添付 grep を追加

### 2.6 実行計画 (優先順位付き)
| Step | 作業 | 優先 | 担当 | 完了判定 |
|---|---|---|---|---|
| 1 | `lais/specs/test_definition_true_e2e.md` 新設 (T1 仕様化) | P0 | 仕様 subagent | PO レビュー + sign-off |
| 2 | `tests/e2e/auth.spec.ts` 改修 (3 軸 assertion 追加) (T1+T2) | P0 | 実装 subagent | mock + 実機 smoke 両 PASS |
| 3 | `scripts/test_assertion_validator.sh` 新設 (T3) | P1 | DevOps subagent | pre-commit + CI 配線 |
| 4 | `§2.25.21.6` 拡張 + `adv_response_gate.sh` 改修 (T4) | P1 | 仕様 subagent | gate 動作確認 |
| 5 | smoke ログ key=value 化 (T5) + Phase 完了 video 添付必須 (T6) | P2 | 実装 subagent | 1 サイクル運用確認 |

---

## §3 PO 向け 3 行サマリー

```
[完了報告 - TEST-GAP-LOGIN-REDIRECT-PERSONA-REVIEW]
1. 問題点: 真 E2E テスト assertion が API レイヤ (token 取得・200 応答) で切断され、ユーザー可視レイヤ (URL/DOM/リロード後 session 維持) を検証していなかった。「signin_success=true / dashboard_reached=true」抽象フラグは subagent が console.log で出力すれば §2.25.21.4 を通過できる構造的盲点 = 「テストはしたがふとし体験と等価のテストではない」用語詐欺。
2. 改善案: ① 真 E2E 定義 = (a)API成功 + (b)期待URL/DOM到達 + (c)リロード後session維持 の 3 軸必須化 [10/10 票] ② Playwright で全 3 軸を機械検証 + CI で API smoke と両方 PASS 必須 [9/10 票] ③ Playwright spec の assertion 網羅性を lint で機械強制 [6/10 票] ④ ADV メインが subagent 「N/N PASS」報告転記前に該当 spec を直接 Read して assertion 種類カウント、§2.25.21.6 拡張 [4/10 票]。実行計画 5 ステップ (P0: spec 新設 + auth.spec.ts 改修 / P1: validator + gate 改修 / P2: ログ厳格化)。
3. 次: ADV 自律で改善実装 subagent 起動 (TEST-GAP-LOGIN-REDIRECT-IMPL) — Step 1〜5 を順次実行、P0 完了時点で PO 実機再現テスト → 違反 #14 完全クローズ判定。
```

---

**レポート完了**: 2026-04-26  
**書込ファイル**: `/Users/futoshi/Desktop/goal-ai-worker/lais/verify/test_gap_login_redirect_review_2026-04-26.md` (1 ファイルのみ)  
**並走衝突**: なし (EXA-FOR-CLAUDE-RESEARCH と非重複領域)
