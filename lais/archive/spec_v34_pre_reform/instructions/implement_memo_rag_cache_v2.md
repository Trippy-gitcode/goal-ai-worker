# GOAL AI — AI理解メモ強化 + RAG + プロンプトキャッシュ + 高速化 実装指示書 v2
> Claude Code用 / 作成：2026-03-18 / 更新：2026-03-18
> REQUIRES_VERSION: v3.5.9
> INSTRUCTION_ID: 2026-03-18-002
> 方針 → goal_ai_project_v5.9.md｜技術 → CLAUDE.md｜スキーマ → goal_ai_reference.md

---

## 概要

6機能をまとめて実装する。A〜Cは環境変数で個別にOn/Off可能。D〜Fは常時On。

| # | 機能 | 環境変数 | 目的 |
|---|------|---------|------|
| A | AI理解メモ強化 | `MEMO_ENABLED` | ユーザーの人物像をシステムプロンプトに固定注入 |
| B | RAG（ベクトル検索） | `RAG_ENABLED` | 過去の会話を話題に応じて動的検索・注入 |
| C | プロンプトキャッシュ | `CACHE_ENABLED` | Anthropic APIのキャッシュ機能でコスト削減 |
| D | プロフィールKVキャッシュ | （常時On） | プロフィール取得を高速化 |
| E | ローカルルーティング | （常時On） | キーワードベース簡易分類でAPI呼び出し削減 |
| F | 会話履歴圧縮 | （常時On） | 古い履歴を要約して入力トークン削減 |

**共存設計：** メモ=「どういう人か」（固定注入）、RAG=「何を話したか」（動的注入）。片方だけでも動作する。

---

## v1からの変更点（v2）

| # | 変更 | 理由 |
|---|------|------|
| 1 | RAG検索をルーティング判定と**並列実行** | レイテンシー+250ms→相殺 |
| 2 | キャッシュを**2ブロック分割**（固定部分のみキャッシュ） | RAG結果が変わっても固定部分のキャッシュが壊れない |
| 3 | ivfflat → **HNSW**インデックスに変更 | データ0件でもインデックス作成可能 |
| 4 | **countRecentMessages関数**の定義を追加 | v1で未定義だった |
| 5 | ゴール用メモの**goal_id取得方法**を明記 | v1で曖昧だった |
| 6 | メモ更新通知を**必須実装**に変更 | v1ではオプションだった |
| 7 | REQUIRES_VERSION / INSTRUCTION_ID追加 | 指示書運用ルール準拠 |
| 8 | **高速化6施策**追加（TTFT 1,100ms → 620ms, 1.8倍速） | スピード改善要求 |

### 高速化施策サマリー

| # | 施策 | TTFT削減 | コスト影響 |
|---|------|:---:|:---:|
| ① | プロフィールKVキャッシュ（5分TTL） | -80ms | ¥0 |
| ② | 全並列化（ルーティング+RAG+プロフィール） | -100ms | ¥0 |
| ③ | ローカルルーティング（確信度高パターン+フォールバック） | -280ms(60-70%時) | 節約 |
| ④ | Anthropic キャッシュTTFT短縮ヘッダー | -50〜100ms | ¥0 |
| ⑤ | 会話履歴圧縮（直近5ターン全文+残り要約） | -50〜150ms | 節約 |
| ⑦ | Cloudflare スマートプレースメント | -30ms | ¥0 |

```
【現在】                          ~1,100ms
【③ヒット時（60-70%）】           ~540ms → 2.0倍速
【③ミス時（30-40%）】             ~750ms → 1.5倍速
【加重平均】                      ~620ms → 1.8倍速
```

---

## 前提条件

- Supabaseでpgvector拡張が有効化されていること
- OpenAI APIキーが設定済み（embedding生成用：text-embedding-3-small）
- 既存のchat_messages, users, goalsテーブルが存在すること
- Cloudflare KVネームスペースが設定済みであること（既存のものを使用）

---

## 1. 環境変数の追加

### Worker Secrets に追加（wrangler secret put）

```
MEMO_ENABLED=true
RAG_ENABLED=true
CACHE_ENABLED=true
```

### worker.js 冒頭で取得

```javascript
const MEMO_ENABLED = env.MEMO_ENABLED === 'true';
const RAG_ENABLED = env.RAG_ENABLED === 'true';
const CACHE_ENABLED = env.CACHE_ENABLED === 'true';
```

