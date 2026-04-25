# Learned Patterns — レビュー学習パターン蓄積
> dev-system §13.16 準拠
> 管理者: ENG（Claude Code）
> 更新タイミング: ゴールデンレビュー CRITICAL 0 達成後
> 蓄積条件: 2つ以上の異なるミッションで同一・類似の指摘が出現したパターンのみ

---

## パターン一覧

### LP-001: prefers-reduced-motion を全アニメーション要素に適用
- **何をすべきか:** `transition` / `transform` / `animation` / `@keyframes` / `:active` のスケール効果を含む全動的スタイルに対し、`@media (prefers-reduced-motion: reduce)` で無効化（`animation-duration: 1ms !important` 等）するか、design_system.md §7.6 のトークン縮退を利用する。JS 側タイマーで演出時間を制御している場合は `window.matchMedia('(prefers-reduced-motion: reduce)').matches` で分岐してスキップする
- **やらないとどうなるか:** WCAG 2.3.3 違反。前庭障害/動きに敏感なユーザーに不快感や健康影響。`:active` scale が reduced-motion でも残るケース、JS setTimeout が CSS トークン縮退と独立に動作するケースが頻出指摘
- **初出:** M2（S-00 Splash）
- **再出現:** M3（S-01 Auth）, M4-A（AuthCallback）

### LP-002: SPA 遷移後のフォーカス移動
- **何をすべきか:** preact-router `route()` で画面を切り替えた直後、新画面の主要コンテナ（`<main tabIndex={-1}>` 等）に `focus()` を移動する。画面タイトルやランドマーク領域をフォーカス対象にするのが望ましい
- **やらないとどうなるか:** スクリーンリーダーが遷移を認識せず、キーボードフォーカスが前画面に残る。WCAG 2.4.3 / 1.3.1 違反。a11y_engineer が毎ミッションで指摘
- **初出:** M3（S-01 Auth）
- **再出現:** M4-A（AuthCallback）
- **積み残し:** D-14（session_progress.md）として未対応。Router 安定後にまとめて対応

### LP-003: CSP / localStorage トークン窃取対策
- **何をすべきか:** `index.html` に `<meta http-equiv="Content-Security-Policy">` または HTTP ヘッダで CSP を設定する（最低限 `default-src 'self'; connect-src 'self' https://*.supabase.co; script-src 'self'`）。合わせて `X-Frame-Options: DENY` / `Referrer-Policy`。Supabase セッションは localStorage に格納されるため、XSS が発生するとトークンが直接窃取される
- **やらないとどうなるか:** XSS 発生時にセッショントークンが取得され、第三者がユーザーになりすましできる。security_engineer が全ミッションで繰り返し指摘
- **初出:** M2（S-00 Splash）
- **再出現:** M3（S-01 Auth）, M4-A（AuthCallback）
- **積み残し:** Phase B-4（CSP）として本番前必須項目に登録済み

### LP-004: WCAG AA コントラスト比の実測値記載
- **何をすべきか:** レビューパッケージに「本文/プレースホルダー/エラー/アクセント色 × 背景色」の実測コントラスト比を明記する。design_system.md §2 のトークンだけでは照合できないため、実値（例: `4.7:1 AA合格`）を文字/数字で提示する
- **やらないとどうなるか:** トークン名のみの提示では AA 準拠可否を判定できず、a11y_engineer が「コントラスト実測不明」を HIGH/CRITICAL で毎回指摘する。placeholder 色 `--text-muted #6E7681` on `#161B22` = 2.93:1 で AA 未達だった実例あり
- **初出:** M3（S-01 Auth プレースホルダー）
- **再出現:** M4-A（AuthCallback 本文/エラー/アクセント）

### LP-005: 非同期フローの無限ローディング防止とタイムアウトガード
- **何をすべきか:** `送信中…` / `認証確認中…` 等のローディング状態は必ずタイムアウト（例: 15秒）を設けて、期限超過時にエラー表示 + リトライ導線または手動復帰ボタンを出す。ネットワーク断・Supabase 側遅延・code exchange ハング時に復帰できる設計にする
- **やらないとどうなるか:** オフライン/遅延環境でユーザーが永久にローディングから抜けられない。戻るボタンしか脱出手段がなくなる。edge_case_hunter が毎ミッションで指摘
- **初出:** M3（S-01 Auth 送信中）
- **再出現:** M4-A（AuthCallback 認証確認中）

