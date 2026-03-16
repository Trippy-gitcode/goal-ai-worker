#!/usr/bin/env node
/**
 * テストトークン作成スクリプト
 * 使用例:
 *   node scripts/create-token.js --promo LAUNCH30
 *   node scripts/create-token.js --plan trial --days 7 --note "テストユーザー田中"
 *   node scripts/create-token.js --promo LAUNCH30 --url http://localhost:8787
 */

const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i += 2) {
  flags[args[i].replace(/^--/, '')] = args[i + 1];
}

const WORKER_URL = flags.url || process.env.WORKER_URL || 'http://localhost:8787';
const ADMIN_SECRET = flags.secret || process.env.TOKEN_SECRET || 'your-admin-secret';

async function main() {
  const body = {};
  if (flags.promo) body.promoCode = flags.promo;
  if (flags.plan) body.plan = flags.plan;
  if (flags.days) body.days = parseInt(flags.days);
  if (flags.user) body.userId = flags.user;
  if (flags.note) body.note = flags.note;

  console.log(`\n🔑 Creating token at ${WORKER_URL}...`);
  console.log('   Params:', JSON.stringify(body));

  try {
    const res = await fetch(`${WORKER_URL}/api/token/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Secret': ADMIN_SECRET,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(`\n❌ Error (${res.status}):`, data.error);
      process.exit(1);
    }

    console.log('\n✅ Token created successfully!');
    console.log('─'.repeat(50));
    console.log(`  Token:    ${data.token}`);
    console.log(`  Plan:     ${data.plan}`);
    console.log(`  Expires:  ${data.expiresAt}`);
    console.log(`  Desc:     ${data.promoDesc}`);
    console.log('─'.repeat(50));
    console.log(`\n📋 フロントエンドで使用:`);
    console.log(`   AUTH_TOKEN = '${data.token}';`);
  } catch (e) {
    console.error('\n❌ Connection failed:', e.message);
    console.error(`   Worker が ${WORKER_URL} で動作していることを確認してください`);
    process.exit(1);
  }
}

main();