**テスト中に問題が出たら個別にfalseにして切り分ける。**
**高速化施策（①②③⑤）は常時On。環境変数での切り替えは不要。**

---

## 2. AI理解メモ強化

### 2-1. メモ生成プロンプトの文字数制限

`/api/ai-memo/generate` エンドポイントの生成プロンプトに以下を追加：

```
【出力ルール】
- 箇条書き10〜15項目以内
- 合計1,200文字以内（厳守）
- 性格傾向・行動パターン・コミュニケーションの好み・モチベーション源・弱点と対処法を含めること
- 過去のメモは破棄し、最新の理解で完全に上書きすること（追記式ではない）
```

### 2-2. 自動更新トリガー（5回ごと）

chat_messagesテーブルへの保存時に、そのユーザーの**全メッセージ数**をカウントし、5の倍数になったらバックグラウンドでメモを再生成する。

**worker.js の /api/chat/stream 内（レスポンス送信後）：**

```javascript
// ストリーミング完了後に非同期で実行（レスポンスには影響させない）
if (MEMO_ENABLED) {
  const msgCount = await countRecentMessages(supabase, tokenId);
  if (msgCount > 0 && msgCount % 5 === 0) {
    ctx.waitUntil(regenerateAiMemo(supabase, tokenId, env, goalId));
  }
}
```

**countRecentMessages関数：**

```javascript
async function countRecentMessages(supabase, tokenId) {
  // tokenId全体のメッセージ数をカウント（セッション跨ぎで累積）
  const { count, error } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('token_id', tokenId)
    .eq('role', 'user'); // ユーザーメッセージのみカウント

  if (error) {
    console.error('countRecentMessages failed:', error);
    return 0;
  }
  return count || 0;
}
```

**regenerateAiMemo関数：**

```javascript
async function regenerateAiMemo(supabase, tokenId, env, goalId) {
  const query = supabase
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('token_id', tokenId)
    .order('created_at', { ascending: false })
    .limit(50);

  // ゴールハブの場合はgoal_idでフィルタリング
  if (goalId) {
    query.eq('goal_id', goalId);
  }

  const { data: messages } = await query;
  if (!messages || messages.length < 5) return;

  const conversationText = messages
    .reverse()
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `以下の会話履歴から、このユーザーについてわかったことを要約してください。

【出力ルール】
- 箇条書き10〜15項目以内
- 合計1,200文字以内（厳守）
- 性格傾向・行動パターン・コミュニケーションの好み・モチベーション源・弱点と対処法を含めること
- 過去のメモは破棄し、最新の理解で完全に上書きすること

【会話履歴】
${conversationText}`
      }]
    })
  });

  const data = await response.json();
  const memo = data.content?.[0]?.text;
  if (!memo) return;

  if (goalId) {
    await supabase
      .from('goals')
      .update({ ai_memo: memo, ai_memo_updated_at: new Date().toISOString() })
      .eq('id', goalId)
      .eq('token_id', tokenId);
  } else {
    await supabase
      .from('users')
      .update({ ai_memo: memo, ai_memo_updated_at: new Date().toISOString() })
      .eq('token_id', tokenId);
  }

  // KVキャッシュも無効化（プロフィールにai_memoが含まれるため）
  await env.KV.delete(`profile:${tokenId}`);

  return true; // メモ更新フラグ（通知用）
}
```

### 2-3. ゴール用メモ

フロントエンドから `/api/chat/stream` のリクエストボディに `goal_id` を送信している。
この `goal_id` をそのまま `regenerateAiMemo()` に渡す。

- **goal_idあり** → goalsテーブルのai_memoを更新（そのゴール専用）
- **goal_idなし（ホーム等）** → usersテーブルのai_memoを更新（全体用）

chat_messagesテーブルにgoal_idカラムが存在しない場合のマイグレーション：
```sql
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS goal_id UUID;
```

### 2-4. システムプロンプトへの注入

**固定部分と可変部分を分けて返す（キャッシュ2ブロック分割のため）。**