### LP-006: onAuthStateChange / subscription の HMR 多重購読
- **何をすべきか:** `supabase.auth.onAuthStateChange` 等の購読はモジュール top-level ではなく明示的な関数（例: `bootstrapAuth()`）に閉じ込め、`bootstrapped` フラグで多重購読を防ぐ。`import.meta.hot.dispose` で teardown する。コンポーネント内 useEffect からの呼び出しに切替え済みでも、HMR 時に購読が累積しないことを確認する
- **やらないとどうなるか:** Vite HMR で開発時にリスナーが累積し、メモリリークや「auth state 変更で同じ処理が複数回走る」再現困難バグが発生する
- **初出:** M3（S-01 Auth / auth.js）
- **再出現:** M4-A（AuthCallback / bootstrapAuth 配置変更時）

### LP-007: エラー表示直後の自動遷移が SR 読み上げを妨げる
- **何をすべきか:** `aria-live="polite"` でエラーメッセージを出した直後に `setTimeout(route, 2000)` 等で自動遷移すると、スクリーンリーダーの読み上げが完了する前に画面が切り替わる。最低 5 秒保持するか、「ログインに戻る」ボタンを明示して自動遷移を廃止する
- **やらないとどうなるか:** エラー理由がユーザーに届かず、同じ失敗を繰り返す。a11y HIGH として毎回指摘
- **初出:** M3（S-01 Auth サーバエラー）
- **再出現:** M4-A（AuthCallback エラー時 2秒遷移）

### LP-008: 環境変数未設定時のクラッシュ処理
- **何をすべきか:** `supabase.js` 等で必須環境変数の欠落を検知した場合、モジュール評価時に `throw` するのではなく、専用のエラー画面コンポーネントを描画してユーザー向けに「設定不備」と「連絡先」を提示する。開発時のみ `throw` する分岐も可
- **やらないとどうなるか:** 本番デプロイの設定ミスで画面全体が真っ白になる。原因特定にログを掘る必要が生じる。code_reviewer が M3 で指摘
- **初出:** M3（S-01 Auth supabase.js）
- **再出現:** M4-A（AuthCallback も同じ supabase クライアントを読み込み、同じリスクを継承）

### LP-009: emailRedirectTo / origin 直結のサブパス非互換
- **何をすべきか:** `window.location.origin + '/auth/callback'` のように origin 直結で Supabase リダイレクト URL を組み立てると、サブパス配備（`https://example.com/app/`）やプレビュー環境で不整合が起きる。`import.meta.env.VITE_APP_BASE_URL` 等の環境変数経由で組み立て、Supabase Dashboard の Allowed Redirect URLs と 1 対 1 対応させる
- **やらないとどうなるか:** プレビュー/ステージング環境でメール確認リンクが本番に飛ぶ / 404 になる。open redirect 懸念も指摘される
- **初出:** M3（S-01 Auth CORS/リダイレクト制約不明）
- **再出現:** M4-A（AuthCallback `emailRedirectTo` ハードコード）

### LP-010: console.log / console.error の本番バンドル漏出
- **何をすべきか:** `console.*` は開発時のみ有効化する（Vite の `define: { 'console.log': '(()=>{})' }` や専用 logger 経由）。エラーログは Sentry 等の外部収集に統一する。秘匿情報（token / PII / 環境依存パス）を console に出さない
- **やらないとどうなるか:** 本番バンドルサイズ増 + 運用ログ収集面での情報開示過剰 + トークン文字列が誤って console に出るリスク
- **初出:** M2（S-00 Splash console.log）
- **再出現:** M4-A（AuthCallback getSession 失敗の console.error）

### LP-011: 魔法の数字とデザイントークンの乖離
- **何をすべきか:** CSS の `bottom: 76px` / JS の `900ms` など算出根拠のない数値は、`calc()` で依存関係を明示するか、design_system.md §7.5 のトークン（`--duration-celebration` 等）に統一する。トークンと数値が乖離（例: 900ms vs 800ms）している場合はトークン側を正とする
- **やらないとどうなるか:** トークンを変更してもハードコード値が追従せず、ブランド/モーションの一貫性が崩れる。code_reviewer / a11y_engineer が毎回指摘
- **初出:** M2（S-00 Splash CTA bottom: 76px）
- **再出現:** M3（S-01 Auth 各種 px）, M4-A（AuthCallback WELCOME_HOLD_MS 900ms vs --duration-celebration 800ms）

