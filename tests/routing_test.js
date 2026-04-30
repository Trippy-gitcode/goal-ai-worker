// Routing 500-pattern test — quickRoute only (no API calls)
// Replicates frontend/js/chat.js routeMessage() quickRoute logic

function quickRoute(text) {
  if(text.length > 500) return 'gemini';
  const msg = text.trim().toLowerCase();
  if(msg.length < 15 && /^(うん|はい|ok|おk|そう|ありがと|了解|わかった|なるほど|いいね|おー|へー|ほー|そうだね|たしかに)/.test(msg)) return 'gpt-simple';
  if(/^(天気|今日の天気|明日の天気|ニュース|最新の|検索して|調べて)/.test(msg)) return 'gemini';
  if(/天気.*(教えて|おしえて|知りたい)|ニュース.*(教えて|おしえて|知りたい)/.test(msg)) return 'gemini';
  if(/ダイヤ|時刻表|路線|行き方|乗り換え|運賃|料金|営業時間|場所|住所|電話番号|地図|アクセス|最寄り/.test(msg)) return 'gemini';
  if(/^(翻訳して|英語に|日本語に|要約して|まとめて|SNS.*書いて|キャッチコピー|タイトル案)/.test(msg)) return 'gpt';
  if(/^(アイディア|おすすめ|提案して|考えて|リスト|比較して|教えて|作って|書いて)/.test(msg)) return 'gpt';
  if(/^(今日やること|タスク|やること.*整理|TODO|to.?do|スケジュール|予定.*整理|段取り)/.test(msg)) return 'gpt';
  return null; // needs API
}

// Parse test cases from markdown
const fs = require('fs');
const md = fs.readFileSync('docs/routing_500_test.md', 'utf8');
const lines = md.split('\n');
const tests = [];

for (const line of lines) {
  const m = line.match(/^(\d+)\.\s+(.+?)\s+→\s+(gemini|claude|gpt|gpt-simple)/);
  if (m) {
    tests.push({ id: parseInt(m[1]), question: m[2], expected: m[3] });
  }
}

// Run quickRoute on each
let pass = 0, fail = 0, needsApi = 0;
const fails = [];
const categories = {};

for (const t of tests) {
  const result = quickRoute(t.question);
  const cat = t.expected;
  if (!categories[cat]) categories[cat] = { total: 0, pass: 0, fail: 0, needsApi: 0 };
  categories[cat].total++;

  if (result === null) {
    needsApi++;
    categories[cat].needsApi++;
  } else if (result === t.expected) {
    pass++;
    categories[cat].pass++;
  } else {
    fail++;
    categories[cat].fail++;
    fails.push({ id: t.id, question: t.question, expected: t.expected, got: result });
  }
}

console.log(`\n=== QuickRoute Test Results ===`);
console.log(`Total: ${tests.length}`);
console.log(`quickRoute PASS: ${pass} (${(pass/tests.length*100).toFixed(1)}%)`);
console.log(`quickRoute FAIL: ${fail}`);
console.log(`Needs API: ${needsApi}`);
console.log(`quickRoute accuracy (of resolved): ${pass > 0 ? (pass/(pass+fail)*100).toFixed(1) : 0}%`);

console.log(`\n--- Category breakdown ---`);
for (const [cat, s] of Object.entries(categories)) {
  const resolved = s.pass + s.fail;
  console.log(`${cat}: ${s.total} total, ${s.pass} pass, ${s.fail} fail, ${s.needsApi} api (${resolved > 0 ? (s.pass/resolved*100).toFixed(0) : '-'}% accuracy)`);
}

if (fails.length > 0) {
  console.log(`\n--- FAIL details ---`);
  for (const f of fails) {
    console.log(`#${f.id}: "${f.question}" expected=${f.expected} got=${f.got}`);
  }
}