```javascript
function buildServerSystemPrompt(config, profile, aiMemo, ragResults) {
  // ① 固定部分（キャッシュが効く）
  let fixedPart = `【あなたの役割】${config.roleText}\n\n`;
  fixedPart += buildProfileBlock(config, profile);

  if (MEMO_ENABLED && aiMemo) {
    fixedPart += `\n【AIの理解メモ】\n${aiMemo}\n`;
  }

  fixedPart += `\n【共通ルール】\n...`;
  fixedPart += `\n${config.screenRules || ''}`;

  // ② 可変部分（キャッシュ対象外）
  let variablePart = '';
  if (RAG_ENABLED && ragResults && ragResults.length > 0) {
    variablePart += `\n【関連する過去の会話】\n`;
    ragResults.forEach(r => {
      variablePart += `・${r.date}: ${r.content}\n`;
    });
    variablePart += `※直近の会話が最優先。過去の会話は参考情報として扱うこと\n`;
  }

  return { fixedPart, variablePart };
}
```

---

## 3. RAG（ベクトル検索）

### 3-1. Supabaseマイグレーション

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chat_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id TEXT NOT NULL,
  session_id TEXT,
  goal_id UUID,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW: データ0件でも作成可能、検索精度も高い
CREATE INDEX idx_chat_embeddings_token_id ON chat_embeddings(token_id);
CREATE INDEX idx_chat_embeddings_embedding ON chat_embeddings
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

ALTER TABLE chat_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON chat_embeddings
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS goal_id UUID;
```

### 3-2. Supabase RPC関数

```sql
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(1536),
  match_token_id TEXT,
  match_threshold FLOAT DEFAULT 0.75,
  match_count INT DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  session_id TEXT,
  goal_id UUID,
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id, ce.content, ce.session_id, ce.goal_id, ce.created_at,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM chat_embeddings ce
  WHERE ce.token_id = match_token_id
    AND 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 3-3. embedding生成（非同期）

AIの返答のみをembedding化する（全メッセージではない。コスト1/2）。

```javascript
async function generateAndStoreEmbedding(supabase, env, tokenId, sessionId, goalId, text) {
  if (!text || text.trim().length < 20) return;

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.slice(0, 500)
      })
    });

    const data = await response.json();
    const embedding = data.data?.[0]?.embedding;
    if (!embedding) return;

    await supabase
      .from('chat_embeddings')
      .insert({
        token_id: tokenId,
        session_id: sessionId,
        goal_id: goalId || null,
        content: text.slice(0, 200),
        embedding: embedding
      });
  } catch (e) {
    console.error('Embedding generation failed:', e);
  }
}
```

### 3-4. 検索

```javascript
async function searchRelatedMessages(supabase, env, tokenId, userMessage, goalId) {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: userMessage.slice(0, 300)
      })
    });

    const data = await response.json();
    const queryEmbedding = data.data?.[0]?.embedding;
    if (!queryEmbedding) return [];

    const { data: results } = await supabase.rpc('match_embeddings', {
      query_embedding: queryEmbedding,
      match_token_id: tokenId,
      match_threshold: 0.75,
      match_count: 3
    });

    return (results || []).map(r => ({
      content: r.content,
      date: new Date(r.created_at).toLocaleDateString('ja-JP'),
      similarity: r.similarity
    }));
  } catch (e) {
    console.error('RAG search failed:', e);
    return [];
  }
}
```

---

## 4. プロンプトキャッシュ（2ブロック分割）

### 4-1. Anthropic APIリクエスト構築

```javascript
function buildAnthropicRequest(fixedPart, variablePart, messages, model, maxTokens) {
  const requestBody = {
    model: model,
    max_tokens: maxTokens,
    messages: messages
  };

  if (CACHE_ENABLED) {
    const systemBlocks = [
      {
        type: 'text',
        text: fixedPart,
        cache_control: { type: 'ephemeral' }
      }
    ];
    if (variablePart && variablePart.trim()) {
      systemBlocks.push({
        type: 'text',
        text: variablePart
      });
    }
    requestBody.system = systemBlocks;
  } else {
    requestBody.system = fixedPart + variablePart;
  }

  return requestBody;
}
```

### 4-2. キャッシュTTFT短縮ヘッダー（高速化④）

```javascript
headers: {
  'x-api-key': env.ANTHROPIC_API_KEY,
  'anthropic-version': '2023-06-01',
  'anthropic-beta': 'prompt-caching-2024-07-04',  // ← 追加
  'content-type': 'application/json'
}
```

### 4-3. GPT / Gemini

- GPT: 自動キャッシュ。実装不要。
- Gemini: テスト段階では実装しない。

---

## 5. 高速化① — プロフィールKVキャッシュ

