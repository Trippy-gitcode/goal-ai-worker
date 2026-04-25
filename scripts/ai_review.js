#!/usr/bin/env node
/**
 * ai_review.js — 汎用AIレビュースクリプト
 *
 * Usage:
 *   node scripts/ai_review.js [options]
 *
 * Options:
 *   --input <glob>        レビュー対象ファイル (default: docs/plans/dev_system_spec.md,docs/plans/sub_*.md)
 *   --models <list>       使用モデル (default: gemini,gpt5)
 *   --personas <list>     ペルソナ (default: ai_ops,qa_engineer,dx_engineer)
 *   --output <dir>        出力先ディレクトリ (default: docs/plans/)
 *   --prefix <str>        出力ファイルプレフィックス (default: review_v3_final)
 *   --context <text>      レビュアーへの追加コンテキスト
 *   --context-file <path> コンテキストをファイルから読む
 *   --context-files <paths> 複数コンテキストファイル（カンマ区切り）を連結して読む
 *   --max-tokens <n>      GPT-5 max_completion_tokens (default: 32768)
 *   --timeout <ms>        APIタイムアウト (default: 300000)
 *   --parallel            6回のAPI呼び出しを同時実行（デフォルト: 直列）
 *   --dry-run             APIを呼ばずにプロンプトを表示
 *
 * v3.5 Phase 1 追加（sub_external_review_protocol §3）:
 *   --mode=precommit      pre-commit hook からの発火モード（git diff --cached 入力）
 *   --sync                同期モード（CRITICAL 検出で exit 1、commit ブロック）
 *   --async               非同期モード（fire-and-forget、結果は lais/verify/external_review/ に書込）
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { glob } = require('path');

// --- CLI Args ---
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    input: 'docs/plans/dev_system_spec.md,docs/plans/sub_*.md',
    models: 'gemini,gpt5',
    personas: 'ai_ops,qa_engineer,dx_engineer',
    output: 'docs/plans/',
    prefix: 'review_v3_final',
    context: '',
    contextFile: '',
    contextFiles: '',
    maxTokens: 32768,
    timeout: 300000,
    parallel: false,
    dryRun: false,
    mode: '',      // v3.5 Phase 1: '' | 'precommit' | 'vote'
    sync: false,   // v3.5 Phase 1: CRITICAL 検出で exit 1
    async: false,  // v3.5 Phase 1: fire-and-forget
    // v3.4 PD-112 §2.25.23 vote mode 拡張
    provider: '',  // 'gpt5' | 'gemini'（vote mode 必須）
    proposal: '',  // vote mode で評価対象テキスト
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--input') opts.input = args[++i];
    else if (arg === '--models') opts.models = args[++i];
    else if (arg === '--personas') opts.personas = args[++i];
    else if (arg === '--output') opts.output = args[++i];
    else if (arg === '--prefix') opts.prefix = args[++i];
    else if (arg === '--context') opts.context = args[++i];
    else if (arg === '--context-file') opts.contextFile = args[++i];
    else if (arg === '--context-files') opts.contextFiles = args[++i];
    else if (arg === '--max-tokens') opts.maxTokens = parseInt(args[++i]);
    else if (arg === '--timeout') opts.timeout = parseInt(args[++i]);
    else if (arg === '--parallel') opts.parallel = true;
    else if (arg === '--dry-run') opts.dryRun = true;
    // --- v3.5 Phase 1 拡張（sub_external_review_protocol §3） ---
    else if (arg === '--mode=precommit' || arg === '--mode' && args[i + 1] === 'precommit') {
      opts.mode = 'precommit';
      if (arg === '--mode') i++;
    }
    // --- PD-112 §2.25.23 vote mode 拡張 ---
    else if (arg === '--mode=vote' || arg === '--mode' && args[i + 1] === 'vote') {
      opts.mode = 'vote';
      if (arg === '--mode') i++;
    }
    else if (arg.startsWith('--provider=')) opts.provider = arg.slice('--provider='.length);
    else if (arg === '--provider') opts.provider = args[++i];
    else if (arg === '--proposal') opts.proposal = args[++i];
    else if (arg === '--sync') opts.sync = true;
    else if (arg === '--async') opts.async = true;
    else { console.error(`Unknown option: ${arg}`); process.exit(1); }
  }
  return opts;
}

// --- Load API Keys from .dev.vars ---
function loadEnv() {
  const envPath = path.join(process.cwd(), '.dev.vars');
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: .dev.vars not found');
    process.exit(1);
  }
  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      env[k.trim()] = v.join('=').trim();
    }
  }
  return env;
}

// --- Resolve glob patterns ---
function resolveFiles(inputPattern) {
  const patterns = inputPattern.split(',');
  const files = [];
  for (const pattern of patterns) {
    const trimmed = pattern.trim();
    if (trimmed.includes('*')) {
      // Simple glob: only supports trailing * in filename
      const dir = path.dirname(trimmed);
      const base = path.basename(trimmed);
      const regex = new RegExp('^' + base.replace(/\*/g, '.*') + '$');
      if (fs.existsSync(dir)) {
        for (const f of fs.readdirSync(dir)) {
          if (regex.test(f)) files.push(path.join(dir, f));
        }
      }
    } else {
      if (fs.existsSync(trimmed)) files.push(trimmed);
    }
  }
  return [...new Set(files)].sort();
}

