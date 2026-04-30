#!/usr/bin/env node
/**
 * design_review.js — 画像ベースのデザインモックアップレビュー
 *
 * 参照: docs/plans/dev_system_spec.md §19.10
 *
 * Usage:
 *   node scripts/design_review.js [--phase a] [--round 1] [--models gemini,gpt5] [--parallel]
 *
 * 入力: docs/mockups/screenshots/*.png + design_system.md + ux_v1.md
 * 出力: docs/plans/review_designmockup_{phase}_r{N}_{model}_{persona}.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    phase: 'a',
    round: 1,
    models: 'gemini,gpt5',
    personas: 'web_designer,artist,ad_designer,manga_cover,illustrator,color_coordinator',
    screenshotDir: 'docs/mockups/screenshots',
    designSystem: 'docs/plans/lais_design_system.md',
    uxSpec: 'docs/plans/lais_ux_v1.md',
    output: 'docs/plans/',
    timeout: 600000,
    maxTokens: 32768,
    parallel: false,
    dryRun: false,
    personaOnly: '',
    modelOnly: '',
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--phase') opts.phase = args[++i];
    else if (a === '--round') opts.round = parseInt(args[++i]);
    else if (a === '--models') opts.models = args[++i];
    else if (a === '--personas') opts.personas = args[++i];
    else if (a === '--persona-only') opts.personaOnly = args[++i];
    else if (a === '--model-only') opts.modelOnly = args[++i];
    else if (a === '--parallel') opts.parallel = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--timeout') opts.timeout = parseInt(args[++i]);
    else { console.error(`Unknown: ${a}`); process.exit(1); }
  }
  return opts;
}

function loadEnv() {
  const envPath = path.join(process.cwd(), '.dev.vars');
  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (t && !t.startsWith('#') && t.includes('=')) {
      const [k, ...v] = t.split('=');
      env[k.trim()] = v.join('=').trim();
    }
  }
  return env;
}

const PERSONAS = {
  web_designer: `あなたはモバイルWebアプリ専門のベテランWebデザイナーです。UI/UX、ユーザビリティ、情報設計、視覚階層の観点で、提示された画面スクリーンショット群をレビューしてください。
特に注目: タップターゲットの明確性、重要情報の優先順位、画面内の情報密度、ナビゲーションの直感性、ブランドDNA（Night Sky Journal）との整合性。`,

  artist: `あなたは現代アートに精通したアーティストです。構図・視覚的緊張感・独自性・感情の喚起力の観点で、提示された画面スクリーンショット群をレビューしてください。
特に注目: 画面全体の構図バランス、余白の使い方が「設計された沈黙」として機能しているか、ありきたりなAI生成デザインのパターンに陥っていないか、独自の視覚的個性が立っているか。`,

  ad_designer: `あなたは広告代理店のシニア広告デザイナーです。第一印象・訴求力・視線誘導・CTA導線の観点で、提示された画面スクリーンショット群をレビューしてください。
特に注目: 初めてこの画面を見た人が3秒以内に「何ができるアプリか」理解できるか、主要CTAが視覚的に際立っているか、次のアクションへの導線が明確か。`,

  manga_cover: `あなたは日本の漫画表紙デザインを多数手掛けるグラフィックデザイナーです。視線誘導・タイポグラフィ・余白のリズム・黒と白（明暗）のコントラスト演出の観点で、提示された画面スクリーンショット群をレビューしてください。
特に注目: 日本語タイポグラフィの可読性と品格、視線がZ/N字にスムーズに流れるか、余白が「間」として機能しているか、タイトル文字と本文のコントラスト設計。`,

  illustrator: `あなたはフリーランスのイラストレーターで、カラーパレット設計と感情表現に強みがあります。カラーハーモニー・空間表現・感情訴求の観点で、提示された画面スクリーンショット群をレビューしてください。
特に注目: 色の組み合わせが調和しているか、夜空のジャーナルというブランドトーンが色で表現できているか、色の感情的な影響（安心/緊張/喜び）が意図通りに設計されているか。`,

  color_coordinator: `あなたは色彩心理学とWCAG 2.2 AA準拠監査の専門家です。WCAG準拠・テーマ間整合性・色彩心理の観点で、提示された画面スクリーンショット群をレビューしてください。
特に注目: 前景/背景のコントラスト比が通常テキスト4.5:1、大文字3:1を満たすか、カラーだけで情報を伝達していないか、フォーカス状態の視認性、色盲配慮。`,
};

const SCREENS = [
  's00_splash', 's01_signin', 's02_onboarding',
  's10_grow', 's20_talk', 's30_me',
  's12_task_add', 's13_task_detail',
  's14_goal_detail', 's15_goal_create'
];

// §19.10 B-4: ステージスコープ定義（モックアップ）
const STAGE_SCOPE = `
## 本レビューのステージ: モックアップ（Phase A）

あなたは「モックアップステージ」のレビューを実施します。以下のIN項目のみを評価してください。OUT項目は本ステージの評価対象外です。OUT項目に該当する指摘は絶対に出さないでください。

### IN（評価対象・ここだけを見る）
- 色値（design_system.mdトークンとの一致/乖離。HEX直指定）
- タイポグラフィ（font-size, font-weight, letter-spacing, line-height。静的スタイルとして読み取れるもの）
- レイアウト/余白/整列（要素配置、間隔、セクション区切り）
- ブランドDNA（Night Sky Journal のトーン、NGリスト違反）
- UX仕様整合（UX仕様書に定義された要素の有無・順序・文言）
- 情報設計・視線誘導・情報密度
- テキストコントラスト（色値ベースで計算可能なもののみ。前景HEX vs 背景HEX）

### OUT（評価対象外・指摘しない）
- フォーカスリング（:focus スタイル、outline、キーボード操作、2.4.7 関連）
- タップターゲット44x44px（2.5.5、ポインタターゲット、静的画像から確定できないもの）
- キーボードアクセシビリティ全般
- スクリーンリーダー対応/ARIA/セマンティクス
- JavaScript動的挙動、ホバー、アクティブ、プレス状態
- ::before/::after 疑似要素の効果、動的アニメーション
- WCAG 非テキストコントラスト（1.4.11）のうちボタン境界線・アイコン輪郭・プログレスバー等
- 色のみ伝達（1.4.1）— 静的モックアップでは下線の有無は実装時調整事項
- パフォーマンス、バンドルサイズ、レンダリング速度

**OUT項目の指摘は禁止です。それらは実装ステージで評価されます。**
`;

// §19.10 B-6: 累積コンテキスト（修正済み + PO決定済み + 棄却検証済み）
const CUMULATIVE_CONTEXT = `
## 累積コンテキスト（v1_r1 → v2_r6 までに処理済みの項目）

### A. 修正済みリスト（ADVが既に修正完了。再指摘しないこと）
以下はv1_r1 → v2_r6の各ラウンドでADVがモックアップHTMLを修正済みの項目です。モックアップ上で既に反映されています。

**v1_r1→r2 (B群 13件):**
1. s13 完了時「進め方を聞く/詰まりを相談」を disabled 化
2. s30_me 設定リンク ⚙️ を追加
3. s14_goal_detail AI相談導線を追加
4. s20_talk 提案カードに ✕ (拒否) ボタン追加
5. s12_task_add 所要時間チップを 5/10/15/30/45/60/90/120（8種）に
6. s12_task_add 入力配置順を「開始時刻→所要時間→予定日」縦並びに
7. s10_grow タスク行を1行構成 [完了][時刻][タスク名][時間][ゴール色ドット] に
8. s10_grow ゴール色ドットを青/オレンジに（success緑との衝突解消）
9. s02_onboarding アバター衣装を muted 化（原色排除）
10. s00_splash ロゴ Lais を font-weight:600 に
11. s14_goal_detail 60% 巨大数字（Phase B 3パターン吸収予定）
12. s20_talk 「タスクにしますか？」見出しを グレー化（リンク風解消）
13. s30_me AI理解メモ line-height を --line-height-ja-body:1.7 に

**v1_r3→r4 (B'群 4件):**
14. s01_signin ロゴ Lais を font-weight:600 太字化（修正漏れ解消）
15. s12_task_add 所要時間チップを横スクロール化
16. s20_talk 入力バー左アイコンを + → 📎 クリップに変更
17. s20_talk ヘッダー右に 🕐履歴 + 📝新規 の2アイコンを配置

**v2_r1→r2 (B群v2 5件):**
18. s10_grow タスク間余白 4px → 8px
19. s10_grow EXP 1,240/2,000 を font-size:11px（10px違反解消）
20. s13_task_detail ハーフモーダルに ✕ボタン右上追加
21. s02_onboarding 戻るボタンを左上 < に配置
22. s20_talk タイムスタンプを 11px（10px違反解消）

**v2_r2→r3 (B"'群 4件):**
23. s10_grow タスク左ボーダーを #D29922(warning) → #E8A855(amber 進行中) に変更
24. s12_task_add / s15_goal_create ハーフモーダル右上に ✕ボタン追加
25. s20_talk 提案カード二次ボタン文言を「編集」→「編集して登録」
26. design_system §4.2 余白定義を「アイテム間≧8px、セクション間≧32px」に改定

**v2_r7→r8 (新ルール適用後機械修正 Group H/I/J/K/L/M/N/O 20件):**
27. s13_task_detail 完了ステータス色を #56D364 → #3FB950 (--success 準拠)
28. s13_task_detail 削除ボタン色を #FF7B72 → #F85149 / rgba(255,123,114,0.5) → rgba(248,81,73,0.5) (--danger 準拠)
29. s10_grow カテゴリドット紫 #A371F7 → #A5D6FF (--accent-hover 準拠、DSトークン内)
30. s10_grow progress bar bg 全 rgba(121,192,255,0.18) → rgba(121,192,255,0.14) (--accent-subtle 準拠)
31. s20_talk AI応答ボーダー rgba(121,192,255,0.25) → rgba(121,192,255,0.14)
32. s20_talk ユーザーバブル bg rgba(121,192,255,0.08) → rgba(121,192,255,0.14) (--accent-subtle 準拠)
33. s12_task_add フィールド順を UX §2.3 準拠に「開始時刻→所要時間→予定日」縦並び3行構成に修正
34. s01_signin サインアップボタンを #1C2128+#9BA7B4 → #1A5FC8+#FFFFFF (--button-primary-bg/--button-primary-fg 準拠)
35. s01_signin インラインリンク「ログイン」に text-decoration:underline 追加
36. s02_onboarding 未完了ステップ背景 #6E7681 → #484F58 (--border 準拠)
37. s02_onboarding タイトル font-size 24px → 28px (--font-size-xl 離散スケール準拠)
38. ALL 全10画面 font-size 13px → 14px に統一 (--font-size-sm 離散スケール準拠)
39. ALL 全10画面 font-size 15px → 14px に統一 (--font-size-sm 離散スケール準拠)
40. ALL 全10画面 font-size 18px → 20px に統一 (--font-size-lg 離散スケール準拠)
41. ALL 全10画面 font-size 22px → 20px に統一 (--font-size-lg 離散スケール準拠)

**v2_r8→r9 (追加機械修正 9件):**
42. ALL 全10画面 font-size 12px → 11px に統一 (--font-size-xs 離散スケール準拠)。DS §3.2に12pxトークンは存在しない
43. s02_onboarding / s10_grow / s12_task_add / s14_goal_detail タイトル font-weight:200 → 400 (§3.3 Thin 200 は font-size-2xl 36px 以上限定)
44. s14_goal_detail / s30_me progress bar bg 残存 rgba(121,192,255,0.18) → 0.14 (--accent-subtle 準拠)
45. s10_grow 成功状態 rgba(63,185,80,0.06) → 0.12 (--success-subtle 準拠) / rgba(63,185,80,0.2) → 0.18 (--success-subtle-hover 準拠)
46. s13_task_detail 削除ボタンを subtle から solid に変更: background:#DA3633 + color:#FFFFFF (--button-danger-bg + --button-danger-fg 準拠)。旧 #F85149 × #161B22 コントラスト 4.19:1 (<4.5 AA) → 新 #FFFFFF × #DA3633 5.35:1 (AA準拠)

**v2_r9→r10 (追加機械修正 6件):**
47. s00_splash / s01_signin ロゴ Lais font-weight:200 → 600 + color:#79C0FF 追加 (DS §1.3 「ロゴの色=--accent」準拠 + §3.3 weight 200 は size-2xl 36px 以上限定)
48. s02_onboarding「次へ」ボタン + s30_me PROFILE タブ font-weight:500 → 600 (DS §3.3 許容値 200/400/600 のみ)
49. s13_task_detail 完了タスクの AI相談ボタン (進め方を聞く/詰まりを相談) を disabled スタイルに変更: bg rgba(121,192,255,0.14) → #1C2128 (--bg-disabled) / color #79C0FF → #484F58 (--text-disabled)
50. s10_grow 完了タスクアイコン内側 bg rgba(63,185,80,0.18) (hover) → 0.12 (--success-subtle 正常状態)
51. s14_goal_detail 削除ボタンを subtle → solid (s13 と同様): bg #DA3633 + color #FFFFFF。コントラスト 5.35:1 (AA準拠)
52. s14_goal_detail 削除ボタン border rgba(248,81,73,0.3) → #DA3633 (solid と統一)

**v2_r10→r11 (追加機械修正 7件 + PO escalation 3件保留):**
53. ALL 区切り線 border rgba(72,79,88,0.2〜0.4) / rgba(110,118,129,0.4) → #484F58 (--border) / #6E7681 (--border-strong) 直置換 (s13/s14/s20/s30 計13箇所)
54. s10_grow / s30_me セクション間マージン 28px → 32px (DS §4.2「セクション間 ≧32px」準拠)
55. s10_grow タスク上部余白 padding:20px 0 28px → 20px 0 32px
56. s12_task_add 「種別」ラベル（font-size:11px,color:#7A8593）を 単発/習慣 チップ上に追加 (UX §2.3 要素順準拠)
57. s30_me ヒーロー EXPバー height:3px → 4px (UX §4.1「GROW 同一」準拠)
58. s10_grow Explorer 字間 letter-spacing:1px → 1.5px (DS §3.3 --letter-spacing-label 準拠)
59. s30_me 英字タブラベル (PROFILE/DISCOVER/FRIENDS/SHOP) + Lv.12 EXPLORER 字間 0.5px/1px → 1.5px

**PO エスカレーション保留 (ADV 判断要): v2_r10 spec-gap CRITICAL 3件**
ESC-1. s10_grow Upcoming タスク section 欠落 (UX §2.3 要求) — 現在 Today のみ表示。構成追加は ADV 領域
ESC-2. s10_grow Overdue タスク section 欠落 (UX §2.3 要求) — モックアップに overdue 状態なし。状態別デザイン要追加
ESC-3. s30_me MBTI カード欠落 (UX §4.2 要求) — プロフィール構成要素の追加は ADV 領域

### B. PO決定済みリスト（PO判断で意図的に維持。再指摘しないこと）
POが設計上意図して採用した項目です。「矛盾」「違反」と指摘しても POは修正しません。

- **s10_grow タスク行の時刻左列レイアウト**（UX§2.3の1行構成とは別軸。PO選択結果）
- **s14_goal_detail 60% 巨大数字**（ヒーローメトリクス。Phase B 3パターンで独自性吸収予定）
- **s13_task_detail 完了時「進め方を聞く/詰まりを相談」が disabled 表示**（情報提示として存在を示す意図）
- **s00_splash の星屑モチーフ**（Phase B 独自性吸収候補。Phase A はコンセプト確定段階）
- **s20_talk AI応答を左ボーダーのみで表現**（バブル塗り潰しを使わない Open Air 原則）
- **コア10画面のコンセプト確定が Phase A の目的**。独自性/イラスト言語の深化は Phase B 担当
- **design_system §4.2 の余白基準はアイテム間≧8px、セクション間≧32px**（改定済み。旧20px/40px基準は参照しない）

### C. 棄却検証済みリスト（B-3で処理済み。再指摘しないこと）
v2_r6 Rebuttal（STAND 45/WAIVE 5/DOWNGRADE 4）で WAIVE/DOWNGRADE 判定済みの系統:
- 一部のコントラスト色 #484F58 指摘（WAIVE_IMPL: 実装時トークン調整で対応）
- タップターゲット44px系（WAIVE: 実装時 padding 拡大で対応、本ステージOUT）

**重要:** 上記A/B/Cに該当する項目を CRITICAL/HIGH で再指摘した場合、そのレビューは「累積コンテキスト違反」として無効とみなされます。新規の観点のみを指摘してください。
`;

const JSON_INSTRUCTION = `
結果は必ずJSON配列のみを返してください（前置き・後置き・説明文なし）。各項目:
{"id":"R-NNN","severity":"CRITICAL|HIGH|MEDIUM|LOW","category":"BRAND_DNA|UX_CONTRADICTION|DESIGN_SYSTEM|TEXT_CONTRAST|ORIGINALITY|INFO_DENSITY|VISUAL_FLOW|TYPOGRAPHY|COLOR|LAYOUT|OTHER","screen":"s00_splash など該当画面ID、全体ならALL","location":"画面内の具体位置","issue":"問題の具体内容","suggestion":"改善提案"}

## §19.10 B-7 モックアップステージのCRITICAL定義（厳守）
CRITICALは以下のみに限定してください:
- ブランドDNA違反（Night Sky Journal トーン逸脱、NGリスト該当）
- UX仕様書との明確な矛盾（要素不在/順序誤り/文言不一致）
- デザインシステムの色値・タイポ逸脱（トークン外のHEX直指定、font-size 11px未満等）
- 情報設計の重大欠陥（主要CTA不可視、情報過密で読めない）
- テキストコントラスト不足（前景HEX vs 背景HEX で計算可能なもののみ）

**モックアップステージでは以下を CRITICAL にしてはなりません:**
- フォーカスリング、キーボード操作、ARIA、タップターゲット44px（B-4 OUT 項目）
- 非テキストコントラスト（ボタン境界線・アイコン輪郭・プログレスバー）
- 色のみ伝達系（1.4.1）— 実装時の下線追加で対応
- 累積コンテキストA/B/Cに該当する既処理項目

HIGHは「独自性欠如」「情報過密」「視線迷子」「タイポ密度」等。
severity inflation を避けてください（§13.9）。画像とHTMLに実際に見えているものだけを根拠にしてください。
指摘は5〜12項目程度を目安。`;

function httpRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 1000)}`));
        else resolve(data);
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

async function callGemini(apiKey, systemPrompt, textContext, images, timeout) {
  const model = 'gemini-2.5-pro';
  const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`);
  const parts = [{ text: textContext }];
  for (const img of images) {
    parts.push({ text: `\n--- 画面: ${img.id} ---` });
    parts.push({ inline_data: { mime_type: 'image/png', data: img.base64 } });
  }
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts }],
    generationConfig: { maxOutputTokens: 16384, temperature: 0.3 },
  });
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    timeout,
  };
  const raw = await httpRequest(url, options, body);
  const data = JSON.parse(raw);
  return data.candidates?.[0]?.content?.parts?.filter(p => p.text).map(p => p.text).join('') || '';
}

async function callGPT5(apiKey, systemPrompt, textContext, images, maxTokens, timeout) {
  const url = new URL('https://api.openai.com/v1/chat/completions');
  const userContent = [{ type: 'text', text: textContext }];
  for (const img of images) {
    userContent.push({ type: 'text', text: `\n--- 画面: ${img.id} ---` });
    userContent.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${img.base64}` } });
  }
  const body = JSON.stringify({
    model: 'gpt-5',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    max_completion_tokens: maxTokens,
  });
  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'Authorization': `Bearer ${apiKey}`,
    },
    timeout,
  };
  const raw = await httpRequest(url, options, body);
  const data = JSON.parse(raw);
  return data.choices?.[0]?.message?.content || '';
}

function extractJson(text) {
  const cb = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
  if (cb) { try { return JSON.parse(cb[1]); } catch {} }
  const m = text.match(/\[[\s\S]*\]/);
  if (m) {
    try { return JSON.parse(m[0]); } catch {
      const raw = m[0].trimEnd();
      const lc = raw.lastIndexOf('},');
      if (lc > 0) { try { return JSON.parse(raw.slice(0, lc + 1) + ']'); } catch {} }
    }
  }
  try { return JSON.parse(text); } catch {}
  return [{ id: 'PARSE-ERROR', severity: 'HIGH', category: 'OTHER', screen: 'ALL',
    location: 'N/A', issue: 'JSON parse failed', suggestion: 'Re-run', raw: text.slice(0, 800) }];
}

async function withRetry(fn, retries = 2) {
  let last;
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (e) { last = e; console.error(`  retry ${i + 1}/${retries}: ${e.message}`); await new Promise(r => setTimeout(r, 5000 * (i + 1))); }
  }
  throw last;
}

async function main() {
  const opts = parseArgs();
  const env = loadEnv();
  if (!env.GEMINI_API_KEY || !env.OPENAI_API_KEY) {
    console.error('Missing API keys in .dev.vars'); process.exit(1);
  }

  // Load screenshots
  const images = [];
  for (const id of SCREENS) {
    const p = path.join(opts.screenshotDir, `${id}.png`);
    if (!fs.existsSync(p)) { console.warn(`SKIP image ${id}`); continue; }
    images.push({ id, base64: fs.readFileSync(p).toString('base64') });
  }
  console.log(`Loaded ${images.length} screenshots`);

  // Load text specs (trimmed - just headers + key sections to reduce tokens)
  const designSystem = fs.readFileSync(opts.designSystem, 'utf8');
  const uxSpec = fs.readFileSync(opts.uxSpec, 'utf8');

  // Load HTML sources for each screen (LOCK r3: 入力=スクショ+HTML+トークン)
  const mockupDir = path.dirname(opts.screenshotDir);
  let htmlSection = '';
  for (const id of SCREENS) {
    const htmlPath = path.join(mockupDir, `${id}.html`);
    if (fs.existsSync(htmlPath)) {
      const html = fs.readFileSync(htmlPath, 'utf8');
      htmlSection += `\n\n--- HTML: ${id} ---\n${html.slice(0, 6000)}`;
    }
  }

  const textContext = `# レビュー対象: Lais Phase A モックアップ 10画面

以下の順で10枚のスクリーンショットが続きます:
${SCREENS.map((s, i) => `${i + 1}. ${s}`).join('\n')}

${STAGE_SCOPE}

${CUMULATIVE_CONTEXT}

## デザインシステム仕様書（抜粋）
${designSystem.slice(0, 28000)}

## UX仕様書（抜粋）
${uxSpec.slice(0, 18000)}

## モックアップHTMLソース（各画面の実装）
${htmlSection}

---
上記スコープ定義（B-4）・累積コンテキスト（B-6）・ステージ別CRITICAL定義（B-7）・仕様・HTMLソースに照らし、これから提示する10枚のスクリーンショットをペルソナの視点でレビューしてください。HTMLソース内の style 属性の CSS 値は直接参照可能です。`;

  const models = opts.models.split(',').map(s => s.trim()).filter(m => !opts.modelOnly || m === opts.modelOnly);
  const personas = opts.personas.split(',').map(s => s.trim()).filter(p => !opts.personaOnly || p === opts.personaOnly);

  const jobs = [];
  for (const persona of personas) {
    const base = PERSONAS[persona];
    if (!base) { console.error(`Unknown persona: ${persona}`); continue; }
    const systemPrompt = base + '\n\n' + JSON_INSTRUCTION;
    for (const model of models) jobs.push({ persona, model, systemPrompt });
  }

  const modelNames = { gemini: 'Gemini 2.5 Pro', gpt5: 'GPT-5' };
  let totalCrit = 0, totalHigh = 0, totalItems = 0;

  async function runJob({ persona, model, systemPrompt }) {
    const outFile = `review_designmockup_${opts.phase}_r${opts.round}_${model}_${persona}.json`;
    const outPath = path.join(opts.output, outFile);
    const label = `${modelNames[model] || model} × ${persona}`;
    console.log(`  [START] ${label}`);
    if (opts.dryRun) { console.log(`  [DRY] ${label}`); return; }
    try {
      const raw = await withRetry(async () => {
        if (model === 'gemini') return callGemini(env.GEMINI_API_KEY, systemPrompt, textContext, images, opts.timeout);
        if (model === 'gpt5') return callGPT5(env.OPENAI_API_KEY, systemPrompt, textContext, images, opts.maxTokens, opts.timeout);
        throw new Error(`Unknown model: ${model}`);
      });
      const results = extractJson(raw);
      for (const it of results) { it.model = modelNames[model] || model; it.persona = persona; }
      fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
      const sevs = {};
      for (const it of results) {
        const s = it.severity || '?';
        sevs[s] = (sevs[s] || 0) + 1;
        totalItems++;
        if (s === 'CRITICAL') totalCrit++;
        else if (s === 'HIGH') totalHigh++;
      }
      console.log(`  [DONE] ${label}: ${results.length} ${JSON.stringify(sevs)}`);
    } catch (e) {
      console.error(`  [FAIL] ${label}: ${e.message}`);
      fs.writeFileSync(outPath, JSON.stringify([{
        id: 'ERROR', severity: 'HIGH', category: 'OTHER', screen: 'ALL',
        location: 'N/A', issue: `Review failed: ${e.message}`, suggestion: 'Re-run',
        model: modelNames[model] || model, persona,
      }], null, 2));
    }
  }

  // Gemini並列最大4制限（503高負荷対策、LOCK 2026-04-13準拠）
  // GPT-5は制限なし、Geminiはペルソナ4並列→2並列の2バッチ分割
  async function runBatched(jobList, concurrency) {
    for (let i = 0; i < jobList.length; i += concurrency) {
      const batch = jobList.slice(i, i + concurrency);
      await Promise.all(batch.map(runJob));
    }
  }

  if (opts.parallel) {
    const geminiJobs = jobs.filter(j => j.model === 'gemini');
    const otherJobs = jobs.filter(j => j.model !== 'gemini');
    console.log(`\nRunning ${otherJobs.length} non-Gemini + ${geminiJobs.length} Gemini (max 4 parallel) reviews...`);
    await Promise.all([
      Promise.all(otherJobs.map(runJob)),
      runBatched(geminiJobs, 4),
    ]);
  } else {
    for (const job of jobs) { console.log(`\n${'='.repeat(60)}`); await runJob(job); }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log(`Total: ${totalItems} | CRITICAL: ${totalCrit} | HIGH: ${totalHigh}`);
  process.exit(totalCrit > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