```javascript
async function getProfileWithCache(env, supabase, tokenId, ctx) {
  const cacheKey = `profile:${tokenId}`;

  const cached = await env.KV.get(cacheKey, 'json');
  if (cached) return cached;

  const { data: profile } = await supabase
    .from('users')
    .select('nickname, occupation, age, mbti, strengths, weaknesses, values, vision, constraints, ai_memo, ai_memo_updated_at')
    .eq('token_id', tokenId)
    .single();

  if (profile) {
    ctx.waitUntil(
      env.KV.put(cacheKey, JSON.stringify(profile), { expirationTtl: 300 })
    );
  }

  return profile;
}
```

**キャッシュ無効化:** プロフィール更新時・AI理解メモ更新時に `await env.KV.delete(\`profile:${tokenId}\`)` を実行。

---

## 6. 高速化③ — ローカルルーティング

**確信度が高いパターンだけ即判定。曖昧な場合はAPIフォールバック。**

```javascript
function quickRoute(message) {
  const msg = message.trim().toLowerCase();

  // gpt-simple: 相槌・短い返事
  if (msg.length < 15) {
    if (/^(うん|はい|ok|おk|そう|ありがと|了解|わかった|なるほど|いいね|おー|へー|ほー|そうだね|たしかに)/.test(msg)) {
      return { route: 'gpt-simple', coaching: false };
    }
  }

  // gemini: 明確なリサーチ系
  if (/^(今日の天気|明日の天気|ニュース|最新の|検索して|調べて|〜とは\?|〜って何)/.test(msg)) {
    return { route: 'gemini', coaching: false };
  }

  // gpt: 明確な生成タスク
  if (/^(翻訳して|英語に|日本語に|要約して|まとめて|SNS.*書いて|キャッチコピー|タイトル案)/.test(msg)) {
    return { route: 'gpt', coaching: false };
  }

  // 判定不能 → APIフォールバック
  return null;
}
```

**安全策:**
- 完全一致に近いパターンだけ。少しでも曖昧ならnull
- 「ストレスで天気が気になる」→ 先頭一致しない → null → APIフォールバック → 正しくclaude判定
- テスト期間中にログを取り、誤分類があればパターンを縮小

---

## 7. 高速化⑤ — 会話履歴圧縮

### 7-1. 要約生成（バックグラウンド）

5ターン目完了時（セッション内10メッセージごと）に要約を生成してKVに保存。

```javascript
async function generateConversationSummary(env, supabase, tokenId, sessionId) {
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('token_id', tokenId)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (!messages || messages.length < 10) return;

  // 直近5ターン（10メッセージ）以外を要約対象
  const olderMessages = messages.slice(0, -10);
  if (olderMessages.length === 0) return;

  const olderText = olderMessages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-5-nano',
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content: '以下の会話を300文字以内で要約してください。重要なトピック・決定事項・感情の流れを保持すること。箇条書き不可、自然な文章で。'
        },
        { role: 'user', content: olderText }
      ]
    })
  });

  const data = await response.json();
  const summary = data.choices?.[0]?.message?.content;
  if (!summary) return;

  await env.KV.put(`summary:${tokenId}:${sessionId}`, summary, { expirationTtl: 86400 });
}
```

### 7-2. 圧縮済み履歴の構築

```javascript
async function buildCompressedMessages(env, tokenId, sessionId, currentMessages) {
  if (currentMessages.length <= 10) return currentMessages;

  const summary = await env.KV.get(`summary:${tokenId}:${sessionId}`);
  if (!summary) return currentMessages;

  const recentMessages = currentMessages.slice(-10);

  return [
    { role: 'user', content: `【これまでの会話の要約】\n${summary}` },
    { role: 'assistant', content: '了解しました。これまでの流れを踏まえて会話を続けます。' },
    ...recentMessages
  ];
}
```

### 7-3. 要約生成トリガー

```javascript
// /api/chat/stream 内（ストリーミング完了後）
const sessionMsgCount = await countSessionMessages(supabase, tokenId, sessionId);
if (sessionMsgCount >= 10 && sessionMsgCount % 10 === 0) {
  ctx.waitUntil(generateConversationSummary(env, supabase, tokenId, sessionId));
}
```

```javascript
async function countSessionMessages(supabase, tokenId, sessionId) {
  const { count } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('token_id', tokenId)
    .eq('session_id', sessionId);
  return count || 0;
}
```

---

## 8. 高速化⑦ — Cloudflare スマートプレースメント

ダッシュボード設定のみ（コード変更不要）：