// --- Read spec content ---
function readSpecs(files) {
  let content = '';
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    content += `\n\n${'='.repeat(60)}\n# FILE: ${path.basename(f)}\n${'='.repeat(60)}\n\n${text}`;
  }
  return content;
}

// --- Persona Definitions ---
const PERSONA_BASE = {
  ai_ops: `あなたはAI Ops設計の専門家です。以下の仕様書群を全て読み、AI⇔人間の責務分離、AIの自律範囲と承認ゲートのバランス、暴走防止メカニズムの観点からレビューしてください。
特に注目: 責務境界、自律実行範囲、承認ルールの実効性、AIが誤った判断をした場合のリカバリ手順。`,

  qa_engineer: `あなたはQAエンジニアです。以下の仕様書群を全て読み、テスト戦略の網羅性、テストアンチパターンの検出精度、品質ゲートの実効性の観点からレビューしてください。
特に注目: テスト分離の妥当性、影響範囲テストの信頼性、テストアンチパターン検出の網羅性、品質ゲート実効性。`,

  dx_engineer: `あなたはDeveloper Experience（DX）エンジニアです。以下の仕様書群を全て読み、開発者が日常的にこの仕様書を使う際の使いやすさ、曖昧さ、矛盾の観点からレビューしてください。
特に注目: 仕様書の構造・参照のしやすさ、参照整合性、新規開発者が迷わず作業開始できるか、用語の一貫性。`,

  sw_architect: `あなたはソフトウェアアーキテクトです。以下の仕様書群を全て読み、モジュール分離、依存方向、スケーラビリティ、共通/個別の境界設計の観点からレビューしてください。`,

  devops: `あなたはDevOpsエンジニアです。以下の仕様書群を全て読み、CI/CDパイプライン、デプロイ安全性、ロールバック手順、環境分離の観点からレビューしてください。`,

  // --- C. dev-system仕様レビュー personas (sub_review_flow.md §4.C) ---
  devops_engineer: `あなたはDevOpsエンジニアで、CI/CDパイプライン設計・品質ゲート構築・自動化基盤の設計経験が豊富です。以下のdev-system仕様改訂案を全て読み、CI/CD整合性・ゲート設計・自動化可能性の観点からレビューしてください。
特に注目: 品質ゲート（G1-G13）の整合性と網羅性、デプロイフロー（C2）のステップ間依存関係、スクリプトのプラットフォーム互換性（macOS/Linux）、canopy検証の発火保証、環境変数管理とシークレット保護、新設ゲート（G11/G12/G13）の実装可能性。
CRITICALの判定: ゲート間の矛盾でデプロイが通過してしまう / セキュリティ検証の抜け / 自動化不可能な手順が自動前提で書かれている。`,

  solo_dev: `あなたはソロ開発者（1人でフロント・バック・インフラ・テスト・ドキュメント全てを担当）です。以下のdev-system仕様改訂案を全て読み、ソロ開発者が実際に運用できるか、運用負荷が現実的か、の観点からレビューしてください。
特に注目: セッション起動時の必須Read量（§0 + §3 + §C1-C6）が現実的か、完了コマンド3区分（cmd-unit/cmd-e2e/cmd-realworld）のN/A理由記載コスト、提案ログの手動ステータス管理の負荷、22フローへのStep 0追加の認知コスト、仕様書1,900行を1人で維持管理できるか。
CRITICALの判定: ソロ開発者が物理的に遵守不可能な手順 / 自己矛盾で遵守すると別のルールに違反する / 運用コストが価値を上回る明確な証拠がある。`,

  qa_lead: `あなたはQAリード（テスト戦略・品質ゲート設計・アンチパターン排除の専門家）です。以下のdev-system仕様改訂案を全て読み、テスト戦略の網羅性・品質ゲートの実効性・anti-patternの観点からレビューしてください。
特に注目: L1スモーク5項目の網羅性（認証追加は正しいか）、3層テスト戦略（L1/L2/L3）と完了コマンド3区分（cmd-unit/cmd-e2e/cmd-realworld）の対応関係、統合E2E（§9新設）の定義の明確性、SKIPルールの一貫性、TDD証跡（G8）との整合。
CRITICALの判定: テスト戦略に穴がありバグが本番に漏れる / 品質ゲートが矛盾して全FAILまたは全PASSになる / テストアンチパターンを助長する設計。`,

  tech_writer: `あなたはテクニカルライター（開発者向けドキュメントの明確性・構造・用語一貫性の専門家）です。以下のdev-system仕様改訂案を全て読み、ドキュメントの明確性・曖昧表現・矛盾・参照整合性の観点からレビューしてください。
特に注目: §C1-C6（共通行動規範集）の表現の明確性、旧鉄則→新規範の移行マップ（§3.6）の完全性、§番号の参照整合性（§Cと§1-§20の混在）、用語の一貫性（「鉄則」「規範」「ルール」の使い分け）、曖昧な条件文（「適宜」「必要に応じて」等）の排除。
CRITICALの判定: 相互参照が破損している / 同一用語が異なる意味で使われている / 読者が誤解釈する確率が高い表現。`,

  // --- App spec review personas ---
  product_manager: `あなたはモバイルアプリのプロダクトマネージャーです。以下のアプリ仕様書を全て読み、コンセプトの一貫性、ターゲットとのフィット、MVP範囲の妥当性、収益モデルの持続可能性をレビューしてください。
特に注目: 価格設計、ゲーミフィケーションが課金動機に繋がるか、タブ構成で機能が足りるか。
必ず含める観点: 仕様書に書くべきだが書かれていないもの、言及はあるが具体的に定義されていないもの（数値/閾値/フォーマット等）、複数解釈が可能な曖昧な表現。`,

  ux_designer: `あなたはモバイルアプリのUXデザイナーです。以下のアプリ仕様書を全て読み、画面構成の直感性、操作フロー、情報設計、タブ構成の妥当性をレビューしてください。
特に注目: 画面内の情報量バランス、サブタブの使いやすさ、EXP/レベル表示の視認性、タスク完了演出のフロー。
必ず含める観点: 画面遷移で定義されていないもの、エッジケース（空状態/エラー/初回起動/大量データ）、ユーザーが迷うポイント。`,

  game_designer: `あなたはモバイルゲームのゲームデザイナーです。以下のアプリ仕様書を全て読み、EXPシステムのバランス、レベルカーブ、継続プレイの仕組み、ソーシャル動機をレビューしてください。
特に注目: EXP数値バランスの妥当性、レベルカーブ設計の不足、飽きポイント（1週間/1ヶ月/3ヶ月後）、アバター経済の設計不足。
必ず含める観点: ゲームシステムとして未定義のもの（レベルキャップ、EXP減衰、称号一覧、アバター進化段階等）、インフレ対策、不正対策。`,

  security_expert: `あなたはモバイルアプリのセキュリティ/プライバシー専門家です。以下のアプリ仕様書を全て読み、ソーシャル機能のプライバシー設計、データ交換の安全性、データ公開範囲、認証、GDPR考慮をレビューしてください。
特に注目: QRコードに含まれる情報、友達登録の承認フロー、メッセージ機能の悪用防止、AI対話データの保存範囲と第三者API送信。
必ず含める観点: セキュリティ設計として未定義のもの（認証方式、セッション管理、データ暗号化、退会時のデータ削除）。`,

  target_user: `あなたは25歳の社会人で、自己成長に興味がある。過去にHabitica（3ヶ月使って飽きた）、Finch（半年使ったが物足りなくなった）、Habitify（Free版の制限で離脱）を使った経験がある。以下のアプリ仕様書を全て読み、「自分が使いたいか」「続けられるか」「課金したいか」「友達に勧めるか」の観点でレビューしてください。
特に注目: 競合で感じた不満がこのアプリで解決されているか。
必ず含める観点: ユーザーとして「よくわからない」「説明が足りない」「実際に使うと困りそう」と感じる箇所。`,

  general_user: `あなたは30歳の会社員で、特に自己成長に興味があるわけではないが、友人に勧められてアプリを試す立場です。普段使うアプリはLINE、Instagram、PayPay程度。以下のアプリ仕様書を全て読み、「初見で何のアプリか分かるか」「使い方が分かるか」「面倒くさくないか」「続ける理由があるか」の観点でレビューしてください。
必ず含める観点: 仕様書に書くべきだが書かれていないもの（オンボーディング、チュートリアル、初回体験）、「意味がわからない」と感じる用語や概念。`,

  web_designer: `あなたはフリーランスのWebデザイナーで、モバイルWebアプリのデザイン経験が豊富です。以下のアプリ仕様書を全て読み、ビジュアルデザインの方向性、ブランドの一貫性、SVGアバターシステムの実現性、テーマ設計をレビューしてください。
特に注目: 「洗練」と「ゲーミフィケーション」の両立、アバターのSVGレイヤー合成のパフォーマンス、ダーク/ライトテーマ対応。
必ず含める観点: デザインシステムとして定義すべきだが未定義のもの（色、フォント、余白、アニメーション、アイコン体系）。`,

  app_ux_designer: `あなたはネイティブアプリのUXデザイナーで、iOS/Android両プラットフォームのHIG/Material Designに精通しています。以下のアプリ仕様書を全て読み、モバイルUXのベストプラクティスとの整合性、ジェスチャー設計、アクセシビリティをレビューしてください。
特に注目: ボトムタブ構成のプラットフォーム標準との整合、スクロール内インタラクション、プッシュ通知設計、ローディング/エラー状態。
必ず含める観点: モバイルUXとして未定義のもの（ジェスチャー、ハプティクス、スワイプ、Pull-to-refresh、スケルトン、空状態、エラー状態）、アクセシビリティ。`,

  // --- Design system review personas ---
  ui_designer: `あなたはモバイルアプリ専門のUIデザイナーで、デザインシステム設計経験が豊富です。以下のデザインシステム仕様書を全て読み、UIデザイントークン（カラー/タイポグラフィ/余白/コンポーネント）の完全性、一貫性、実装可能性をレビューしてください。
特に注目: トークン体系の網羅性（必要なトークンが定義されているか）、命名規則の一貫性、コンポーネント定義の過不足、各画面・状態（hover/active/disabled/focus）のカバー、テーマ切替時の破綻リスク。
必ず含める観点: 定義すべきだが未定義のトークン（ホバー色、無効色、シャドウ、z-index階層、フォーカスリング等）、曖昧な記述、矛盾する指定。`,

  frontend_engineer: `あなたはモバイルWebアプリ専門のフロントエンドエンジニアで、CSS custom propertiesを使ったテーマ切替システムの実装経験が豊富です。以下のデザインシステム仕様書を全て読み、CSSトークン構造の実装可能性、パフォーマンスへの影響、実装上の穴をレビューしてください。
特に注目: CSS構文エラー/破損、CSS変数の参照可能性、backdrop-filterのブラウザサポートとパフォーマンス、spring系cubic-bezierの破綻リスク、テーマ切替時のFOUC（Flash of Unstyled Content）、PWA/iOS Safariでの制約。
必ず含める観点: 実装時に発生する確実なバグ（構文エラー、未定義変数参照、ブラウザ非対応機能）、パフォーマンスリスク、実装ガイドラインの欠落（テーマ切替JSロジック、localStorageキー名、hydrationタイミング等）。`,

  a11y_expert: `あなたはWebアクセシビリティ専門家で、WCAG 2.2 AA準拠の実装監査経験が豊富です。以下のデザインシステム仕様書を全て読み、アクセシビリティ面の問題を網羅的にレビューしてください。
特に注目: 各テーマの前景/背景コントラスト比がWCAG AA（通常4.5:1/大文字3:1）を満たすか具体的に検証、フォーカスリングの定義、タップターゲット最小サイズ（44×44pt）、ハプティクスのアクセシビリティ設定尊重（prefers-reduced-motion対応）、カラーのみで情報伝達していないか、スクリーンリーダー対応。
必ず含める観点: 未定義のアクセシビリティトークン（focus-ring, prefers-reduced-motion代替, high-contrast対応）、コントラスト比の実測値、WCAG違反の具体箇所。`,

  brand_designer: `あなたはブランドアイデンティティ設計を専門とするデザイナーで、プロダクトのブランド体系構築経験が豊富です。以下のデザインシステム仕様書を全て読み、ブランドDNAの明確性、ブランド原則とデザイントークンの整合、テーマ間のブランド表現の一貫性をレビューしてください。
特に注目: §1ブランドDNAが§2-8の具体的トークン（色/フォント/余白/アニメーション）に実際に反映されているか、3テーマの性格差別化の明確性（色だけでなくトークン全体で性格が表現されているか）、NGリストがブランド原則に矛盾していないか、競合との差別化が視覚的に実現可能か。
必ず含める観点: ブランド定義と具体トークンの乖離、テーマ間の性格差が弱い箇所、言語化されているがトークンに落ちていない要素。`,

  // --- D. 実装レビュー personas (sub_review_flow.md D) ---
  code_reviewer: `あなたは経験豊富なコードレビュアーです。以下の実装パッケージ（ソース + スタイル + 仕様書引用）を全て読み、コード品質・可読性・DRY・エラーハンドリング・型安全性・保守性をレビューしてください。
特に注目: 命名規則、import パス、不要な再レンダリング、副作用の管理、props drilling、責務分離、dead code、魔法の数字。
必ず含める観点: このまま本番に出したら後日必ずバグを生むであろう箇所。CRITICALは「明らかなバグ」「データ破壊」「無限ループ」「クラッシュ」のみ。「命名が微妙」等は HIGH 以下。`,

  security_engineer: `あなたはWeb/モバイルアプリのセキュリティエンジニアで、OWASP Top 10 と CSP/CSRF/XSS/認証バイパスの実戦経験が豊富です。以下の実装パッケージを全て読み、セキュリティ観点でレビューしてください。
特に注目: XSS (dangerouslySetInnerHTML / innerHTML)、CSRF (state-changing endpoint)、認証バイパス、RLS 未設定、API キー/シークレットのクライアント露出、CORS 設定の緩さ、入力バリデーション漏れ、Open redirect。
必ず含める観点: セキュリティ脆弱性は CRITICAL。コードスタイル/ベストプラクティスは HIGH 以下。secret が含まれていないか grep レベルで確認。`,

  sw_debugger: `あなたはソフトウェアデバッグを専門とするエンジニアで、バグの根本原因特定・再現条件の網羅性を得意とします。以下の実装パッケージを全て読み、潜在バグ・エッジケース・副作用・デグレリスクをレビューしてください。
特に注目: 境界値（0/null/undefined/空配列/巨大値）、非同期の race condition、メモリリーク、エラーメッセージの品質、再現条件の曖昧さ、ログ不足、例外の握りつぶし。
必ず含める観点: 「動いているように見えるが特定条件で壊れる」箇所。デグレ検出のためのログ/テスト不足。`,

  performance_engineer: `あなたはフロントエンド/Worker のパフォーマンスエンジニアで、レンダリング性能・バンドルサイズ・メモリ管理の経験が豊富です。以下の実装パッケージを全て読み、パフォーマンス観点でレビューしてください。
特に注目: 不要な再レンダリング、バンドル肥大化（不要 import）、メモリリーク、N+1 クエリ、同期 I/O、キャッシュ戦略欠如、大きな DOM ツリー、unoptimized 画像、フォントロード、CSS パフォーマンス。
必ず含める観点: CRITICAL は「確実にユーザー体感を損なう」閾値未達のみ。「さらに最適化可能」は HIGH 以下。`,

  a11y_engineer: `あなたはWeb アクセシビリティエンジニアで、WCAG 2.2 AA 準拠の実装経験が豊富です。以下の実装パッケージを全て読み、アクセシビリティ観点でレビューしてください。
特に注目: キーボードナビゲーション、focus management、aria-label/role、スクリーンリーダー対応、色コントラスト（実測値）、prefers-reduced-motion 対応、セマンティック HTML（button vs div）、form ラベル対応、画像 alt。
必ず含める観点: WCAG AA 非準拠箇所は CRITICAL。タップターゲット 44×44 未満、focus ring 不在、色のみで情報伝達も CRITICAL。`,

  spec_compliance: `あなたは仕様準拠の検証を専門とするエンジニアです。以下の実装パッケージには「design_spec_v1.md §4.1」等の仕様書引用が含まれます。実装と引用セクションの整合性を厳密にレビューしてください。
特に注目: 色値（トークン名で参照しているか）、フォントサイズ（離散スケールから外れていないか）、余白（トークン使用）、要素の配置（座標）、状態別スタイル、画面遷移の整合。
必ず含める観点: 実装が仕様と矛盾する箇所は CRITICAL。仕様にあって実装にない要素も CRITICAL。仕様にない追加要素は HIGH（仕様外追加として報告）。`,

  edge_case_hunter: `あなたはエッジケースハンティングを専門とする QA エンジニアです。以下の実装パッケージを全て読み、異常系・境界値・特殊状態でのバグを探してください。
特に注目: オフライン、ネットワーク遅延、同時操作、タイムアウト、リトライ、空状態、大量データ、非 ASCII 文字、長文、縦横回転、視差スクロール、ブラウザズーム、reduced-motion。
必ず含める観点: 本書がカバーしていないエッジケース。実装で考慮漏れしている状態。`,
};