### LP-012: ルートレベルコード分割（lazy import）
- **何をすべきか:** preact-router の各画面コンポーネントは `lazy(() => import(...))` + `<Suspense>` で動的 import する。現状は `App.jsx` で全画面を静的 import しており、初期ペイロードに Supabase クライアントや全画面 JS が乗る
- **やらないとどうなるか:** 初回起動 LCP 悪化。Phase A 完了時に 10 画面全てが静的 import されて初期バンドルが膨らむ。performance_engineer が HIGH で指摘
- **初出:** M3（S-01 Auth の static import）
- **再出現:** M4-A（AuthCallback も static import）
- **積み残し:** Phase B-1（コード分割 H5/H6）として登録済み

### LP-013: iOS safe-area の段階的フォールバック（`@supports`）
- **何をすべきか:** 画面下端に固定される要素（フッタ CTA / BottomTabBar / モーダル下端ボタン）は `env(safe-area-inset-bottom)` を使うが、**第 2 引数（フォールバック値）は使わない**。まず env() 不使用の base 値を設定し、`@supports (bottom: env(safe-area-inset-bottom)) { ... }` ブロック内で対応ブラウザ向けに上書きする。padding-bottom も同様
- **やらないとどうなるか:** `env(var, 0px)` の第 2 引数構文は CSS 仕様上は有効だが、複数の外部 AI レビュアーが一貫して「パースエラー」と誤認する（実際の主要ブラウザ実装でも挙動差あり）。プロパティ全体がドロップされて固定位置が崩れる / コンテナ下部余白が消失する。M4-B で R2 CRITICAL × 4 を誘発、M4-C で事前適用により回避（PD-009 に基づき昇格）
- **初出:** M4-B（S02Onboarding CTA + コンテナ padding-bottom）
- **再出現:** M4-C（S10Grow + BottomTabBar 両方で予防適用成功 = 外部 AI 指摘 0 件）

### LP-015: Active / Selected 状態のピル/タグ/チップに `border-color` を可視で残す（WCAG 1.4.11 Non-text Contrast 3:1）
- **何をすべきか:** 選択状態を `background: var(--accent-subtle)` の塗りだけで示すと、`--accent-subtle`（例: `rgba(121,192,255,0.14)`）は背景 (`--bg-surface` `#161B22`) に対して ≈1.33:1 で WCAG 1.4.11 未達。**`border: 1px solid var(--accent)` を Active 時にも残す**ことで `--accent` `#79C0FF` on `--bg-surface` ≈ 8.46:1（または on `--bg-primary` ≈ 9.49:1）を確保する。Inactive 状態は `border: 1px solid var(--border-strong)` で 3:1 以上を別途確保。
- **やらないとどうなるか:** 選択状態のコンポーネント境界が背景と区別不能。WCAG 1.4.11 Non-text Contrast の必須 3:1 を満たさず、a11y_engineer が CRITICAL で指摘。M4-D R1 で実例（種別ピル + 所要時間チップ）。
- **初出:** M4-D R1（S12TaskAdd `.s12-type-pill-active` / `.s12-duration-chip-active`）
- **再出現:** M4-E（S13TaskDetail `.s13-ai-btn-active` 予防適用成功 = 外部 AI 指摘 0 件）/ M4-F（S14GoalDetail `.s14-cat-tag` `.s14-action-ai` 予防適用成功 = 同 0 件）
- **適用範囲:** 種別ピル / カテゴリチップ / カテゴリタグ / Active ボタン / Selected カード — `--accent-subtle` 塗りを使う全ての Active state

### LP-014: `:focus:not(:focus-visible)` + `:focus-visible` で programmatic focus と keyboard focus を分離
- **何をすべきか:** LP-002 の SPA 遷移後 `mainRef.current.focus()` 等で programmatic focus を呼ぶ要素には、`outline: none` を無条件に指定してはいけない。代わりに:
  ```css
  .elem:focus:not(:focus-visible) { outline: none; }
  .elem:focus-visible { outline: 3px solid var(--accent); outline-offset: -3px; }
  ```
  これで programmatic focus では outline を出さず、キーボードユーザーが Tab で到達した場合は可視リングを出せる