```
Workers & Pages > goal-ai-worker > Settings > Smart Placement > Enable
```

---

## 9. チャット送信フロー（全体統合）

```
1. ユーザーメッセージ受信

2. ローカルルーティング判定（高速化③）
   → ヒット: routingResult確定（~0ms）
   → ミス: routingResult = null

3. 【Promise.allで全並列実行】（高速化②）
   a. ルーティングAPI判定（②ミス時のみ。~300ms）
   b. RAG検索（RAG_ENABLED時。~250ms）
   c. プロフィール+メモ取得（KVキャッシュ。~20ms / miss時~100ms）
   → 合計: max(300, 250, 100) = ~300ms（ローカルヒット時 ~250ms）

4. 会話履歴圧縮（高速化⑤）
   → KVから要約取得(~20ms) + 直近5ターン全文

5. buildServerSystemPrompt() → { fixedPart, variablePart }

6. buildAnthropicRequest()（2ブロック分割 + TTFTヘッダー）

7. AIにストリーミング送信

8. 完了後（全てctx.waitUntil非同期）:
   a. chat_messages保存
   b. RAG_ENABLED時: embedding生成
   c. MEMO_ENABLED時: 5回ごとにメモ再生成
   d. 5ターンごとに会話要約更新
   e. メモ再生成時: memo_updated: true をメタデータ送信
```

**並列実行の実装：**

```javascript
// ステップ2
let routingResult = config.routing ? quickRoute(userMessage) : null;

// ステップ3
const [routing, ragResults, profile] = await Promise.all([
  (config.routing && !routingResult)
    ? routeMessage(env, userMessage)
    : Promise.resolve(routingResult),
  RAG_ENABLED
    ? searchRelatedMessages(supabase, env, tokenId, userMessage, goalId)
    : Promise.resolve([]),
  getProfileWithCache(env, supabase, tokenId, ctx)
]);

// ステップ4
const compressedMessages = await buildCompressedMessages(
  env, tokenId, sessionId, requestMessages
);

// ステップ5-6
const aiMemo = profile?.ai_memo || null;
const { fixedPart, variablePart } = buildServerSystemPrompt(config, profile, aiMemo, ragResults);
const requestBody = buildAnthropicRequest(fixedPart, variablePart, compressedMessages, model, maxTokens);
```

---

## 10. フロントエンド変更

### メモ更新通知（必須）

**Worker側：**
```javascript
if (memoUpdated) {
  writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'meta', memo_updated: true })}\n\n`));
}
```

**フロントエンド側（chat.js）：**
```javascript
let memoToastShown = false;

// onDoneコールバック内
if (responseMetadata?.memo_updated && !memoToastShown) {
  showToast('AIの理解が更新されました 🧠', 'info');
  memoToastShown = true;
}
```

その他のフロントエンド変更はなし。

---

## 11. テスト・検証手順

### 11-1. 個別On/Off

```bash
# 全部Off → メモだけOn → RAGだけOn → キャッシュだけOn → 全部On
```

### 11-2. 確認項目

| 確認項目 | 方法 |
|---------|------|
| メモ生成 | 5回会話後にai_memo更新 |
| メモ1,200文字以内 | Supabaseで文字数確認 |
| メモ上書き式 | 2回目生成後に前回内容なし |
| ゴール用メモ別管理 | goals.ai_memoがゴール別 |
| メモ更新通知 | トースト表示（セッション中1回） |
| embedding保存 | chat_embeddingsにレコード追加 |
| RAG検索 | 過去話題言及→文脈返却 |
| RAG閾値 | 無関係話題で結果0件 |
| キャッシュヒット | cache_read_input_tokens > 0 |
| 2ブロックキャッシュ | RAG変化→固定部分ヒット維持 |
| KVキャッシュ | 2回目以降プロフィール高速 |
| KV無効化 | プロフィール更新→キャッシュ消去 |
| ローカルルーティング | 「うん」→gpt-simple即判定 |
| フォールバック | 曖昧文→API判定 |
| 会話要約 | 5ターン後にKVに要約保存 |
| 履歴圧縮 | 6ターン目以降トークン数減 |
| 全Off既存動作 | 3機能Offで壊れない |
| ゴール横断検索 | ゴールA→ゴールBでRAGヒット |
| **TTFT実測** | **DevToolsで最初のSSEイベントまでの時間** |

### 11-3. コスト監視

- Anthropic: トークン消費量・cache_read比率
- OpenAI: embedding + nano要約の呼び出し回数
- Supabase: ストレージ使用量
- Cloudflare KV: 読み書き回数

---

## 12. 保全確認grep（追加分）

```bash
# 環境変数
grep -c "MEMO_ENABLED\|RAG_ENABLED\|CACHE_ENABLED" src/worker.js    # 3以上