const JSON_INSTRUCTION = `
【重要：出力フォーマット】
必ず **JSON配列のみ** を出力してください。コードフェンス（\`\`\`）や前置き文・導入文・解説文は一切不要です。最初の文字は [、最後の文字は ] とすること。

各項目: {"id":"R-NNN","severity":"CRITICAL|HIGH|MEDIUM|LOW","category":"MISSING|UNDEFINED|AMBIGUITY|CONTRADICTION|FEASIBILITY|BEST_PRACTICE|STRUCTURE|USER_CONCERN","location":"セクション番号","issue":"問題の具体記述（100-300字）","suggestion":"修正提案（100-300字）"}
5つのフィールド（severity / category / location / issue / suggestion）は全て必須。

**必ず配列として5-10件出力してください**（1件のみは不十分と扱われ、出力抑制パターンとして再実行対象になります）。

severity inflation を避けること。CRITICAL は「このまま実装に進むと確実に障害・矛盾・データ損失が発生する」または「仕様として根本的に破綻しており実装不能」の場合のみ。「あった方がよい」「ベストプラクティスから外れる」は HIGH 以下。`;

// --- API Callers ---
function httpRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 500)}`));
        } else {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

// --- v3.5 Phase 3: モデル単価テーブル（USD per 1K tokens、概算値）---
// sub_external_review_protocol §3.3 ガードレール（Phase 3 LOW V35-P2-S2-04 解消、コストハードコード動的算出化）
// 出典: 2026-04 時点 OpenAI / Google 公開価格を反映、変動時は本テーブル更新で対応。
//       postcommit.sh の $0.15 固定 fallback は維持（cost_usd 取得失敗時の安全側挙動）。
const MODEL_PRICES = {
  // GPT-5.4: 入力 $1.25/1M = $0.00125/1K, 出力 $10.00/1M = $0.01000/1K（概算）
  'gpt-5.4':  { input_per_1k: 0.00125, output_per_1k: 0.01000 },
  'gpt-5':    { input_per_1k: 0.00125, output_per_1k: 0.01000 },
  // Gemini 3.1 Pro Preview: 入力 $1.25/1M = $0.00125/1K, 出力 $5.00/1M = $0.00500/1K（概算）
  'gemini-3.1-pro-preview': { input_per_1k: 0.00125, output_per_1k: 0.00500 },
};

function computeCostUsd(modelId, inputTokens, outputTokens) {
  const price = MODEL_PRICES[modelId];
  if (!price) return 0;
  const inT = Number(inputTokens) || 0;
  const outT = Number(outputTokens) || 0;
  const cost = (inT / 1000) * price.input_per_1k + (outT / 1000) * price.output_per_1k;
  return Math.round(cost * 10000) / 10000; // 小数 4 桁
}

async function callGemini(apiKey, systemPrompt, specContent, timeout) {
  const model = 'gemini-3.1-pro-preview';
  const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`);
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: specContent }] }],
    generationConfig: { maxOutputTokens: 16384, temperature: 0.3 },
  });
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    timeout,
  };
  const raw = await httpRequest(url, options, body);
  const data = JSON.parse(raw);
  const text = data.candidates?.[0]?.content?.parts?.filter(p => p.text).map(p => p.text).join('') || '';
  // v3.5 Phase 3: usage capture（usageMetadata は Gemini API の標準フィールド）
  const usage = data.usageMetadata || {};
  return {
    text,
    inputTokens: usage.promptTokenCount || 0,
    outputTokens: usage.candidatesTokenCount || 0,
    modelId: model,
  };
}