- **やらないとどうなるか:** 無条件 `outline: none` は WCAG 2.4.7 Focus Visible 違反。a11y_engineer が CRITICAL で指摘。逆に outline を常に表示すると SPA 遷移直後の programmatic focus で視覚的ノイズが出る
- **初出:** M4-B（S02Onboarding の main 要素）
- **再出現:** M4-C（S10Grow / チェック / タスクカード / Upcoming ヘッダ / Goal / BottomTabBar すべてに予防適用成功 = 外部 AI 指摘 0 件）

---

### LP-030: 同一モデルでもセッション分離・ペルソナ分離でバグ検知力が変動（同一セッション self-critique の構造的限界）
- **何をすべきか:** 仕様書・生成物のバグ検知は **同一セッション内の self-critique ではなく、別セッション（fresh context）+ 別ペルソナ** で実施する。同一モデル（例: Opus 4.7）でも、context / attention / 会話履歴の独立が検知力を左右する
  - Pre-Review / ゴールデンレビューは同一セッションではなく必ず別プロセス起動（`claude -p` / Agent tool subagent / 外部 API のいずれか）
  - 最低限、検出したいバグ種別ごとにペルソナ切替（devops_engineer + solo_dev + qa_lead 等の独立指示）
- **やらないとどうなるか:** 同一セッション self-critique は「自分の書いた仕様を同じ attention で読み直す」ため、論理層・意図層の矛盾を見落とす。機械層（grep / sort / uniq 等で検出可能）は self-critique で拾えるが、整合性の飛躍（§6.2 スクリプト列挙漏れ、§6.4 連鎖更新指示欠落、`set -eu` 下での unset 変数参照等）は検出困難
- **初出:** Desktop Code ADV G_48 Pre-Review 2R（2026-04-23、PATCH-18 §2.25 自己レビュー）+ Code G_49 fresh context 検証（同日、14 件バグ検出）の検知率差
- **再出現:** 本セッションの DEV-SYSTEM-V35-EXTERNAL-REVIEW-PROTOCOL 案 D' 採用根拠（PO 確定 2026-04-23）
- **仕様反映:** `sub_external_review_protocol.md`（新設予定）で「独立プロセス並列レビュー」を原則化 / `sub_review_flow §9 Orchestrator 連携`（または同等の別プロセス発火節）で明文化
- **関連:** LP-031（2 段階レビュー構成）/ Bug O（Pre-Review 2R の CRITICAL 0 宣言が 🔴 重大 3 件を見逃した実証）

### LP-031: Stage 1（書込者機械層自己レビュー）+ Stage 2（別セッション論理層レビュー）の 2 段階構成が単独より総やり戻しを減らす
- **何をすべきか:** 仕様書 / 生成物のレビューは 2 段階で実施:
  - **Stage 1（書込者自身、同一セッション可）**: 機械層検証（章重複 / サブ節重複 / grep 整合性 / 参照実在確認 / スクリプト名一貫性）。§10 検証コマンド相当。self-critique 限界を受容し、スコープを「機械的に検出可能な構造」に限定
  - **Stage 2（別セッション、別ペルソナ）**: 論理層・意図層検証（§6 連鎖更新指示の漏れ / SSOT 整合性 / 設計思想衝突 / 既棄却テーマ再開）。fresh context で attention 独立
- **やらないとどうなるか:** Stage 1 のみ → 論理層バグ見逃し（例: Bug A/B/D/E）/ Stage 2 のみ → 機械層ノイズに attention 取られて論理層に集中できない / 両方省略 → 事後検出で CHAIN-UPDATE-DISPATCH 等の実行時に ブロッカー発生
- **初出:** PATCH-19 修正経緯（Stage 1 = ADV §10 構造検証 PASS / Stage 2 = Code G_49 fresh context で 14 件バグ発見）
- **再出現:** v3.5 案 D' 採用（pre-commit で Stage 1、外部 API 並列で Stage 2 を機械化）
- **仕様反映:** `sub_external_review_protocol.md` Phase 1-3 実装（pre-commit + ai_review.js + subagent 並列）で制度化
- **関連:** LP-030（同一セッション self-critique 限界）/ G18 chain_update_audit.sh（Stage 1 の pre-commit 機械化）

