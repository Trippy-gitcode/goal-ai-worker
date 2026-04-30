#!/usr/bin/env node
/**
 * design_review_rebuttal.js — CRITICAL項目の指摘元AIに再判定を依頼
 *
 * 各 review_designmockup_*_r{N}_{model}_{persona}.json から CRITICAL を抽出し、
 * 同じ model + persona に事情説明+辛口コメント依頼を送る。
 *
 * Usage:
 *   node scripts/design_review_rebuttal.js --phase a_v2 --round 3 [--parallel]
 *
 * 出力: review_designmockup_{phase}_r{N}_rebuttal_{model}_{persona}.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { phase: 'a_v2', round: 3, parallel: false, timeout: 600000 };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--phase') opts.phase = args[++i];
    else if (a === '--round') opts.round = parseInt(args[++i]);
    else if (a === '--parallel') opts.parallel = true;
    else if (a === '--timeout') opts.timeout = parseInt(args[++i]);
  }
  return opts;
}

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync(path.join(process.cwd(), '.dev.vars'), 'utf8').split('\n')) {
    const t = line.trim();
    if (t && !t.startsWith('#') && t.includes('=')) {
      const [k, ...v] = t.split('=');
      env[k.trim()] = v.join('=').trim();
    }
  }
  return env;
}

function httpRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 800)}`));
        else resolve(data);
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

async function callGemini(apiKey, systemPrompt, textContext, timeout) {
  const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`);
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: textContext }] }],
    generationConfig: { maxOutputTokens: 16384, temperature: 0.3 },
  });
  const options = {
    hostname: url.hostname, path: url.pathname + url.search, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, timeout,
  };
  const raw = await httpRequest(url, options, body);
  const data = JSON.parse(raw);
  return data.candidates?.[0]?.content?.parts?.filter(p => p.text).map(p => p.text).join('') || '';
}

async function callGPT5(apiKey, systemPrompt, textContext, timeout) {
  const url = new URL('https://api.openai.com/v1/chat/completions');
  const body = JSON.stringify({
    model: 'gpt-5',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: textContext },
    ],
    max_completion_tokens: 16384,
  });
  const options = {
    hostname: url.hostname, path: url.pathname, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'Authorization': `Bearer ${apiKey}` }, timeout,
  };
  const raw = await httpRequest(url, options, body);
  const data = JSON.parse(raw);
  return data.choices?.[0]?.message?.content || '';
}

function extractJson(text) {
  const cb = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
  if (cb) { try { return JSON.parse(cb[1]); } catch {} }
  const m = text.match(/\[[\s\S]*\]/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return [{ id: 'PARSE-ERROR', verdict: 'STAND', reason: text.slice(0, 500) }];
}

async function withRetry(fn, retries = 2) {
  let last;
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (e) { last = e; console.error(`  retry ${i + 1}/${retries}: ${e.message}`); await new Promise(r => setTimeout(r, 5000 * (i + 1))); }
  }
  throw last;
}

const CONTEXT_EXPLAIN = `
# プロジェクト事情説明

あなたは Lais（モバイル Web アプリ）の Phase A モックアップレビューで以下の CRITICAL 項目を指摘しました。プロジェクトの運営側（PO ふとし / ADV Claude.ai / Code Claude Code）は、あなたの指摘を真摯に受け止めたうえで、以下の事情を理解したうえでの**辛口再判定**を求めています。

## 背景
- 現在は Phase 3（モックアップ HTML によるデザイン確定）段階。Phase 4（実装）はまだ開始していない
- モックアップは HTML + inline CSS の静的ファイルで、hover/focus/active 状態・JavaScript ロジックは含まれない
- PO の方針: 「CRITICAL は指摘元 AI が納得するまで棄却しない。辛口コメント必須」
- これまで v2_r1 → v2_r6 まで 6 回の反復修正を実施。収束が鈍化したため本 Rebuttal で最終判定を求める

## ADV/Code が累積実施した修正（v2_r1 → v2_r6）
1. ゴール色 #D29922（warning と衝突）→ #E8A855（amber/進行中）に分離
2. s12_task_add / s13_task_detail / s15_goal_create にハーフモーダル ✕ ボタン追加
3. s20_talk 提案カード二次ボタン「編集」→「編集して登録」文言変更
4. s13 AI相談ボタン「進め方を聞く/詰まりを相談」を disabled → active 化（accent bg）
5. s10_grow 完了タスクチェックマーク 青 → 緑 (#3FB950) に統一（s13/s14 と整合）
6. s10_grow 未完了タスクに ⭕（空円）を追加（⭕タップで完了アフォーダンス）
7. s10_grow タスク行右端にゴール色ドット+ラベル追加（ゴール紐付け可視化）
8. s10_grow 進行中タスクに『進行中』ラベル追加（色のみの情報伝達を解消）
9. s15_goal_create カテゴリチップに ✓ マーク＋「複数選択できます」ヒント追加（UX §2.4 対応）
10. s15 カテゴリチップ44px・s12 所要時間チップ44px・s20 ボタン44px・s14/s02 戻るボタン 44x44 wrapper・s01 checkbox 44x44 wrapper 等、タップ領域 44×44px 対応を広範に実施
11. #484F58（WCAG不足の装飾色）を #6E7681（--border-strong, 3.6:1）に全面置換
12. #484F58 テキスト色（disabled/placeholder）を #7A8593（--text-hint, 4.5:1）や #9BA7B4 に昇格
13. s01_signin サインアップ disabled テキスト #484F58 → #9BA7B4（5.5:1）
14. s13_task_detail 完了済みテキスト #3FB950 → #56D364 / 削除テキスト #F85149 → #FF7B72（コントラスト強化）
15. s01_signin 利用規約/プライバシーポリシーリンクは HTML で \`text-decoration:underline\` 実装済み（スクショで確認可）
16. s13 日本語ラベル 11px → 12px（§3.2 違反解消）
17. s10 EXP数値 11px → 12px（重要情報のため §3.2 対応）
18. s20 AI提案カードに左ボーダー #79C0FF 追加（UX §3.3 対応）
19. s20 添付📎・送信矢印アイコンに 44x44 wrapper 追加
20. lais_design_system.md §4.2 余白定義改定: アイテム間≧8px / セクション間≧32px（旧20px→8px）
21. s30_me ヒーロー領域を GROW と一致させ EXP「1,240 / 2,000」表記に統一
22. s02_onboarding 進行バー非アクティブ部 #1C2128 → #6E7681（3.6:1 対応）
23. s10/s14/s30 プログレスバー track を rgba(121,192,255,0.18) に変更（fill vs track 4:1 確保）

## 意図的な設計判断（PO/ADV 承認済み。STAND 不可・WAIVE_INTENT で合意依頼）

### 1. s10 vs s14 完了チェック位置の差異（意図的・維持）
- s10_grow: 今日のタスクリスト。ユーザーが物理的に実行する場面。チェック円を**時刻の直後**に配置し、指の右スワイプで完了できる配置
- s14_goal_detail: ゴール配下タスクの**リストビュー**。Apple Reminders / iOS Calendar 慣用の**左端円形マーカー**に倣う
- これは UX の不統一ではなく、**使用文脈に合わせた適応**である。両画面でマークの意味（=完了）は同一
- PO 合意済み、ADV 設計判断済み

### 2. Group G — BRAND_DNA 独自性（Phase B 吸収予定）
- s00/s01/s02 の星屑・汎用アバター・ボタン彩度に対する「AI slop」「独自性欠如」指摘は真摯に受け止めるが、**Phase A は機能実装優先、Phase B でブランド独自キャラ/イラスト言語を確立する**という Phase 分割戦略が PO 承認済み
- Phase A 段階で独自イラストを描くとデザイン全体の改訂が発生し、実装開始を遅延させる
- Phase B で対応する旨を design_spec_v1.md に明記する予定

### 3. 60% 巨大数字（s14_goal_detail ヒーローメトリクス）
- LOCK #11 既決定。Phase B/C の 3 パターン差分で吸収予定
- 現 PO 選択パターンのままで v2 確定

## LOCK §18（Phase 4 実装時対応項目・既棄却候補）
以下は静的モックアップ HTML では物理的に表現不能のため、Phase 4 実装時に対応する既定方針:
- WCAG 2.4.7 フォーカスリング（hover/focus 状態は JS / :focus 擬似クラス必須）
- WCAG 1.4.1 色のみの情報伝達（アイコンラベル追加は Phase 4 で可能、モックアップで既に一部対応済み）
- WCAG 2.5.5 タップターゲット 44×44px — モックアップで対応可能な箇所は全て修正済み。残存する「SVGアイコン単体が20px」指摘は実装時の ::before 透明拡張で対応
- WCAG 1.4.3 テキストコントラスト — 完了タスク等の意図的フェード（記録としての位置付け）は視認性とのトレードオフ

## s01_signin インラインリンク「下線なし」指摘について（重要）
複数の AI が「利用規約」「プライバシーポリシー」リンクに下線がないと指摘しているが、HTML では \`<span style="color:#79C0FF;text-decoration:underline">利用規約</span>\` と明示的に下線を実装済み。スクリーンショットの解像度が低く視認できない可能性がある。**HTML ソースを再確認したうえで判定してほしい**。

# 再判定リクエスト

以下があなたが指摘した CRITICAL 項目の全リストです。各項目について、以下のいずれかの判定を返してください:

- **STAND**: 依然として CRITICAL。棚上げ不可。Phase 3 でモックアップ修正必須
- **WAIVE_IMPL**: Phase 4 実装時対応で合意。静的モックアップでは表現不能
- **WAIVE_SPEC_UPDATED**: 指摘後の spec 改定により自動解消（余白定義など）
- **WAIVE_INTENT**: 上記「意図的な設計判断」セクションに該当し、PO/ADV 合意済み
- **WAIVE_PHASE_B**: Group G BRAND_DNA 独自性、Phase B 吸収予定で合意
- **WAIVE_FALSE_POSITIVE**: HTML ソース再確認の結果、既に対応済み（例: underline 指摘）
- **DOWNGRADE_HIGH**: CRITICAL から HIGH に降格可
- **DOWNGRADE_MEDIUM**: CRITICAL から MEDIUM に降格可

**辛口に。遠慮なくコメントしてください。** Code が勝手に WAIVE したいだけの項目なら「STAND」と断固明言してください。本当に Phase 4 送りで問題ない項目のみ WAIVE してください。

## 指摘項目
`;

const OUTPUT_INSTRUCTION = `

結果は JSON 配列のみ（前置き・後置き・説明文なし）:
[
  {
    "id": "R-001",
    "verdict": "STAND|WAIVE_IMPL|WAIVE_SPEC_UPDATED|DOWNGRADE_HIGH|DOWNGRADE_MEDIUM",
    "reason": "判定理由（辛口で具体的に。100〜200字）",
    "harsh_comment": "プロジェクト運営側への追加の辛口コメント（任意、50〜150字）"
  }
]
`;

async function main() {
  const opts = parseArgs();
  const env = loadEnv();
  if (!env.GEMINI_API_KEY || !env.OPENAI_API_KEY) {
    console.error('Missing API keys'); process.exit(1);
  }

  const glob = require('child_process').execSync(
    `ls docs/plans/review_designmockup_${opts.phase}_r${opts.round}_{gemini,gpt5}_*.json 2>/dev/null || true`,
    { shell: '/bin/bash' }
  ).toString().trim().split('\n').filter(Boolean);

  const jobs = [];
  for (const f of glob) {
    const basename = path.basename(f, '.json');
    const m = basename.match(/_(gemini|gpt5)_(\w+)$/);
    if (!m) continue;
    const [_, model, persona] = m;
    const items = JSON.parse(fs.readFileSync(f, 'utf8'));
    const critical = items.filter(i => i.severity === 'CRITICAL');
    if (critical.length === 0) continue;
    jobs.push({ model, persona, items: critical, srcFile: f });
  }
  console.log(`Found ${jobs.length} (model, persona) combinations with CRITICAL items`);
  console.log(`Total CRITICAL items: ${jobs.reduce((s, j) => s + j.items.length, 0)}`);

  const modelNames = { gemini: 'Gemini 3.1 Pro Preview', gpt5: 'GPT-5' };
  let totalStand = 0, totalWaive = 0, totalDowngrade = 0;

  async function runJob({ model, persona, items, srcFile }) {
    const label = `${modelNames[model]} × ${persona} (${items.length} CRIT)`;
    console.log(`  [START] ${label}`);
    const itemsText = items.map((it, idx) => {
      return `### ${it.id || `R-${idx+1}`}\n- screen: ${it.screen}\n- category: ${it.category}\n- location: ${it.location}\n- issue: ${it.issue}\n- suggestion: ${it.suggestion || ''}`;
    }).join('\n\n');
    const systemPrompt = `あなたは Lais モックアップレビューの厳格な品質監査員です。遠慮なく辛口コメントを提供してください。Code 側が怠慢で WAIVE したいだけの項目には STAND で断固反対してください。`;
    const textContext = CONTEXT_EXPLAIN + '\n\n' + itemsText + OUTPUT_INSTRUCTION;

    const outFile = `review_designmockup_${opts.phase}_r${opts.round}_rebuttal_${model}_${persona}.json`;
    const outPath = path.join('docs/plans', outFile);
    try {
      const raw = await withRetry(async () => {
        if (model === 'gemini') return callGemini(env.GEMINI_API_KEY, systemPrompt, textContext, opts.timeout);
        return callGPT5(env.OPENAI_API_KEY, systemPrompt, textContext, opts.timeout);
      });
      const verdicts = extractJson(raw);
      for (const v of verdicts) { v.model = modelNames[model]; v.persona = persona; }
      fs.writeFileSync(outPath, JSON.stringify(verdicts, null, 2));
      const counts = { STAND: 0, WAIVE_IMPL: 0, WAIVE_SPEC_UPDATED: 0, DOWNGRADE_HIGH: 0, DOWNGRADE_MEDIUM: 0 };
      for (const v of verdicts) counts[v.verdict] = (counts[v.verdict] || 0) + 1;
      totalStand += counts.STAND;
      totalWaive += counts.WAIVE_IMPL + counts.WAIVE_SPEC_UPDATED;
      totalDowngrade += counts.DOWNGRADE_HIGH + counts.DOWNGRADE_MEDIUM;
      console.log(`  [DONE] ${label}: ${JSON.stringify(counts)}`);
    } catch (e) {
      console.error(`  [FAIL] ${label}: ${e.message}`);
      fs.writeFileSync(outPath, JSON.stringify([{ id: 'ERROR', verdict: 'STAND', reason: `Rebuttal failed: ${e.message}` }], null, 2));
    }
  }

  if (opts.parallel) {
    console.log(`\nRunning ${jobs.length} rebuttals in parallel...`);
    await Promise.all(jobs.map(runJob));
  } else {
    for (const j of jobs) await runJob(j);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('REBUTTAL SUMMARY');
  console.log(`STAND: ${totalStand} | WAIVE: ${totalWaive} | DOWNGRADE: ${totalDowngrade}`);
}

main().catch(e => { console.error(e); process.exit(1); });