async function callGPT5(apiKey, systemPrompt, specContent, maxTokens, timeout, modelId = 'gpt-5') {
  const url = new URL('https://api.openai.com/v1/chat/completions');
  const payload = {
    model: modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: specContent },
    ],
    max_completion_tokens: maxTokens,
  };
  // GPT-5.4: response_format: json_object を付けると単一オブジェクト返却として解釈され出力抑制が起きる（R2.1.1 §5.1）
  // GPT-5: 従来通り json_object を指定して JSON 妥当性を担保。プロンプトの「JSON 配列のみ」指示は
  //         OpenAI API 側で {"items":[...]} のような wrapper オブジェクトに自動変換され、extractJson 関数で
  //         配列部分のみを抽出することで吸収される（運用上問題なし、v3.5 Phase 1-3 で実証）
  if (modelId !== 'gpt-5.4') {
    payload.response_format = { type: 'json_object' };
  }
  const body = JSON.stringify(payload);
  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    timeout,
  };
  const raw = await httpRequest(url, options, body);
  const data = JSON.parse(raw);
  const text = data.choices?.[0]?.message?.content || '';
  // v3.5 Phase 3: usage capture（OpenAI API の usage は input_tokens / output_tokens / total_tokens を返却）
  const usage = data.usage || {};
  return {
    text,
    inputTokens: usage.prompt_tokens || usage.input_tokens || 0,
    outputTokens: usage.completion_tokens || usage.output_tokens || 0,
    modelId,
  };
}