### LP-032: モデル階層（Haiku/Sonnet/Opus）による最適化は、ユーザープランが従量課金の場合のみ有効。定額プラン（Max）では Opus 統一が品質上限
- **何をすべきか:** dev-system が想定する AI レビュー構成は、ユーザープランによって最適構成が異なる:
  - **Max プラン（定額、Opus 使い放題）**: 全レビューで Opus 4.7 統一が推奨。モデル階層最適化は逆効果（Haiku で済ますと品質上限が下がる）
  - **従量課金プラン**: Haiku（機械検証）/ Sonnet（中間確認）/ Opus（ゴールデン最終判定）の階層最適化で API コストを 50-70% 削減（AI-REVIEW-COST-OPTIMIZE 参照）
  - 仕様書本体（dev_system_spec.md）ではどちらかに寄せず、**切替可能にする**（`app_config.yaml` の `review.model_tier: "opus_unified" | "cost_optimized"`）
- **やらないとどうなるか:** Max プラン前提で仕様化 → 従量課金ユーザーがコスト爆発 / 従量課金前提で仕様化 → Max プランユーザーが品質上限を自ら下げる / 切替なし → 片側のユーザーが運用困難
- **初出:** v3.5 案 D' 検討時（ふとし PO が Max プランユーザーであることを前提にレビュー体系を設計、2026-04-23）
- **再出現:** AI-REVIEW-COST-OPTIMIZE（提案ログ、従量課金シナリオ用の 5 施策）と相補
- **仕様反映:** `sub_external_review_protocol.md` §「ユーザープラン別設定」節 + `app_config.yaml` の `review.model_tier` フラグ / `dev_system_v35_roadmap.md` で版跨ぎ判定に含める
- **関連:** PD-103（レビューモデルのグレード使い分け）/ AI-REVIEW-COST-OPTIMIZE（従量課金シナリオのコスト最適化打ち手）

---

## Phase 3 運用定着（v3.5、2026-04-25 PATCH-26 着手時記録）

> 本節は dev-system v3.5 Phase 3（DEV-SYSTEM-V35-EXTERNAL-REVIEW-PROTOCOL）の LP 運用定着実例を蓄積する。LP-030/031/032 内容は変更せず、運用 3 ケース以上の実発動証跡を追記（仕様書 §10 Phase 3「LP-030/031/032 運用定着（3 ケース以上で発動検証）」充足）。

### LP-030 適用実例（Phase 2 修正、Bug V35-P2-S2-01 検出）

- **発動文脈**: 2026-04-25、`dev_system_v35_phase2_stage2_review.md` における Stage 2 fresh subagent レビュー
- **成果**: Phase 2 当初実装（PATCH-24）が同一セッション self-critique で「3 動作検証 PASS」と主張していたが、fresh context subagent が `scripts/external_review_postcommit.sh` の Python ブロックが ai_review.js JSON 配列を dict として読み込む構造不整合（`AttributeError: 'list' object has no attribute 'get'`）を CRITICAL Bug V35-P2-S2-01 として検出
- **検出された self-critique 限界**: 同一セッションでは「自分が書いた d.get('findings')」を「実際 ai_review.js が出力する JSON 配列」と整合確認しないバイアスが残存。fresh subagent では context 独立でモック実行 → AttributeError 確認 → 構造不整合判定の経路が成立
- **PATCH-25 で完全解消**: `isinstance(d, list)` 分岐 + `evidence/PHASE2-FIX/` 5 ファイル実走証跡で実機検証済（再 Stage 2 レビュー `dev_system_v35_phase2_fix_stage2_review.md` で CRITICAL 0 確認）
- **Bug O 構造解消の実証**: 「Pre-Review 2R の CRITICAL 0 宣言が 🔴 重大 3 件を見逃した」LP-030 初出 Bug O 類型が、fresh subagent 並列で構造解消可能であることを Phase 2 で再現実証

### LP-031 適用実例（Stage 1 → Stage 2 の 2 段階で 14 件以上の論理層バグ検出）