# AI理解メモ
grep -c "regenerateAiMemo\|ai_memo" src/worker.js                    # 3以上
grep -c "countRecentMessages" src/worker.js                          # 1以上
grep "1200\|1,200" src/worker.js                                     # 文字数制限

# RAG
grep -c "chat_embeddings\|match_embeddings" src/worker.js            # 2以上
grep -c "generateAndStoreEmbedding\|searchRelatedMessages" src/worker.js  # 2以上
grep "text-embedding-3-small" src/worker.js                          # 1以上

# 並列実行
grep -c "Promise.all" src/worker.js                                  # 1以上

# キャッシュ
grep -c "cache_control\|ephemeral" src/worker.js                     # 1以上
grep -c "fixedPart\|variablePart" src/worker.js                      # 2以上
grep "prompt-caching" src/worker.js                                  # 1以上

# プロンプト構成順序
grep -n "AIの理解メモ\|関連する過去の会話" src/worker.js            # メモが先、RAGが後

# メモ通知
grep -c "memo_updated" src/worker.js                                 # 1以上
grep -c "memo_updated\|memoToastShown" frontend/js/chat.js           # 1以上

# 高速化: KVキャッシュ
grep -c "getProfileWithCache\|profile:" src/worker.js                # 2以上

# 高速化: ローカルルーティング
grep -c "quickRoute" src/worker.js                                   # 2以上

# 高速化: 会話履歴圧縮
grep -c "buildCompressedMessages\|generateConversationSummary" src/worker.js  # 2以上
grep -c "summary:" src/worker.js                                     # 1以上
```

---

## 13. 実装順序（推奨）

```
Step 1:  環境変数3つ追加 + worker.jsで取得
Step 2:  AI理解メモ強化（プロンプト修正 + countRecentMessages + 自動更新 + ゴール分岐）
Step 3:  buildServerSystemPromptを { fixedPart, variablePart } に分割
Step 4:  プロンプトキャッシュ（2ブロック分割 + TTFTヘッダー）
Step 5:  Supabaseマイグレーション（pgvector + chat_embeddings + HNSW + RPC + goal_id）
Step 6:  embedding生成（非同期）
Step 7:  RAG検索関数
Step 8:  プロフィールKVキャッシュ（高速化①）
Step 9:  ローカルルーティング（高速化③）
Step 10: 全並列化 — Promise.all統合（高速化②）
Step 11: 会話履歴圧縮（高速化⑤。要約生成+KV+圧縮構築）
Step 12: メモ更新通知（Worker側 + フロント側）
Step 13: テスト（個別On/Off + 全On + TTFT計測）
Step 14: Cloudflareスマートプレースメント有効化（高速化⑦。ダッシュボード設定）
Step 15: デプロイ + コスト監視
```

---

## 14. 注意事項

- **Workers 30秒制限:** ctx.waitUntilで非同期実行するため問題ない
- **OpenAI APIキー:** embedding + nano要約にも使用。権限変更不要
- **Anthropicキャッシュ TTL 5分:** 失効しても損はしない
- **KV TTL:** プロフィール=5分、会話要約=24時間
- **HNSW:** m=16, ef_construction=64。100万件まで最適。データ0件でも作成可能
- **ゴール横断検索:** goal_idフィルタリングなし（設計意図）
- **goal_id:** フロントから送信されるものをそのまま使用。ホーム等ではnull
- **並列実行:** ルーティング・RAG・プロフィールは完全独立。どれかが失敗しても他に影響しない
- **ローカルルーティング:** 確信度高パターンのみ。曖昧→APIフォールバック。テスト中ログ取り
- **要約コスト:** GPT-5 nano。月900ターン=180回要約≒¥10.8。無視できる
- **プロフィール反映遅延:** KV 5分TTLだが、更新APIでKV削除するので通常は即反映
- **スマートプレースメント:** ダッシュボード設定のみ。デメリットなし

---

*テスト後にコストを見て、RAG_ENABLEDをfalseにすればembedding生成コストを即座にゼロにできる。データは残るので再度trueにすれば復活する。*