// --- JSON Extraction ---
function extractJson(text) {
  // Try ```json ... ``` blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1]); } catch {}
  }
  // Try outermost [ ... ]
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0]); } catch {
      // Try to fix truncated array
      const raw = arrayMatch[0].trimEnd();
      const lastComplete = raw.lastIndexOf('},');
      if (lastComplete > 0) {
        try { return JSON.parse(raw.slice(0, lastComplete + 1) + ']'); } catch {}
      }
    }
  }
  // Whole text (may be a JSON object wrapping an array, e.g. {"items": [...]})
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    const arrKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
    if (arrKey) return parsed[arrKey];
    return [parsed];
  } catch {}

  console.error('  WARNING: Could not parse JSON from response');
  return [{ id: 'PARSE-ERROR', severity: 'HIGH', category: 'STRUCTURE',
    location: 'N/A', issue: 'Response could not be parsed as JSON',
    suggestion: 'Re-run review', raw_response: text.slice(0, 500) }];
}

// --- Retry wrapper ---
async function withRetry(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      console.error(`  Attempt ${i + 1} failed: ${e.message}`);
      if (i < retries - 1) await new Promise(r => setTimeout(r, 5000 * (i + 1)));
    }
  }
  throw new Error(`Failed after ${retries} attempts`);
}