- **発動文脈**: 2026-04-23 から 2026-04-25 にかけての DEV-SYSTEM-V35-EXTERNAL-REVIEW-PROTOCOL 全 Phase 1/2/3
- **Stage 1（同一セッション機械層）**: ENG subagent が Phase 1/2 実装後 `sh -n`、`bash -n`、`grep -c "^## PATCH-"`、`test -x` 等で構造検証 → 機械層 PASS 確認
- **Stage 2（fresh context 論理層）**: 別 subagent（fresh context、別ペルソナ）が `dev_system_v35_phase1_stage2_review.md`（Bug V35-P1-S2-01 〜 03、HIGH/MEDIUM 計 14 件以上）+ `dev_system_v35_phase2_stage2_review.md`（CRITICAL Bug V35-P2-S2-01 含む構造不整合 6 件）で論理層バグ検出
- **2 段階の補完性**: Stage 1 のみでは構造不整合（dict vs 配列）は文法 PASS で見逃された / Stage 2 のみでは機械層ノイズに attention を取られて 14 件論理層に集中できなかった可能性 / 両方並走で総やり戻し最小化を Phase 1〜2 で実証
- **G18 機械化の前提**: Stage 1 の機械層検証は `scripts/chain_update_audit.sh`（PATCH-21 で新設）で pre-commit 機械化済み、Stage 2 の論理層検証は本プロトコル `subagent + 外部 API` で並列化

### LP-032 適用実例（Max プラン Opus 4.7 統一運用、`app_config.yaml review.model_tier` 切替準備完了）

- **発動文脈**: 2026-04-23 PO 確定 Max プランユーザー前提の Phase 1〜3 全実装
- **運用方針**: 全 subagent（ADV / ENG / QA / Pre-Review）で Opus 4.7 統一、外部 API は GPT-5.4 + Gemini 3.1 Pro Preview の 2 系列（Phase 1 凍結スクリプト経由）
- **`app_config.yaml` 切替準備**: `review.model_tier: "opus_unified" | "cost_optimized"` フラグの仕様化が `sub_external_review_protocol.md §7` で完了、ENG 側の参照ロジックは v3.5.x で実装
- **コスト動的算出への布石**: PATCH-26 で `scripts/ai_review.js` に `cost_usd` を `_metadata` エントリで JSON 配列に追記（V35-P2-S2-04 解消）、postcommit.sh の $0.15 ハードコード fallback は Phase 1 凍結のため維持。`app_config.yaml review.model_tier` 切替時に従量課金プラン側で Haiku/Sonnet/Opus 階層最適化を実機適用可能な状態が整備
- **AI-REVIEW-COST-OPTIMIZE との相補性**: 従量課金シナリオでの 5 施策（提案ログ）と `app_config.yaml review.model_tier` フラグが相互補完、Max → 従量切替時の品質低下リスクを `sub_external_review_protocol.md §7.3` 通り PO 通知で吸収

---

### LP-033: 外部 CLI 呼出しは Stage 1 機械層検証で実機起動テスト必須（PATCH-27 / Bug V35-P3-S2-001 起源）
- **何をすべきか:** スクリプトが外部 CLI（claude / gh / wrangler / npx 等）のオプション・サブコマンドを呼出す箇所は、Stage 1 検証で `sh -n` / `bash -n` / `node --check` 等の構文チェックだけでなく、**実機起動して unknown option / 構文エラーが出ないことを確認**する。CLI 公式ヘルプ（`claude --help` / `gh --help`）を実機取得してフラグ存在を確認、modify 後は dryrun 実行で起動成功（応答待ち or exit 0 まで到達）まで証跡保存する
- **やらないとどうなるか:** PATCH-26 Phase 3 で `spawn_subagent_review.sh` が `claude --allowed-dirs` という存在しないフラグを呼んだまま Stage 1 全 PASS 通過、Phase 3 Stage 2（fresh subagent）で初検出。Stage 1 機械層検証の盲点（`sh -n` は構文のみ、CLI フラグの実在性は未検証）。LP-030（同セッション self-critique 限界）+ LP-031（Stage 1+2 構成）の機械層側で穴があった事例
- **初出:** Phase 3 Stage 2（`spawn_subagent_review.sh` 初版、Bug V35-P3-S2-001 CRITICAL）
- **再出現:** v5.x で同種の外部 CLI 呼出し追加時の予防適用想定（gh CLI / wrangler / supabase CLI 等の連携実装時に常時適用）
- **適用範囲:** scripts/ 配下で `command -v` / direct invocation する全外部 CLI（claude / gh / wrangler / supabase / npx / curl with API endpoint 等）
- **記録仕様:** 実機起動ログを `evidence/<MISSION_ID>/{cli}_help.log` + `{cli}_dryrun.log` の 2 種類保存、PATCH 記録の「修正後検証」節に reference

---

## Phase 3 運用定着（v3.5 確定時、2026-04-25）

LP-030 / LP-031 / LP-032 の運用実例を蓄積（仕様書 §10 Phase 3「3 ケース以上で発動検証」充足、LP-033 は Phase 3 で新規識別）:

### LP-030 適用実例
Phase 2 修正で fresh context subagent（再 Stage 2）が PATCH-24 で Stage 1 検証「PASS」と記録された Bug V35-P2-S2-01（postcommit.sh JSON 配列 vs dict 想定で全関数 except 落ち）を初検出。Stage 1（同セッション self-critique）は静的構文チェック（sh -n / bash -n / node --check）+ モック検証で通過したが、ai_review.js 出力形式と postcommit.sh 入力想定の不一致は context 切替なしでは認識困難。fresh subagent で dict/list 想定不一致が即時可視化、self-critique 限界の構造的解消を実証。

### LP-031 適用実例
Phase 1 → Stage 2 → Phase 2 → Stage 2 → Phase 2 修正 → Stage 2 → Phase 3 → Stage 2 → Phase 3 修正 → Stage 2 の 10 ラウンドで、Stage 1（書込者機械層自己レビュー、ENG subagent + ADV 自身）+ Stage 2（別セッション論理層レビュー、fresh subagent）の 2 段階構成を厳守。累計 Bug V35-P1-S2-01 (HIGH) / V35-P2-S2-01 (CRITICAL) / V35-P2-S2-02 (HIGH) / V35-P2-S2-03 (HIGH) / V35-P3-S2-001 (CRITICAL) / V35-P3-S2-HIGH-001 (HIGH) / V35-P3-S2-LOW-001-002 + 各 Phase で複数の HIGH/LOW を検出（合計 14 件以上）。単独 Stage 2 のみ運用では検知力低下、単独 Stage 1 のみでは fresh context 検証不在で論理層欠陥を見逃す事例を多数実証。

### LP-032 適用実例
Max プラン Opus 4.7 統一運用で Phase 1-3 全実行、外部 API は ai_review.js 内 GPT-5.4 + Gemini 3.1 Pro × 2 系列のみ使用、subagent は内部 Opus 4.7。`app_config.yaml review.model_tier` で Max = `opus_unified` / 従量課金 = `cost_optimized` の切替準備完了（templates/app_config_template.yaml 既設）、実切替実装は postcommit.sh 凍結解除と連動して v5.x で対応。

### LP-033 識別実例（新規）
Phase 3 で `spawn_subagent_review.sh` が `claude --allowed-dirs`（claude CLI に存在しないフラグ）を使用、Stage 1 機械層検証（sh -n + grep allowed-dirs 1）で全 PASS 通過したが、Stage 2 fresh subagent が実機起動テスト（`printf "test\n" | claude -p --allowed-dirs /tmp` → `error: unknown option`）で初検出。LP-030 + LP-031 の枠組み内で、Stage 1 機械層側に「外部 CLI 呼出し実機テスト」が抜けていた構造欠陥として抽出。PATCH-27 で `--add-dir` + `--allowedTools` に修正、再 Stage 2 で end-to-end 動作完全確証（subagent 完走 + exit 0）。

---

## 抽出メタ情報

- **初回抽出ミッション:** LAIS-LEARNED-PATTERNS-INIT（2026-04-15）
- **対象レビュー:** M2 S-00 Splash golden（14本）+ M3 S-01 Auth golden（14本）+ M4-A AuthCallback golden（7本）= 合計 35 JSON / 243 指摘
- **抽出方針:** 2 ミッション以上で同一・類似の指摘が出現したパターンのみ蓄積（severity 不問）
- **除外したパターン例:**
  - オートフィル animationstart 購読（M3 のみ）→ Group C として積み残し済み
  - placeholder 色コントラスト（M3 のみ。LP-004 に一般化して吸収）
  - ja-letter-spacing トークン適用漏れ（M2 のみ）
  - history 戻るボタンピンポンループ（M2 で対応済み、他に未再出現）