// --- v3.5 Phase 1: pre-commit モード実装（sub_external_review_protocol §3） ---
// git diff --cached の内容を specContent として使用し、GPT-5.4 + Gemini の 2 本を
// `lais/verify/external_review/{YYYY-MM-DD}T{HH-MM-SS}Z_{provider}.json` に書込。
// sync モード: CRITICAL 検出で exit 1（commit ブロック）。async モード: fire-and-forget。
async function runPrecommitMode(opts, env) {
  const { execSync } = require('child_process');

  const repoRoot = (() => {
    try {
      return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
    } catch {
      return process.cwd();
    }
  })();

  let diffContent = '';
  try {
    diffContent = execSync('git diff --cached --no-color', { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  } catch (e) {
    console.error(`ai_review precommit: git diff --cached 失敗: ${e.message}`);
    process.exit(0); // 失敗時は commit ブロックせず通す（fail-safe）
  }

  if (!diffContent.trim()) {
    console.log('ai_review precommit: staged diff なし、skip');
    process.exit(0);
  }

  // 出力先
  const outputDir = path.join(repoRoot, 'lais/verify/external_review');
  fs.mkdirSync(outputDir, { recursive: true });

  // タイムスタンプ（ISO8601 compatible for filesystem）
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}T${pad(now.getUTCHours())}-${pad(now.getUTCMinutes())}-${pad(now.getUTCSeconds())}Z`;

  // Precommit では code_reviewer ペルソナ単一で GPT-5.4 + Gemini の 2 本
  const precommitPersona = 'code_reviewer';
  const precommitPrompt = PERSONA_BASE[precommitPersona] + '\n' + JSON_INSTRUCTION;
  const precommitContent = `# Pre-commit staged diff\n\n\`\`\`diff\n${diffContent}\n\`\`\``;

  const providers = [
    { id: 'gpt5', label: 'GPT-5.4', call: () => callGPT5(env.OPENAI_API_KEY, precommitPrompt, precommitContent, opts.maxTokens, opts.timeout, 'gpt-5.4') },
    { id: 'gemini', label: 'Gemini 3.1 Pro', call: () => callGemini(env.GEMINI_API_KEY, precommitPrompt, precommitContent, opts.timeout) },
  ];

  const results = await Promise.all(providers.map(async (p) => {
    const outFile = path.join(outputDir, `${ts}_${p.id}.json`);
    try {
      const resp = await withRetry(p.call, 2);
      // 後方互換: 旧形式（string 直返）と新形式（{text, inputTokens, outputTokens, modelId}）両対応
      const rawText = (typeof resp === 'string') ? resp : (resp && resp.text) || '';
      const usage = (typeof resp === 'string') ? {} : (resp || {});
      const items = extractJson(rawText);
      for (const it of items) {
        it.model = p.label;
        it.persona = precommitPersona;
      }
      // v3.5 Phase 3 LOW V35-P2-S2-04 解消: cost_usd を _metadata エントリとして配列に追加
      // postcommit.sh は severity 欠落エントリを findings 集計対象外として扱う（_metadata の構造は items 集計を阻害しない）
      const inputTokens = Number(usage.inputTokens) || 0;
      const outputTokens = Number(usage.outputTokens) || 0;
      const modelIdForCost = usage.modelId || (p.id === 'gemini' ? 'gemini-3.1-pro-preview' : 'gpt-5.4');
      const costUsd = computeCostUsd(modelIdForCost, inputTokens, outputTokens);
      items.push({
        id: '_metadata',
        model: p.label,
        cost_usd: costUsd,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        model_id: modelIdForCost,
      });
      fs.writeFileSync(outFile, JSON.stringify(items, null, 2));
      const crit = items.filter(x => x.severity === 'CRITICAL').length;
      console.log(`ai_review precommit: ${p.label} → ${items.length} items (CRITICAL ${crit}, cost=$${costUsd}) → ${outFile}`);
      return { provider: p.id, ok: true, critical: crit, items, costUsd };
    } catch (e) {
      console.error(`ai_review precommit: ${p.label} 呼出し失敗: ${e.message}`);
      fs.writeFileSync(outFile, JSON.stringify([{ id: 'ERROR', severity: 'HIGH', category: 'STRUCTURE', location: 'N/A', issue: `Precommit review failed: ${e.message}`, suggestion: 'Re-run' }], null, 2));
      return { provider: p.id, ok: false, critical: 0, items: [], costUsd: 0 };
    }
  }));

  const totalCritical = results.reduce((acc, r) => acc + (r.critical || 0), 0);

  if (opts.sync && totalCritical > 0) {
    console.error(`ai_review precommit: CRITICAL ${totalCritical} 件検出、commit ブロック`);
    process.exit(1);
  }
  process.exit(0);
}

// --- PD-112 §2.25.23 vote mode -------------------------------------------
// 単一プロバイダ（gpt5 or gemini）に「FOR / AGAINST / ABSTAIN」のみ出力させる。
// 失敗時は ABSTAIN 出力 + exit 0（保守側、guardrail 不発で fallback 経路に切替させない）。
async function runVoteMode(opts, env) {
  if (!opts.provider) {
    console.log('ABSTAIN');
    process.exit(0);
  }
  if (!opts.proposal) {
    console.log('ABSTAIN');
    process.exit(0);
  }

  const VOTE_PROMPT = `あなたは外部レビュアーとして、ADV (PO 補佐) からの提案について「PO への承認質問が必要か / ADV 自律で実行可能か」を判定する立場です。

判定基準:
- FOR: ADV 自律で実行可能（コスト影響軽微 / 既存仕様準拠 / 副作用限定）
- AGAINST: PO 承認取得が必要（コスト影響大 / 新プロセス / ブランド変更 / データスキーマ変更 / 外部依存追加）
- ABSTAIN: 判断保留（情報不足 / 専門外）

【出力フォーマット】
必ず "FOR" / "AGAINST" / "ABSTAIN" のいずれか 1 単語のみ大文字英字で出力。
他の文字（解説 / 句読点 / 改行以外の空白）は一切出力禁止。`;

  const userContent = `# 提案テキスト\n\n${opts.proposal}`;
  const provider = opts.provider;

  try {
    let resp;
    if (provider === 'gpt5') {
      resp = await withRetry(() => callGPT5(env.OPENAI_API_KEY, VOTE_PROMPT, userContent, 64, opts.timeout, 'gpt-5.4'), 1);
    } else if (provider === 'gemini') {
      resp = await withRetry(() => callGemini(env.GEMINI_API_KEY, VOTE_PROMPT, userContent, opts.timeout), 1);
    } else {
      console.log('ABSTAIN');
      process.exit(0);
    }
    const text = (typeof resp === 'string') ? resp : (resp && resp.text) || '';
    const m = text.toUpperCase().match(/\b(FOR|AGAINST|ABSTAIN)\b/);
    const verdict = m ? m[1] : 'ABSTAIN';
    console.log(verdict);
    process.exit(0);
  } catch (e) {
    console.error(`ai_review vote(${provider}): 失敗 ${e.message}`);
    console.log('ABSTAIN');
    process.exit(0);
  }
}

// --- Main ---
async function main() {
  const opts = parseArgs();
  const env = loadEnv();

  if (!env.GEMINI_API_KEY || !env.OPENAI_API_KEY) {
    console.error('ERROR: Missing GEMINI_API_KEY or OPENAI_API_KEY in .dev.vars');
    process.exit(1);
  }

  // v3.5 Phase 1: pre-commit モード分岐
  if (opts.mode === 'precommit') {
    await runPrecommitMode(opts, env);
    return;
  }

  // PD-112 §2.25.23 vote mode 分岐
  if (opts.mode === 'vote') {
    await runVoteMode(opts, env);
    return;
  }

  // Resolve input files
  const files = resolveFiles(opts.input);
  if (files.length === 0) {
    console.error('ERROR: No input files found');
    process.exit(1);
  }
  console.log(`Input files: ${files.join(', ')}`);

  const specContent = readSpecs(files);
  console.log(`Spec content: ${specContent.length} chars`);

  // Load context
  let context = opts.context;
  if (opts.contextFile && fs.existsSync(opts.contextFile)) {
    context = fs.readFileSync(opts.contextFile, 'utf8');
  }
  if (opts.contextFiles) {
    const parts = opts.contextFiles.split(',').map(f => f.trim()).filter(Boolean);
    const loaded = parts.map(f => {
      if (!fs.existsSync(f)) { console.error(`  WARNING: context file not found: ${f}`); return ''; }
      return `--- ${path.basename(f)} ---\n${fs.readFileSync(f, 'utf8')}`;
    }).filter(Boolean);
    context = (context ? context + '\n\n' : '') + loaded.join('\n\n');
  }

  // Parse models and personas
  const models = opts.models.split(',').map(m => m.trim());
  const personas = opts.personas.split(',').map(p => p.trim());

  // Model callers
  const modelCallers = {
    gemini: (prompt, content) => callGemini(env.GEMINI_API_KEY, prompt, content, opts.timeout),
    gpt5: (prompt, content) => callGPT5(env.OPENAI_API_KEY, prompt, content, opts.maxTokens, opts.timeout, 'gpt-5'),
    gpt54: (prompt, content) => callGPT5(env.OPENAI_API_KEY, prompt, content, opts.maxTokens, opts.timeout, 'gpt-5.4'),
  };

  const modelNames = { gemini: 'Gemini 3.1 Pro Preview', gpt5: 'GPT-5', gpt54: 'GPT-5.4' };
  const allResults = {};
  let totalCritical = 0;
  let totalHigh = 0;
  let totalItems = 0;

  // Build job list
  const jobs = [];
  for (const persona of personas) {
    const basePrompt = PERSONA_BASE[persona];
    if (!basePrompt) { console.error(`Unknown persona: ${persona}`); continue; }
    const fullPrompt = basePrompt + (context ? '\n\n' + context : '') + '\n' + JSON_INSTRUCTION;
    for (const model of models) {
      const caller = modelCallers[model];
      if (!caller) { console.error(`Unknown model: ${model}`); continue; }
      jobs.push({ persona, model, caller, fullPrompt });
    }
  }

  async function runJob({ persona, model, caller, fullPrompt }) {
    const outputFile = `${opts.prefix}_${model}_${persona}.json`;
    const outputPath = path.join(opts.output, outputFile);
    const label = `${modelNames[model] || model} × ${persona}`;

    console.log(`  [START] ${label}`);

    if (opts.dryRun) {
      console.log(`  [DRY RUN] ${label}: prompt ${fullPrompt.length} chars`);
      return;
    }

    try {
      const resp = await withRetry(() => caller(fullPrompt, specContent));
      // 後方互換: 旧形式（string）と新形式（{text,...}）両対応
      const rawResponse = (typeof resp === 'string') ? resp : (resp && resp.text) || '';
      const usage = (typeof resp === 'string') ? {} : (resp || {});
      const results = extractJson(rawResponse);

      for (const item of results) {
        item.model = modelNames[model] || model;
        item.persona = persona;
      }
      // v3.5 Phase 3 LOW V35-P2-S2-04 解消: cost_usd を _metadata エントリとして追加
      const inputTokens = Number(usage.inputTokens) || 0;
      const outputTokens = Number(usage.outputTokens) || 0;
      const modelIdForCost = usage.modelId || model;
      const costUsd = computeCostUsd(modelIdForCost, inputTokens, outputTokens);
      results.push({
        id: '_metadata',
        model: modelNames[model] || model,
        cost_usd: costUsd,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        model_id: modelIdForCost,
      });
      fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

      const sevs = {};
      for (const item of results) {
        const s = item.severity || '?';
        sevs[s] = (sevs[s] || 0) + 1;
        totalItems++;
        if (s === 'CRITICAL') totalCritical++;
        else if (s === 'HIGH') totalHigh++;
      }

      console.log(`  [DONE] ${label}: ${results.length} items ${JSON.stringify(sevs)} cost=$${costUsd}`);
      allResults[`${model}_${persona}`] = results;

    } catch (e) {
      console.error(`  [FAIL] ${label}: ${e.message}`);
      const errResult = [{ id: 'ERROR', severity: 'HIGH', category: 'STRUCTURE',
        location: 'N/A', issue: `Review failed: ${e.message}`, suggestion: 'Re-run review' }];
      fs.writeFileSync(outputPath, JSON.stringify(errResult, null, 2));
    }
  }

  // Execute: parallel or sequential
  if (opts.parallel) {
    console.log(`\nRunning ${jobs.length} reviews in parallel...`);
    await Promise.all(jobs.map(runJob));
  } else {
    for (const job of jobs) {
      console.log(`\n${'='.repeat(60)}`);
      await runJob(job);
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log(`Total items: ${totalItems}`);
  console.log(`CRITICAL: ${totalCritical}`);
  console.log(`HIGH: ${totalHigh}`);
  console.log(`Files generated: ${Object.keys(allResults).length}/${models.length * personas.length}`);

  if (totalCritical > 0) {
    console.log(`\nCRITICAL items:`);
    for (const [key, results] of Object.entries(allResults)) {
      for (const item of results) {
        if (item.severity === 'CRITICAL') {
          console.log(`  [${item.id}] ${item.location}: ${item.issue.slice(0, 150)}`);
        }
      }
    }
    process.exit(1);
  } else {
    console.log(`\nNo CRITICAL items. Review passed.`);
    process.exit(0);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
